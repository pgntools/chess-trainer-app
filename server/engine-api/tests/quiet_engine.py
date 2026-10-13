"""A UCI engine that goes quiet while it searches — the heartbeat's tests' (CTA-194).

Run as `python quiet_engine.py <mode>`:

- `silent` — answers `uci` and `isready` (also mid-search, as Stockfish does);
  `go` prints one `info` line, then nothing until its `movetime` runs out or a
  `stop` comes, then `bestmove`.
- `hung` — the same, but while it searches its UCI loop answers nothing: the
  process lives, the engine does not.
- `slow` — the same as `silent`, but an `isready` asked mid-search is answered
  0.3 s later, so a search can end before its probe is answered.

Standard library only, so the tests need no engine binary of their own.
"""

from __future__ import annotations

import sys
import threading

MODE = sys.argv[1] if len(sys.argv) > 1 else "silent"
lock = threading.Lock()
search: threading.Timer | None = None
searching = False


def say(line: str) -> None:
    with lock:
        sys.stdout.write(line + "\n")
        sys.stdout.flush()


def finish() -> None:
    global searching
    with lock:
        if not searching:
            return
        searching = False
    say("bestmove e2e4 ponder e7e5")


for raw in sys.stdin:
    command = raw.strip()
    if command == "uci":
        say("id name Quiet 1")
        say("option name Hash type spin default 16 min 1 max 1024")
        say("option name MultiPV type spin default 1 min 1 max 8")
        say("uciok")
    elif command == "isready":
        if MODE == "slow" and searching:
            threading.Timer(0.3, say, ("readyok",)).start()
        elif not (MODE == "hung" and searching):
            say("readyok")
    elif command.startswith("go"):
        tokens = command.split()
        with lock:
            searching = True
        say("info depth 1 seldepth 1 multipv 1 score cp 20 nodes 20 nps 1000 time 1 pv e2e4")
        if "movetime" in tokens:
            search = threading.Timer(int(tokens[tokens.index("movetime") + 1]) / 1000, finish)
            search.start()
    elif command == "stop":
        if search is not None:
            search.cancel()
        finish()
    elif command == "quit":
        break
