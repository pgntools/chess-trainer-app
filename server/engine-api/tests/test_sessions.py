"""Sessions over a real engine: the stream, newest-wins, stop, options, the manager."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

import anyio
import pytest

from engine_api.config import Settings
from engine_api.engines import probe_all
from engine_api.sessions import Limit, Search, Session, SessionManager, SessionsFull
from engine_api.uci import UciOption

from .conftest import AFTER_E4, AFTER_E4_E5, CHECKMATED, START, small_settings

pytestmark = pytest.mark.anyio


@pytest.fixture
async def manager(settings: Settings) -> AsyncIterator[SessionManager]:
    manager = SessionManager(settings, await probe_all(settings))
    yield manager
    await manager.close_all()


@pytest.fixture
async def session(manager: SessionManager, settings: Settings) -> Session:
    return await manager.create(settings.engines[0].id)


async def drain(search: Search) -> list[dict]:
    events = []
    with anyio.fail_after(20):
        while (event := await search.events.get()) is not None:
            events.append(event)
    return events


async def first_info(search: Search) -> list[dict]:
    """Read until the search reports a scored line — it is running."""
    seen = []
    with anyio.fail_after(20):
        while True:
            event = await search.events.get()
            assert event is not None, seen
            seen.append(event)
            if event["type"] == "info" and "score" in event:
                return seen


def run(session: Session, fen: str, limit: Limit, **options) -> Search:
    return session.analyse(fen, fen, limit, options)


async def test_streams_start_infos_and_a_bestmove_stamped_with_the_fen(session: Session):
    events = await drain(run(session, START, Limit(depth=8)))
    assert events[0]["type"] == "start"
    assert events[-1]["type"] == "bestmove"
    assert events[-1]["stopped"] is False
    assert events[-1]["uci"].startswith("bestmove ")
    depths = [e["depth"] for e in events if e["type"] == "info" and "score" in e]
    assert depths and depths[-1] == 8 and depths == sorted(depths)
    assert all(e["fen"] == START for e in events)
    assert all(e["uci"].startswith("info") for e in events if e["type"] == "info")


async def test_a_new_search_stops_the_running_one_which_still_ends_with_bestmove(session: Session):
    first = run(session, START, Limit(infinite=True))
    await first_info(first)
    second = run(session, AFTER_E4, Limit(depth=6))
    rest = await drain(first)
    assert rest[-1]["type"] == "bestmove" and rest[-1]["stopped"] is True
    events = await drain(second)
    assert events[-1]["type"] == "bestmove" and events[-1]["stopped"] is False
    assert events[-1]["fen"] == AFTER_E4


async def test_a_search_still_waiting_is_superseded_and_never_starts(session: Session):
    running = run(session, START, Limit(infinite=True))
    await first_info(running)
    waiting = run(session, AFTER_E4, Limit(depth=6))
    newest = run(session, AFTER_E4_E5, Limit(depth=6))  # in the same tick: `waiting` never got the engine
    assert (await drain(running))[-1]["stopped"] is True
    assert await drain(waiting) == [{"type": "superseded", "fen": AFTER_E4}]
    assert (await drain(newest))[-1]["stopped"] is False


async def test_stop_ends_the_running_search_and_drops_a_waiting_one(session: Session):
    running = run(session, START, Limit(infinite=True))
    await first_info(running)
    waiting = run(session, AFTER_E4, Limit(depth=6))
    session.stop()
    assert (await drain(running))[-1]["stopped"] is True
    assert (await drain(waiting))[-1]["type"] == "superseded"
    assert not session.busy


async def test_an_abandoned_search_is_stopped_and_the_session_goes_on(session: Session):
    gone = run(session, START, Limit(infinite=True))
    await first_info(gone)
    session.abandon(gone)
    assert (await drain(gone))[-1]["stopped"] is True
    assert (await drain(run(session, AFTER_E4, Limit(depth=6))))[-1]["type"] == "bestmove"


async def test_a_game_that_is_over_answers_mate_0_and_no_move(session: Session):
    events = await drain(run(session, CHECKMATED, Limit(depth=10)))
    scored = [e for e in events if e["type"] == "info" and "score" in e]
    assert scored == [{"type": "info", "fen": CHECKMATED, "depth": 0, "score": {"mate": 0}, "uci": "info depth 0 score mate 0"}]
    assert events[-1]["bestmove"] == "(none)"


async def test_options_are_applied_capped_refused_and_sent_only_when_changed(session: Session):
    sent: list[str] = []
    send = session.process.send

    def spy(line: str) -> None:
        sent.append(line)
        send(line)

    session.process.send = spy  # type: ignore[method-assign]
    session.options["Pinned"] = UciOption(name="Pinned", type="spin", min=1, max=1)

    options = {"multipv": 2, "Threads": 99, "Hash": 100_000, "Clear Hash": True, "Pinned": 1, "Nope": 3}
    start = (await drain(session.analyse(START, START, Limit(depth=4), options)))[0]
    assert start["applied"] == {"MultiPV": 2, "Threads": 2, "Hash": 64}  # the server's ceilings
    assert start["refused"] == ["Clear Hash", "Pinned", "Nope"]
    assert [l for l in sent if l.startswith("setoption")] == [
        "setoption name MultiPV value 2",
        "setoption name Threads value 2",
        "setoption name Hash value 64",
    ]

    sent.clear()
    await drain(session.analyse(AFTER_E4, AFTER_E4, Limit(depth=4), {"MultiPV": 2, "Threads": 2, "Hash": 64}))
    assert not [l for l in sent if l.startswith("setoption")]  # a re-sent Hash would clear the memory

    sent.clear()
    await drain(session.analyse(AFTER_E4, AFTER_E4, Limit(depth=4), {"MultiPV": 1, "Hash": 64}))
    assert [l for l in sent if l.startswith("setoption")] == ["setoption name MultiPV value 1"]


async def test_two_lines_when_asked_for_two(session: Session):
    events = await drain(session.analyse(START, START, Limit(depth=8), {"MultiPV": 2}))
    final = [e for e in events if e["type"] == "info" and e.get("depth") == 8 and "score" in e]
    assert sorted(e["multipv"] for e in final) == [1, 2]


async def test_an_engine_that_dies_ends_the_search_with_an_error(manager: SessionManager, session: Session):
    search = run(session, START, Limit(infinite=True))
    await first_info(search)
    session.process._proc.kill()  # type: ignore[union-attr]
    events = await drain(search)
    assert events[-1]["type"] == "error"
    assert session.dead
    assert manager.get(session.id) is None


async def test_the_least_recently_used_idle_session_makes_room(manager: SessionManager, settings: Settings):
    engine = settings.engines[0].id
    oldest = await manager.create(engine)
    await asyncio.sleep(0.01)
    newer = await manager.create(engine)
    third = await manager.create(engine)  # the cap is 2
    assert manager.get(oldest.id) is None
    assert manager.get(newer.id) is newer and manager.get(third.id) is third


async def test_when_every_session_is_searching_there_is_no_room(manager: SessionManager, settings: Settings):
    engine = settings.engines[0].id
    searches = []
    for _ in range(2):
        session = await manager.create(engine)
        searches.append((session, run(session, START, Limit(infinite=True))))
    for _, search in searches:
        await first_info(search)
    with pytest.raises(SessionsFull):
        await manager.create(engine)
    for session, search in searches:
        session.stop()
        await drain(search)


async def test_an_idle_session_past_the_timeout_is_reaped(settings: Settings):
    quick = small_settings(settings.engines[0], idle_timeout_s=0.05)
    manager = SessionManager(quick, await probe_all(quick))
    try:
        session = await manager.create(quick.engines[0].id)
        await asyncio.sleep(0.1)
        await manager.reap()
        assert manager.get(session.id) is None
        assert len(manager) == 0
    finally:
        await manager.close_all()


async def test_a_search_overtaken_by_a_newer_one_is_superseded_and_stops_nothing(session: Session):
    newer = session.analyse(AFTER_E4, AFTER_E4, Limit(infinite=True), {}, seq=2)
    await first_info(newer)
    late = session.analyse(START, START, Limit(depth=6), {}, seq=1)  # sent first, arrived second
    assert await drain(late) == [{"type": "superseded", "fen": START}]
    assert session.current is newer  # still searching
    session.stop(seq=3)
    assert (await drain(newer))[-1]["stopped"] is True


async def test_a_stop_overtaken_by_a_newer_search_does_not_stop_it(session: Session):
    newer = session.analyse(AFTER_E4, AFTER_E4, Limit(depth=8), {}, seq=5)
    session.stop(seq=4)  # the stop for the previous search, arriving late
    events = await drain(newer)
    assert events[-1]["type"] == "bestmove" and events[-1]["stopped"] is False
