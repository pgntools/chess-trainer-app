"""The server's configuration: which engines it runs, and its limits.

Read from `engines.local.json` beside this package's folder (machine-specific,
not committed — `engines.example.json` is its template), or from the file
named by `ENGINE_API_CONFIG`.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = SERVER_DIR / "engines.local.json"


class ConfigError(Exception):
    pass


@dataclass(frozen=True)
class EngineSpec:
    """One engine binary the server can run. `id` is stable — the app stores it."""

    id: str
    path: str
    name: str | None = None  # defaults to the binary's own `id name`


@dataclass(frozen=True)
class Settings:
    engines: tuple[EngineSpec, ...]
    # Sessions
    max_sessions: int = 8
    idle_timeout_s: float = 300.0
    # Ceilings on what a request may ask of one engine
    max_threads: int = field(default_factory=lambda: max((os.cpu_count() or 2) - 1, 1))
    max_hash_mb: int = 4096
    max_depth: int = 99
    max_movetime_ms: int = 600_000
    # Origins allowed besides localhost / 127.0.0.1 (any port), which always are
    allowed_origins: tuple[str, ...] = ()
    # The engine behind the legacy `/eval` and `/config` (default: the first)
    legacy_engine: str | None = None

    def engine(self, engine_id: str) -> EngineSpec | None:
        return next((e for e in self.engines if e.id == engine_id), None)


_KEYS = {
    "maxSessions": ("max_sessions", int),
    "idleTimeoutS": ("idle_timeout_s", float),
    "maxThreads": ("max_threads", int),
    "maxHashMb": ("max_hash_mb", int),
    "maxDepth": ("max_depth", int),
    "maxMovetimeMs": ("max_movetime_ms", int),
    "legacyEngine": ("legacy_engine", str),
}


def settings_from(data: dict) -> Settings:
    engines = data.get("engines")
    if not isinstance(engines, list) or not engines:
        raise ConfigError("`engines` must be a non-empty list")
    specs: list[EngineSpec] = []
    for entry in engines:
        if not isinstance(entry, dict) or not entry.get("id") or not entry.get("path"):
            raise ConfigError(f"every engine needs an `id` and a `path`: {entry!r}")
        specs.append(EngineSpec(id=str(entry["id"]), path=str(entry["path"]), name=entry.get("name")))
    if len({s.id for s in specs}) != len(specs):
        raise ConfigError("engine ids must be unique")

    kwargs: dict = {}
    for key, (attr, cast) in _KEYS.items():
        if key in data:
            kwargs[attr] = cast(data[key])
    if "allowedOrigins" in data:
        kwargs["allowed_origins"] = tuple(str(o).rstrip("/") for o in data["allowedOrigins"])
    settings = Settings(engines=tuple(specs), **kwargs)
    if settings.legacy_engine is not None and settings.engine(settings.legacy_engine) is None:
        raise ConfigError(f"legacyEngine {settings.legacy_engine!r} is not one of the engines")
    return settings


def load_settings(path: str | os.PathLike | None = None) -> Settings:
    config_path = Path(path or os.environ.get("ENGINE_API_CONFIG") or DEFAULT_CONFIG_PATH)
    if not config_path.is_file():
        raise ConfigError(
            f"no engine config at {config_path} — copy engines.example.json to "
            "engines.local.json and set each engine's `path`"
        )
    try:
        data = json.loads(config_path.read_text())
    except json.JSONDecodeError as error:
        raise ConfigError(f"{config_path}: {error}") from error
    return settings_from(data)
