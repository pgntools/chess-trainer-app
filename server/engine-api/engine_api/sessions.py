"""Sessions: one engine process each, so a board keeps the engine's memory.

A client opens a session and sends every search of one board to it. Its
engine's transposition table then carries over from position to position —
measured ~1.5–1.7× faster through a game (`docs/eval-examples/README.md`).

Within a session the **newest search wins**: a new search stops the running
one (whose stream still ends with its `bestmove`, `stopped: true`) and makes
any search still waiting for the engine end at once (`superseded`). That is
`EngineHandle.search()`'s contract in `src/lib/engineTypes.ts`, kept on the
server so a client never has to sequence anything.

Options follow the app's `UciEngine` discipline: only declared, settable
ones; only while the engine is idle; and only the ones that changed — a
re-sent `Hash` would clear the very memory a session exists to keep.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
import uuid
from dataclasses import dataclass
from typing import Any

from .config import Settings
from .engines import EngineInfo, capped
from .uci import EngineTerminated, Handshake, UciOption, UciProcess, parse_bestmove, parse_info

log = logging.getLogger(__name__)

Event = dict[str, Any]


class UnknownEngine(Exception):
    pass


class SessionsFull(Exception):
    pass


class EngineUnavailable(Exception):
    pass


@dataclass(frozen=True)
class Limit:
    """When a search ends: a depth, a time, both (whichever first), or only when stopped."""

    depth: int | None = None
    movetime_ms: int | None = None
    infinite: bool = False


def go_command(limit: Limit, settings: Settings) -> str:
    if limit.infinite:
        return "go infinite"
    parts = ["go"]
    if limit.depth is not None:
        parts += ["depth", str(min(max(limit.depth, 1), settings.max_depth))]
    if limit.movetime_ms is not None and limit.movetime_ms > 0:
        parts += ["movetime", str(min(limit.movetime_ms, settings.max_movetime_ms))]
    if len(parts) == 1:
        parts += ["depth", str(settings.max_depth)]
    return " ".join(parts)


def wire_value(option: UciOption, value: Any) -> str | None:
    """The value as `setoption` takes it, clamped to the option's bounds — `None` if it cannot be."""
    if option.type == "check":
        if isinstance(value, bool):
            return "true" if value else "false"
        if isinstance(value, str) and value.lower() in ("true", "false"):
            return value.lower()
        return None
    if option.type == "spin":
        if isinstance(value, bool):
            return None
        try:
            number = int(float(value))
        except (TypeError, ValueError):
            return None
        if option.min is not None:
            number = max(number, option.min)
        if option.max is not None:
            number = min(number, option.max)
        return str(number)
    if option.type == "combo":
        return next((v for v in option.vars if v.lower() == str(value).lower()), None)
    if option.type == "string":
        text = str(value)
        return None if "\n" in text or "\r" in text else text
    return None


def typed_value(option: UciOption, wire: str) -> Any:
    if option.type == "check":
        return wire == "true"
    if option.type == "spin":
        return int(wire)
    return wire


class Search:
    """One search's events, in order; `None` closes the stream."""

    def __init__(self, seq: int, fen: str, engine_fen: str, limit: Limit, options: dict[str, Any]):
        self.seq = seq
        self.fen = fen  # as the client sent it — every event is stamped with it
        self.engine_fen = engine_fen  # normalised, what the engine is given
        self.limit = limit
        self.options = options
        self.events: asyncio.Queue[Event | None] = asyncio.Queue()
        self.abandoned = False
        self.finished = False

    def emit(self, event: Event) -> None:
        self.events.put_nowait(event)

    def finish(self) -> None:
        if not self.finished:
            self.finished = True
            self.events.put_nowait(None)


class Session:
    def __init__(
        self,
        session_id: str,
        engine: EngineInfo,
        process: UciProcess,
        handshake: Handshake,
        settings: Settings,
    ) -> None:
        self.id = session_id
        self.engine = engine
        self.process = process
        self.settings = settings
        # This process's own reply, under the server's ceilings.
        self.options = {n: capped(o, settings) for n, o in handshake.options.items()}
        self.applied: dict[str, str] = {}  # option → the wire value last sent
        self.last_used = time.monotonic()
        self.closed = False
        self.current: Search | None = None
        self._lock = asyncio.Lock()
        self._latest = 0
        self._stop_sent = False
        self._go_sent = False
        self._tasks: set[asyncio.Task[None]] = set()

    @property
    def dead(self) -> bool:
        return self.closed or not self.process.alive

    @property
    def busy(self) -> bool:
        return self.current is not None or self._lock.locked()

    def touch(self) -> None:
        self.last_used = time.monotonic()

    # --- what a request asks for -------------------------------------------

    def analyse(self, fen: str, engine_fen: str, limit: Limit, options: dict[str, Any]) -> Search:
        """Start a search; the running one is stopped and a waiting one superseded."""
        self.touch()
        self._latest += 1
        search = Search(self._latest, fen, engine_fen, limit, options)
        self._request_stop()
        task = asyncio.create_task(self._run(search))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return search

    def stop(self) -> None:
        """End the running search early and drop any that is waiting."""
        self.touch()
        self._latest += 1
        self._request_stop()

    def abandon(self, search: Search) -> None:
        """Its client went away: stop it if it runs, and never start it if it waits."""
        if search.finished:
            return
        search.abandoned = True
        if self.current is search:
            self._request_stop()

    async def close(self) -> None:
        self.closed = True
        self._request_stop()
        await self.process.close()
        for task in list(self._tasks):
            with contextlib.suppress(asyncio.CancelledError):
                await task

    # --- the engine --------------------------------------------------------

    def _request_stop(self) -> None:
        if self.current is None or self._stop_sent:
            return
        self._stop_sent = True
        # Before `go` a `stop` would be ignored by an idle engine; `_run` sends it after.
        if self._go_sent:
            self.process.send("stop")

    def _superseded(self, search: Search) -> bool:
        return search.seq != self._latest or search.abandoned

    async def _run(self, search: Search) -> None:
        try:
            async with self._lock:
                if self.dead:
                    raise EngineTerminated("session closed")
                if self._superseded(search):
                    search.emit({"type": "superseded", "fen": search.fen})
                    return
                self.current = search
                self._stop_sent = False
                self._go_sent = False
                try:
                    applied, refused = await self._apply(search.options)
                    if self._superseded(search):
                        search.emit({"type": "superseded", "fen": search.fen})
                        return
                    search.emit(
                        {
                            "type": "start",
                            "fen": search.fen,
                            "engine": self.engine.spec.id,
                            "applied": applied,
                            "refused": refused,
                        }
                    )
                    self.process.send(f"position fen {search.engine_fen}")
                    self.process.send(go_command(search.limit, self.settings))
                    self._go_sent = True
                    if self._stop_sent:
                        self.process.send("stop")
                    await self._relay(search)
                finally:
                    self.current = None
                    self.touch()
        except EngineTerminated as error:
            self.closed = True
            log.warning("session %s: %s", self.id, error)
            search.emit({"type": "error", "fen": search.fen, "detail": str(error)})
        finally:
            search.finish()

    async def _relay(self, search: Search) -> None:
        while True:
            line = await self.process.next_line()
            if line.startswith("info"):
                search.emit({"type": "info", "fen": search.fen, **parse_info(line), "uci": line})
            elif line.startswith("bestmove"):
                best, ponder = parse_bestmove(line)
                search.emit(
                    {
                        "type": "bestmove",
                        "fen": search.fen,
                        "bestmove": best,
                        "ponder": ponder,
                        "stopped": self._stop_sent,
                        "uci": line,
                    }
                )
                return

    def _lookup(self, name: str) -> UciOption | None:
        return self.options.get(name) or next(
            (o for n, o in self.options.items() if n.lower() == name.lower()), None
        )

    async def _apply(self, requested: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
        applied: dict[str, Any] = {}
        refused: list[str] = []
        sent = False
        for name, value in requested.items():
            option = self._lookup(name)
            wire = wire_value(option, value) if option is not None and option.settable else None
            if option is None or wire is None:
                refused.append(name)
                continue
            applied[option.name] = typed_value(option, wire)
            if self.applied.get(option.name) == wire:
                continue
            self.process.send(f"setoption name {option.name} value {wire}")
            self.applied[option.name] = wire
            sent = True
        if sent:
            await self.process.ready()
        return applied, refused


class SessionManager:
    def __init__(self, settings: Settings, catalog: dict[str, EngineInfo]) -> None:
        self.settings = settings
        self.catalog = catalog
        self._sessions: dict[str, Session] = {}
        self._create_lock = asyncio.Lock()

    def __len__(self) -> int:
        return len(self._sessions)

    async def create(self, engine_id: str) -> Session:
        engine = self.catalog.get(engine_id)
        if engine is None:
            raise UnknownEngine(engine_id)
        async with self._create_lock:
            await self.reap(only_dead=True)
            if len(self._sessions) >= self.settings.max_sessions:
                idle = [s for s in self._sessions.values() if not s.busy]
                if not idle:
                    raise SessionsFull()
                # A tab closed without saying so leaves its session behind; the least recent goes.
                victim = min(idle, key=lambda s: s.last_used)
                log.info("session cap reached: closing the least recently used, %s", victim.id)
                await self._close(victim)
            process = UciProcess(engine.spec.path)
            try:
                handshake = await process.start()
            except (OSError, EngineTerminated) as error:
                raise EngineUnavailable(str(error)) from error
            session = Session(uuid.uuid4().hex, engine, process, handshake, self.settings)
            self._sessions[session.id] = session
            return session

    def get(self, session_id: str) -> Session | None:
        session = self._sessions.get(session_id)
        if session is None or session.dead:
            return None
        session.touch()
        return session

    async def delete(self, session_id: str) -> bool:
        session = self._sessions.get(session_id)
        if session is None:
            return False
        await self._close(session)
        return True

    async def _close(self, session: Session) -> None:
        self._sessions.pop(session.id, None)
        await session.close()

    async def reap(self, only_dead: bool = False) -> None:
        """Close dead sessions and — unless `only_dead` — idle ones past the timeout."""
        now = time.monotonic()
        for session in list(self._sessions.values()):
            idle_too_long = not session.busy and now - session.last_used > self.settings.idle_timeout_s
            if session.dead or (not only_dead and idle_too_long):
                await self._close(session)

    async def run_reaper(self) -> None:
        interval = max(1.0, min(30.0, self.settings.idle_timeout_s / 2))
        while True:
            await asyncio.sleep(interval)
            await self.reap()

    async def close_all(self) -> None:
        for session in list(self._sessions.values()):
            await self._close(session)
