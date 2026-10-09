# The engine API

Native Stockfish binaries on this machine, served to the app over HTTP — so a
board can search with Stockfish 18 or 19 at full native speed instead of the
WASM build in the browser. Cloned from `game-anal-v1/api` (its routes kept,
`legacy.py`) and extended with `/v1`: sessions, streamed searches, and the
engines' own options.

**Localhost only.** It listens on `127.0.0.1`, and run it in a console of its
own beside the dev server:

```sh
yarn api:start   # http://127.0.0.1:8800 — ENGINE_API_PORT moves it; docs at /docs
yarn api:test    # its tests (pytest; args passed on, e.g. yarn api:test -k cors)
```

The first run makes `server/engine-api/.venv` (Python ≥ 3.11 — `PYTHON`
picks the interpreter) and installs `requirements-dev.txt`; a later run
reinstalls only when the requirements change.

## Configuration — `engines.local.json`

Machine-specific and not committed: copy `engines.example.json` and set each
engine's path. `ENGINE_API_CONFIG` names another file.

| Key | Default | Meaning |
| --- | --- | --- |
| `engines` | — | `[{ "id", "path", "name"? }]`. The `id` is **stable** — the app stores it (a preference, a played game). `name` defaults to the binary's own `id name`. An engine that does not start is logged and left out. |
| `maxSessions` | 8 | Engines running at once. At the cap, a new session closes the least recently used idle one (a tab closed without saying so); if every one is searching, `503`. |
| `idleTimeoutS` | 300 | A session not used for this long is closed. A running search is use. |
| `maxThreads` | cores − 1 | The most `Threads` one session may set — the ceiling `/v1/engines` reports. |
| `maxHashMb` | 4096 | The most `Hash` one session may set (MB). |
| `maxDepth` | 99 | The deepest `go depth`. |
| `maxMovetimeMs` | 600000 | The longest `go movetime`. |
| `allowedOrigins` | `[]` | Origins allowed besides this machine's (`localhost`, `127.0.0.1`, any port — always allowed). `https://chessapp.dev` and `https://pgntools.github.io` let the deployed sites use it (the second trusts every site under `pgntools.github.io`). |
| `legacyEngine` | the first | The engine behind the legacy `/eval`. |

## `/v1`

### The model

- **A session is one engine process**, kept between searches, so its
  transposition table carries over from position to position — ~1.5–1.7×
  faster through a game ([`docs/eval-examples/`](../../docs/eval-examples/README.md)).
  One per board: open it when the board first searches, delete it when the
  board goes.
- **The newest search wins.** A new search on a session stops the running one
  — whose stream still ends with its `bestmove`, `"stopped": true` — and a
  search still waiting for the engine ends at once with `superseded`. There is
  no `409`: a client fires a search on every position change.
- **Options travel with every search** and are applied before it, **only the
  ones that changed** (a re-sent `Hash` would clear the memory), and only
  those the engine declared and does not pin; the rest are reported
  `refused`. `Threads` and `Hash` are clamped to the server's ceilings.
- **Every event carries the engine's raw line** (`uci`) beside its fields, so
  the app parses a hosted engine exactly as it parses its worker.

### Endpoints

| Method | Path | Body | Answer |
| --- | --- | --- | --- |
| GET | `/v1/health` | | `{status, engines, sessions}` |
| GET | `/v1/engines` | | `[{id, name, version, options: [{name, type, default?, min?, max?, vars?}], limits: {maxDepth, maxMovetimeMs}}]` — the binary's `uci` reply, `Threads` / `Hash` capped |
| POST | `/v1/sessions` | `{engine}` | `201 {session, engine, idleTimeoutS}`; `404` unknown engine; `503` full or failed to start |
| DELETE | `/v1/sessions/{id}` | | `204` |
| POST | `/v1/sessions/{id}/analyse` | a search | `200`, `application/x-ndjson`: the events below |
| POST | `/v1/sessions/{id}/stop` | `{seq?}` | `204` — the running search ends (its stream with `bestmove`), a waiting one never starts |
| POST | `/v1/sessions/{id}/eval` | a search (not infinite), `pruneWithinCp?` | the final result, one JSON |

A session that does not exist (never did, expired, its engine died, the server
restarted) is `404` — open a new one; only the engine's memory is lost.

### A search

```json
{
  "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
  "limit": { "depth": 24 },
  "options": { "MultiPV": 3, "Threads": 4, "Hash": 256, "UCI_LimitStrength": true, "UCI_Elo": 1800 }
}
```

`limit` is `{depth}`, `{movetimeMs}`, both (whichever comes first), or
`{"infinite": true}` (until stopped — `/analyse` only).

`seq` (optional, ≥ 1) is the client's own count of its requests to the
session, rising. Two requests in flight can overtake each other, so one that
arrives after a newer one is answered `superseded` at once and stops nothing;
`/stop` takes `{"seq": n}` too, so a late stop never ends a newer search. The
app numbers every request; `curl` can leave it out. The FEN is checked by
python-chess (`422` for one that does not parse or is not a legal position) and
echoed verbatim on every event.

### The stream

```
{"type":"start","fen":"…","engine":"stockfish-19","applied":{"MultiPV":3,"Threads":4,"Hash":256},"refused":[]}
{"type":"info","fen":"…","depth":18,"seldepth":24,"multipv":1,"score":{"cp":31},"nodes":…,"nps":…,"hashfull":…,"timeMs":…,"pv":["f1b5","a7a6"],"uci":"info depth 18 …"}
{"type":"bestmove","fen":"…","bestmove":"f1b5","ponder":"a7a6","stopped":false,"uci":"bestmove f1b5 ponder a7a6"}
```

- `score` is **the side to move's**, as UCI reports it (`{cp}` or `{mate}`),
  with `bound` (`lower` / `upper`) on a bound. `info string …` lines pass
  through with `string`.
- It **always ends** with `bestmove`, `superseded` (never started) or `error`
  (the engine died — the session is gone).
- A finished game: `info depth 0 score mate 0`, then `bestmove (none)`.
- **Hanging up stops the search.**

### `/eval`

```json
{"fen":"…","engine":"stockfish-19","turn":"black","isGameOver":false,"depth":10,"bestmove":"e7e5","stopped":false,
 "lines":[{"multipv":1,"depth":10,"score":{"cp":-28},"scoreWhite":{"cp":28},"bound":null,"pv":["e7e5","g1f3"],"pvSan":["e5","Nf3"]}]}
```

Every line is kept unless `pruneWithinCp` asks for the annotator's cut (lines
more than that many centipawns behind the best dropped). `409` if a newer
search on the session took over before this one started.

## CORS

This machine's origins, any port, and `allowedOrigins` — nothing else (the
cloned API allowed `*`). Chrome's Private Network Access preflight is answered
for those, so a public origin on the list may reach `127.0.0.1`.

## The legacy routes

`GET /health`, `GET` / `PUT /config`, `POST /eval` — as in `game-anal-v1`: one
shared engine, a global configuration (`PUT /config` restarts it), MultiPV
with the annotator's early stop and pruning, `409` for a superseded request.
The engine now starts on the first request, not with the server.

## Layout

| File | |
| --- | --- |
| `engine_api/app.py` | `create_app` — the lifespan (probe the engines, the sessions, the reaper), CORS |
| `engine_api/v1.py` | `/v1` |
| `engine_api/sessions.py` | `Session` (one engine, newest-wins, options), `SessionManager` (the cap, the reaper) |
| `engine_api/engines.py` | probing a binary; the server's ceilings on its options |
| `engine_api/uci.py` | `UciProcess` and the `option` / `info` / `bestmove` parsers |
| `engine_api/legacy.py` | the cloned routes |
| `engine_api/config.py` | `engines.local.json` |
| `tests/` | pure tests, and sessions and HTTP over a real engine (skipped where none is configured) |
