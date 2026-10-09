"""The engine API's tests.

The pure ones (parsers, options, config) need nothing. The rest run a real
engine — the first one in the engine config (`engines.local.json`, or
`ENGINE_API_CONFIG`) — at shallow depths, and are skipped where there is none.
"""

from __future__ import annotations

import os
import socket
import threading
import time
from collections.abc import Iterator
from pathlib import Path

import pytest
import uvicorn

from engine_api.app import create_app
from engine_api.config import ConfigError, EngineSpec, Settings, load_settings

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
CHECKMATED = "R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1"  # Black is mated


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def _engine() -> EngineSpec | None:
    try:
        settings = load_settings()
    except ConfigError:
        return None
    spec = settings.engines[0]
    return spec if os.access(Path(spec.path), os.X_OK) else None


@pytest.fixture(scope="session")
def engine_spec() -> EngineSpec:
    spec = _engine()
    if spec is None:
        pytest.skip("no engine configured — copy engines.example.json to engines.local.json")
    return spec


def small_settings(spec: EngineSpec, **overrides) -> Settings:
    """Tight ceilings, so a test is quick and its clamps are visible."""
    values = dict(
        engines=(spec,),
        max_sessions=2,
        idle_timeout_s=60,
        max_threads=2,
        max_hash_mb=64,
        max_depth=30,
        allowed_origins=("https://chessapp.dev",),
    )
    values.update(overrides)
    return Settings(**values)


@pytest.fixture
def settings(engine_spec: EngineSpec) -> Settings:
    return small_settings(engine_spec)


@pytest.fixture(scope="module")
def server_url(engine_spec: EngineSpec) -> Iterator[str]:
    """A real server on a free port — streaming and hang-ups behave as they do for a browser."""
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    config = uvicorn.Config(create_app(small_settings(engine_spec)), host="127.0.0.1", port=port, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    deadline = time.monotonic() + 20
    while not server.started:
        if time.monotonic() > deadline or not thread.is_alive():
            raise RuntimeError("the test server did not start")
        time.sleep(0.05)
    yield f"http://127.0.0.1:{port}"
    server.should_exit = True
    thread.join(timeout=10)
