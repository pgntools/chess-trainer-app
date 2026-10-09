"""`/v1` — engines, sessions, and searches streamed as NDJSON.

    GET    /v1/health
    GET    /v1/engines                      what this server runs, each engine's options and limits
    POST   /v1/sessions        {engine}     a session: one engine process, kept between searches
    DELETE /v1/sessions/{id}
    POST   /v1/sessions/{id}/analyse        a search, streamed: start, info…, bestmove
    POST   /v1/sessions/{id}/stop           end the running search (its stream ends with bestmove)
    POST   /v1/sessions/{id}/eval           a search's final result as one JSON answer

The reference is `server/engine-api/README.md`.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import chess
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, model_validator

from .sessions import (
    EngineUnavailable,
    Limit,
    Search,
    Session,
    SessionManager,
    SessionsFull,
    UnknownEngine,
)

router = APIRouter(prefix="/v1")

MAX_FEN_LENGTH = 100


class LimitModel(BaseModel):
    depth: int | None = Field(default=None, ge=1, le=245)
    movetimeMs: int | None = Field(default=None, ge=1)
    infinite: bool = False

    @model_validator(mode="after")
    def one_kind(self) -> LimitModel:
        if self.infinite and (self.depth is not None or self.movetimeMs is not None):
            raise ValueError("`infinite` takes no depth or movetimeMs")
        if not self.infinite and self.depth is None and self.movetimeMs is None:
            raise ValueError("give a depth, a movetimeMs, or infinite")
        return self

    def limit(self) -> Limit:
        return Limit(depth=self.depth, movetime_ms=self.movetimeMs, infinite=self.infinite)


class SearchRequest(BaseModel):
    fen: str = Field(max_length=MAX_FEN_LENGTH)
    limit: LimitModel
    # UCI option name → value, applied (if changed) before the search. Undeclared or pinned ones are refused.
    options: dict[str, bool | int | float | str] = Field(default_factory=dict, max_length=32)


class EvalRequest(SearchRequest):
    # Drop lines more than this many centipawns behind the best — the annotator's cut. Off by default.
    pruneWithinCp: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def not_infinite(self) -> EvalRequest:
        if self.limit.infinite:
            raise ValueError("an eval needs a depth or a movetimeMs, not infinite")
        return self


class CreateSession(BaseModel):
    engine: str


def _manager(request: Request) -> SessionManager:
    return request.app.state.sessions


def _session(request: Request, session_id: str) -> Session:
    session = _manager(request).get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Unknown session")
    return session


def _board(fen: str) -> chess.Board:
    """A position the engine can be given — python-chess's validation, so a bad FEN never reaches Stockfish."""
    try:
        board = chess.Board(fen)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid FEN")
    if not board.is_valid():
        raise HTTPException(status_code=422, detail="Illegal position")
    return board


@router.get("/health")
async def health(request: Request) -> dict[str, Any]:
    manager = _manager(request)
    return {"status": "ok", "engines": list(manager.catalog), "sessions": len(manager)}


@router.get("/engines")
async def engines(request: Request) -> list[dict[str, Any]]:
    manager = _manager(request)
    return [info.as_json(manager.settings) for info in manager.catalog.values()]


@router.post("/sessions", status_code=201)
async def create_session(body: CreateSession, request: Request) -> dict[str, Any]:
    manager = _manager(request)
    try:
        session = await manager.create(body.engine)
    except UnknownEngine:
        raise HTTPException(status_code=404, detail=f"Unknown engine {body.engine!r}")
    except SessionsFull:
        raise HTTPException(status_code=503, detail="Every session is busy")
    except EngineUnavailable as error:
        raise HTTPException(status_code=503, detail=f"Engine failed to start: {error}")
    return {
        "session": session.id,
        "engine": session.engine.spec.id,
        "idleTimeoutS": manager.settings.idle_timeout_s,
    }


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str, request: Request) -> Response:
    if not await _manager(request).delete(session_id):
        raise HTTPException(status_code=404, detail="Unknown session")
    return Response(status_code=204)


@router.post("/sessions/{session_id}/stop", status_code=204)
async def stop(session_id: str, request: Request) -> Response:
    _session(request, session_id).stop()
    return Response(status_code=204)


def _start(session: Session, body: SearchRequest) -> Search:
    board = _board(body.fen)
    return session.analyse(body.fen, board.fen(), body.limit.limit(), body.options)


async def _events(session: Session, search: Search) -> AsyncIterator[dict[str, Any]]:
    """The search's events; a client gone before the end abandons it (stops it, or never starts it)."""
    try:
        while (event := await search.events.get()) is not None:
            yield event
    finally:
        session.abandon(search)


@router.post("/sessions/{session_id}/analyse")
async def analyse(session_id: str, body: SearchRequest, request: Request) -> StreamingResponse:
    session = _session(request, session_id)
    search = _start(session, body)

    async def lines() -> AsyncIterator[str]:
        async for event in _events(session, search):
            yield json.dumps(event, separators=(",", ":")) + "\n"

    return StreamingResponse(
        lines(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


def _score(score: dict[str, int] | None, white_to_move: bool) -> tuple[dict | None, dict | None]:
    """The engine's score (side to move) and the same from White's side."""
    if not score:
        return None, None
    return score, score if white_to_move else {k: -v for k, v in score.items()}


def _comparable(score: dict[str, int] | None) -> int | None:
    if not score:
        return None
    if "mate" in score:
        mate = score["mate"]
        return 100_000 - mate if mate > 0 else -100_000 - mate
    return score.get("cp")


@router.post("/sessions/{session_id}/eval")
async def evaluate(session_id: str, body: EvalRequest, request: Request) -> dict[str, Any]:
    session = _session(request, session_id)
    board = _board(body.fen)
    search = _start(session, body)

    latest: dict[int, dict[str, Any]] = {}  # multipv → its deepest info with a score
    end: dict[str, Any] | None = None
    async for event in _events(session, search):
        if event["type"] == "info" and "score" in event and "pv" in event:
            latest[event.get("multipv", 1)] = event
        elif event["type"] in ("bestmove", "superseded", "error"):
            end = event
    if end is None or end["type"] == "error":
        raise HTTPException(status_code=503, detail="The engine stopped; open a new session")
    if end["type"] == "superseded":
        raise HTTPException(status_code=409, detail="Superseded by a newer search on this session")

    white = board.turn == chess.WHITE
    lines = []
    for multipv in sorted(latest):
        info = latest[multipv]
        san: list[str] = []
        replay = board.copy(stack=False)
        for uci in info["pv"]:
            try:
                move = chess.Move.from_uci(uci)
            except ValueError:
                break
            if move not in replay.legal_moves:
                break
            san.append(replay.san(move))
            replay.push(move)
        stm, from_white = _score(info["score"], white)
        lines.append(
            {
                "multipv": multipv,
                "depth": info.get("depth"),
                "score": stm,
                "scoreWhite": from_white,
                "bound": info.get("bound"),
                "pv": info["pv"],
                "pvSan": san,
            }
        )

    if body.pruneWithinCp is not None and lines:
        best = _comparable(lines[0]["score"])
        if best is not None:
            lines = [lines[0]] + [
                line
                for line in lines[1:]
                if (value := _comparable(line["score"])) is not None and best - value <= body.pruneWithinCp
            ]

    return {
        "fen": body.fen,
        "engine": session.engine.spec.id,
        "turn": "white" if white else "black",
        "isGameOver": board.is_game_over(),
        "depth": lines[0]["depth"] if lines else None,
        "bestmove": end["bestmove"] if end["bestmove"] != "(none)" else None,
        "stopped": end["stopped"],
        "lines": lines,
    }
