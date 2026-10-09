"""A native engine process spoken to over UCI — raw lines in, raw lines out.

Nothing here knows about HTTP or sessions: `UciProcess` starts a binary,
reads its output into a queue line by line, and writes commands to it. The
parsers turn an `option` or `info` line into data; the raw line always
travels on beside it, so the app reads a hosted engine with the same parser
it reads a browser worker with (`parseEngineLine` in `src/lib/uciEngine.ts`).
"""

from __future__ import annotations

import asyncio
import contextlib
from dataclasses import dataclass, field
from typing import Any

HANDSHAKE_TIMEOUT_S = 10.0
READY_TIMEOUT_S = 30.0  # a large `Hash` is allocated before `readyok`
QUIT_TIMEOUT_S = 2.0


class EngineTerminated(Exception):
    """The engine process exited or stopped answering."""


@dataclass(frozen=True)
class UciOption:
    """One `option` the engine declared in its `uci` reply."""

    name: str
    type: str
    default: str | None = None
    min: int | None = None
    max: int | None = None
    vars: tuple[str, ...] = ()

    @property
    def settable(self) -> bool:
        """Whether a value can be set: not a button, and not a spin pinned to one value."""
        if self.type == "button":
            return False
        if self.type == "spin" and self.min is not None and self.min == self.max:
            return False
        return True

    def as_json(self) -> dict[str, Any]:
        data: dict[str, Any] = {"name": self.name, "type": self.type}
        if self.default is not None:
            data["default"] = self.default
        if self.min is not None:
            data["min"] = self.min
        if self.max is not None:
            data["max"] = self.max
        if self.vars:
            data["vars"] = list(self.vars)
        return data


def parse_option(line: str) -> UciOption | None:
    """`option name <name> type <type> [default <v>] [min <n>] [max <n>] [var <v>]*`."""
    prefix = "option name "
    if not line.startswith(prefix):
        return None
    name, sep, rest = line[len(prefix) :].partition(" type ")
    if not sep or not name:
        return None
    tokens = rest.split(" ")
    fields: dict[str, list[str]] = {}
    vars_: list[list[str]] = []
    key: str | None = None
    for token in tokens[1:]:
        if token in ("default", "min", "max"):
            key = token
            fields[key] = []
        elif token == "var":
            key = "var"
            vars_.append([])
        elif key == "var":
            vars_[-1].append(token)
        elif key is not None:
            fields[key].append(token)

    def number(raw: list[str] | None) -> int | None:
        try:
            return int(" ".join(raw)) if raw else None
        except ValueError:
            return None

    return UciOption(
        name=name,
        type=tokens[0],
        default=" ".join(fields["default"]) if "default" in fields else None,
        min=number(fields.get("min")),
        max=number(fields.get("max")),
        vars=tuple(" ".join(v) for v in vars_),
    )


_INT_FIELDS = {
    "depth": "depth",
    "seldepth": "seldepth",
    "multipv": "multipv",
    "nodes": "nodes",
    "nps": "nps",
    "time": "timeMs",
    "hashfull": "hashfull",
    "tbhits": "tbhits",
    "currmovenumber": "currmovenumber",
}


def parse_info(line: str) -> dict[str, Any]:
    """The fields of an `info` line; `pv` and `string` run to its end."""
    tokens = line.split()
    data: dict[str, Any] = {}
    i = 1
    while i < len(tokens):
        token = tokens[i]
        if token in _INT_FIELDS and i + 1 < len(tokens):
            with contextlib.suppress(ValueError):
                data[_INT_FIELDS[token]] = int(tokens[i + 1])
            i += 2
        elif token == "score" and i + 2 < len(tokens):
            with contextlib.suppress(ValueError):
                data["score"] = {tokens[i + 1]: int(tokens[i + 2])}
            i += 3
        elif token in ("lowerbound", "upperbound"):
            data["bound"] = token[: -len("bound")]
            i += 1
        elif token == "wdl" and i + 3 < len(tokens):
            with contextlib.suppress(ValueError):
                data["wdl"] = [int(t) for t in tokens[i + 1 : i + 4]]
            i += 4
        elif token == "currmove" and i + 1 < len(tokens):
            data["currmove"] = tokens[i + 1]
            i += 2
        elif token == "pv":
            data["pv"] = tokens[i + 1 :]
            break
        elif token == "string":
            data["string"] = " ".join(tokens[i + 1 :])
            break
        else:
            i += 1
    return data


def parse_bestmove(line: str) -> tuple[str | None, str | None]:
    """`bestmove <move> [ponder <move>]` — `(none)` when there is no legal move."""
    tokens = line.split()
    best = tokens[1] if len(tokens) > 1 else None
    ponder = tokens[3] if len(tokens) > 3 and tokens[2] == "ponder" else None
    return best, ponder


@dataclass
class Handshake:
    """What the engine said about itself in reply to `uci`."""

    name: str | None = None
    options: dict[str, UciOption] = field(default_factory=dict)


class UciProcess:
    """One running engine binary. Every line it prints lands in `lines`; `None` marks its exit."""

    def __init__(self, path: str) -> None:
        self.path = path
        self.lines: asyncio.Queue[str | None] = asyncio.Queue()
        self._proc: asyncio.subprocess.Process | None = None
        self._reader: asyncio.Task[None] | None = None
        self._eof = False

    async def start(self) -> Handshake:
        self._proc = await asyncio.create_subprocess_exec(
            self.path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        self._reader = asyncio.create_task(self._read())
        try:
            return await asyncio.wait_for(self._handshake(), HANDSHAKE_TIMEOUT_S)
        except (TimeoutError, EngineTerminated):
            await self.close()
            raise EngineTerminated(f"{self.path} did not complete the uci handshake")

    @property
    def alive(self) -> bool:
        return self._proc is not None and self._proc.returncode is None and not self._eof

    async def _read(self) -> None:
        assert self._proc is not None and self._proc.stdout is not None
        try:
            while raw := await self._proc.stdout.readline():
                self.lines.put_nowait(raw.decode(errors="replace").rstrip("\r\n"))
        finally:
            self._eof = True
            self.lines.put_nowait(None)

    def send(self, line: str) -> None:
        """Write one command. A dead process is not an error here — its EOF ends whoever is reading."""
        if self._proc is None or self._proc.stdin is None or self._proc.stdin.is_closing():
            return
        with contextlib.suppress(BrokenPipeError, ConnectionResetError):
            self._proc.stdin.write(f"{line}\n".encode())

    async def next_line(self) -> str:
        line = await self.lines.get()
        if line is None:
            raise EngineTerminated("engine process exited")
        return line

    async def _handshake(self) -> Handshake:
        handshake = Handshake()
        self.send("uci")
        while (line := await self.next_line()) != "uciok":
            if line.startswith("id name "):
                handshake.name = line[len("id name ") :]
            elif (option := parse_option(line)) is not None:
                handshake.options[option.name] = option
        return handshake

    async def ready(self) -> None:
        """`isready` → `readyok`: the options sent before it have been taken. Only while idle."""
        self.send("isready")

        async def wait() -> None:
            while await self.next_line() != "readyok":
                pass

        try:
            await asyncio.wait_for(wait(), READY_TIMEOUT_S)
        except TimeoutError:
            raise EngineTerminated("engine did not answer isready")

    async def close(self) -> None:
        proc = self._proc
        if proc is None:
            return
        if proc.returncode is None:
            self.send("quit")
            try:
                await asyncio.wait_for(proc.wait(), QUIT_TIMEOUT_S)
            except TimeoutError:
                proc.kill()
                await proc.wait()
        if self._reader is not None:
            with contextlib.suppress(asyncio.CancelledError):
                await self._reader
