"""The original API, cloned from game-anal-v1/api — `/health`, `/config`, `/eval`.

Kept as it was for the tools written against it: one shared engine, a
global configuration (`PUT /config` restarts the engine), and the CLI
annotator's analysis — MultiPV with an early stop once an alternative falls
more than `VARIATION_RANGE_CP` behind, and those alternatives pruned.

Two changes from the original: `VARIATION_RANGE_CP` and `format_score` are
inlined (they were imported from that repository's `main.py` / `utils.py`),
and the engine starts on the first request rather than with the server, so a
server used only through `/v1` never allocates the 4 GB default hash.

New clients use `/v1` (`v1.py`).
"""

from __future__ import annotations

import asyncio

import chess
import chess.engine
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

VARIATION_RANGE_CP = 100

router = APIRouter()


class EngineConfig(BaseModel):
    threads: int = Field(default=1, ge=1, le=20)
    hash: int = Field(default=4096, ge=1024, le=16384)
    depth: int = Field(default=20, ge=1, le=100)
    seconds: float = Field(default=30, ge=0.01, le=86400)
    multipv: int = Field(default=1, ge=1, le=500)
    min_depth: int = Field(default=24, ge=0, le=100)


class EvalRequest(BaseModel):
    fen: str
    depth: int | None = Field(default=None, ge=1, le=100)
    seconds: float | None = Field(default=None, ge=0.01, le=86400)
    multipv: int | None = Field(default=None, ge=1, le=500)
    min_depth: int | None = Field(default=None, ge=0, le=100)


class Score(BaseModel):
    cp: int | None = None
    mate: int | None = None


class EvalLine(BaseModel):
    multipv: int
    uci: str | None = None
    san: str | None = None
    pv_uci: list[str]
    pv_san: list[str]
    score_stm: Score | None = None
    score_white: Score | None = None
    score_formatted: str | None = None


class EvalResponse(BaseModel):
    fen: str
    turn: str
    is_game_over: bool
    depth: int | None = None
    lines: list[EvalLine]


class SupersededError(Exception):
    """A newer eval request was registered while this one was queued."""


class EngineFailedError(Exception):
    """The engine process failed mid-search; it was restarted, safe to retry."""


def format_score(score: chess.engine.PovScore) -> str:
    if score.is_mate():
        mate_moves = score.white().mate()
        sign = "-" if mate_moves < 0 else ""
        return f"{sign}#{abs(mate_moves)}"
    return f"{score.white().score() / 100:+.2f}"


def _score_model(score: chess.engine.Score) -> Score:
    if score.is_mate():
        return Score(mate=score.mate())
    return Score(cp=score.score())


def _build_line(info: dict, board: chess.Board) -> EvalLine:
    pv = info.get("pv", [])
    pv_uci = [str(move) for move in pv]
    pv_san: list[str] = []

    if pv and pv[0] in board.legal_moves:
        replay = board.copy()
        for move in pv:
            if move not in replay.legal_moves:
                break
            pv_san.append(replay.san(move))
            replay.push(move)

    score = info.get("score")

    return EvalLine(
        multipv=info.get("multipv", 1),
        uci=pv_uci[0] if pv_uci else None,
        san=pv_san[0] if pv_san else None,
        pv_uci=pv_uci,
        pv_san=pv_san,
        score_stm=_score_model(score.pov(board.turn)) if score else None,
        score_white=_score_model(score.white()) if score else None,
        score_formatted=format_score(score) if score else None,
    )


class EngineManager:
    """Owns a single async Stockfish process and serializes eval requests.

    Latest-wins semantics: a new eval request asks any in-flight search to
    stop early (partial results are returned to the previous caller), and
    requests that were queued behind a newer one are rejected with
    SupersededError instead of burning engine time.
    """

    def __init__(self, path: str, config: EngineConfig) -> None:
        self.path = path
        self.config = config
        self._engine: chess.engine.UciProtocol | None = None
        self._lock = asyncio.Lock()
        self._seq = 0
        self._interrupt = False

    async def close(self) -> None:
        if self._engine is not None:
            try:
                await self._engine.quit()
            except chess.engine.EngineTerminatedError:
                pass
            self._engine = None

    async def _spawn(self) -> None:
        await self.close()
        _, engine = await chess.engine.popen_uci(self.path)
        await engine.configure({"Threads": self.config.threads, "Hash": self.config.hash})
        self._engine = engine

    async def update_config(self, config: EngineConfig) -> None:
        self._interrupt = True  # ask any in-flight search to wrap up early
        async with self._lock:
            self._interrupt = False
            self.config = config
            await self._spawn()

    async def evaluate(self, request: EvalRequest) -> EvalResponse:
        board = chess.Board(request.fen)  # raises ValueError on invalid FEN

        depth = request.depth if request.depth is not None else self.config.depth
        seconds = request.seconds if request.seconds is not None else self.config.seconds
        multipv = request.multipv if request.multipv is not None else self.config.multipv
        min_depth = request.min_depth if request.min_depth is not None else self.config.min_depth

        self._seq += 1
        my_seq = self._seq
        self._interrupt = True  # ask any in-flight search to wrap up early

        async with self._lock:
            self._interrupt = False
            if my_seq != self._seq:
                raise SupersededError()

            if board.is_game_over():
                return EvalResponse(
                    fen=board.fen(),
                    turn="white" if board.turn == chess.WHITE else "black",
                    is_game_over=True,
                    lines=[],
                )

            if self._engine is None:
                await self._spawn()

            limit = chess.engine.Limit(depth=depth, time=float(seconds))
            try:
                infos = await self._analyze(board, limit, multipv, min_depth)
            except chess.engine.EngineError:
                # Engine process died mid-search (crash, OOM kill); respawn
                # so subsequent requests work without an API restart.
                await self._spawn()
                raise EngineFailedError()

            return EvalResponse(
                fen=board.fen(),
                turn="white" if board.turn == chess.WHITE else "black",
                is_game_over=False,
                depth=infos[0].get("depth") if infos else None,
                lines=[_build_line(info, board) for info in infos],
            )

    async def _analyze(
        self,
        board: chess.Board,
        limit: chess.engine.Limit,
        multipv: int,
        min_depth: int,
    ) -> list[dict]:
        assert self._engine is not None
        info_by_mpv: dict[int, dict] = {}
        stop_requested = False

        with await self._engine.analysis(board, limit, multipv=multipv) as analysis:
            async for info in analysis:
                if self._interrupt:
                    analysis.stop()
                    break

                if stop_requested:
                    continue

                m = info.get("multipv", 1)
                info_by_mpv[m] = info

                d = info.get("depth", 0)
                if d >= min_depth and 1 in info_by_mpv:
                    s1 = info_by_mpv[1].get("score")
                    if s1:
                        best_score = s1.pov(board.turn).score(mate_score=10000)
                        for i in range(2, multipv + 1):
                            si = info_by_mpv.get(i, {}).get("score")
                            if si:
                                alt_score = si.pov(board.turn).score(mate_score=10000)
                                if best_score - alt_score > VARIATION_RANGE_CP:
                                    stop_requested = True
                                    analysis.stop()
                                    break

        # Infos are sorted by multipv, so the first line beyond
        # VARIATION_RANGE_CP ends the viable set.
        results: list[dict] = []
        if 1 in info_by_mpv and info_by_mpv[1].get("score"):
            best_score = info_by_mpv[1]["score"].pov(board.turn).score(mate_score=10000)
            for k in sorted(info_by_mpv.keys()):
                si = info_by_mpv[k].get("score")
                if si:
                    alt_score = si.pov(board.turn).score(mate_score=10000)
                    if best_score - alt_score > VARIATION_RANGE_CP and k != 1:
                        break
                results.append(info_by_mpv[k])
        else:
            results = [info_by_mpv[k] for k in sorted(info_by_mpv.keys())]
        return results


def _manager(request: Request) -> EngineManager:
    return request.app.state.legacy


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/config")
async def get_config(request: Request) -> EngineConfig:
    return _manager(request).config


@router.put("/config")
async def put_config(config: EngineConfig, request: Request) -> EngineConfig:
    manager = _manager(request)
    await manager.update_config(config)
    return manager.config


@router.post("/eval")
async def evaluate(req: EvalRequest, request: Request) -> EvalResponse:
    try:
        return await _manager(request).evaluate(req)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid FEN")
    except SupersededError:
        raise HTTPException(status_code=409, detail="Superseded by a newer eval request")
    except EngineFailedError:
        raise HTTPException(
            status_code=503,
            detail="Engine failed mid-search and was restarted; please retry",
        )
