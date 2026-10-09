"""The engines this server runs — each binary probed once at startup.

The options a client is shown are the binary's own `uci` reply, with the
server's ceilings applied to `Threads` and `Hash` (`capped`): an engine that
declares 1024 threads and 32 TB of hash is offered what this machine allows.
"""

from __future__ import annotations

import dataclasses
import logging
import re
from dataclasses import dataclass
from typing import Any

from .config import EngineSpec, Settings
from .uci import EngineTerminated, UciOption, UciProcess

log = logging.getLogger(__name__)


def capped(option: UciOption, settings: Settings) -> UciOption:
    """The option as this server lets a client set it."""
    ceiling = {"Threads": settings.max_threads, "Hash": settings.max_hash_mb}.get(option.name)
    if ceiling is None or option.max is None or option.max <= ceiling:
        return option
    return dataclasses.replace(option, max=max(ceiling, option.min or 0))


@dataclass(frozen=True)
class EngineInfo:
    spec: EngineSpec
    name: str
    version: str | None
    options: dict[str, UciOption]  # capped

    def as_json(self, settings: Settings) -> dict[str, Any]:
        return {
            "id": self.spec.id,
            "name": self.name,
            "version": self.version,
            "options": [o.as_json() for o in self.options.values()],
            "limits": {
                "maxDepth": settings.max_depth,
                "maxMovetimeMs": settings.max_movetime_ms,
            },
        }


def version_of(name: str) -> str | None:
    """`Stockfish 18` → `18`, `Stockfish 17.1` → `17.1`, `Stockfish dev-20260101-abc` → None."""
    match = re.search(r"\s(\d+(?:\.\d+)*)$", name.strip())
    return match.group(1) if match else None


async def probe(spec: EngineSpec, settings: Settings) -> EngineInfo:
    process = UciProcess(spec.path)
    try:
        handshake = await process.start()
    finally:
        await process.close()
    name = spec.name or handshake.name or spec.id
    return EngineInfo(
        spec=spec,
        name=name,
        version=version_of(handshake.name or name),
        options={n: capped(o, settings) for n, o in handshake.options.items()},
    )


async def probe_all(settings: Settings) -> dict[str, EngineInfo]:
    """Every configured engine that starts and handshakes; one that does not is logged and left out."""
    catalog: dict[str, EngineInfo] = {}
    for spec in settings.engines:
        try:
            catalog[spec.id] = await probe(spec, settings)
            log.info("engine %s: %s", spec.id, catalog[spec.id].name)
        except (OSError, EngineTerminated) as error:
            log.warning("engine %s (%s) is unavailable: %s", spec.id, spec.path, error)
    return catalog
