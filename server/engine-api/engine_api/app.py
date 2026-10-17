"""The engine API — native Stockfish binaries served to the app over HTTP.

Started by `yarn api:start` (`start.sh`), on 127.0.0.1 only:

    uvicorn --factory engine_api.app:create_app

`/v1` is the API the app uses (`v1.py`); `/health`, `/config` and `/eval`
are the original API, cloned from game-anal-v1 (`legacy.py`). Interactive
docs at `/docs`. The reference is `server/engine-api/README.md`.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import re
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import legacy, v1
from .config import Settings, load_settings
from .engines import probe_all
from .sessions import SessionManager

log = logging.getLogger("engine_api")

# The dev server, `vite preview`, the MDX editor — any port on this machine.
LOCAL_ORIGIN = r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?"


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        catalog = await probe_all(settings)
        if not catalog:
            log.error("no configured engine could be started — check the paths in the engine config")
        sessions = SessionManager(settings, catalog)
        app.state.sessions = sessions
        legacy_spec = settings.engine(settings.legacy_engine) if settings.legacy_engine else settings.engines[0]
        app.state.legacy = legacy.EngineManager(legacy_spec.path, legacy.EngineConfig())
        reaper = asyncio.create_task(sessions.run_reaper())
        try:
            yield
        finally:
            reaper.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await reaper
            await sessions.close_all()
            await app.state.legacy.close()

    app = FastAPI(title="Chess trainer engine API", version="1.0.0", lifespan=lifespan)
    app.state.settings = settings
    origins = "|".join([LOCAL_ORIGIN, *(re.escape(o) for o in settings.allowed_origins)])
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=f"^({origins})$",
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type"],
        # Chrome's Private Network Access: a public origin on the list (chessapp.dev) may reach 127.0.0.1.
        allow_private_network=True,
        max_age=600,
    )
    app.include_router(v1.router)
    app.include_router(legacy.router)
    return app
