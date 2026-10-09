"""The HTTP surface, against a real server: `/v1`, CORS, and the legacy routes."""

from __future__ import annotations

import json
from collections.abc import Iterator

import httpx
import pytest

from .conftest import AFTER_E4, CHECKMATED, START


@pytest.fixture(scope="module")
def client(server_url: str) -> Iterator[httpx.Client]:
    with httpx.Client(base_url=server_url, timeout=30) as client:
        yield client


@pytest.fixture
def session(client: httpx.Client) -> Iterator[str]:
    engine = client.get("/v1/engines").json()[0]["id"]
    response = client.post("/v1/sessions", json={"engine": engine})
    assert response.status_code == 201
    session_id = response.json()["session"]
    yield session_id
    client.delete(f"/v1/sessions/{session_id}")


def events_of(response: httpx.Response) -> list[dict]:
    return [json.loads(line) for line in response.iter_lines() if line]


def test_engines_list_each_engine_with_its_options_under_the_server_ceilings(client: httpx.Client):
    engines = client.get("/v1/engines").json()
    assert len(engines) == 1
    engine = engines[0]
    assert engine["name"].startswith("Stockfish")
    options = {o["name"]: o for o in engine["options"]}
    assert options["Threads"]["max"] == 2
    assert options["Hash"]["max"] == 64
    assert options["MultiPV"]["type"] == "spin"
    assert engine["limits"] == {"maxDepth": 30, "maxMovetimeMs": 600_000}
    assert client.get("/v1/health").json()["status"] == "ok"


def test_analyse_streams_ndjson(client: httpx.Client, session: str):
    body = {"fen": START, "limit": {"depth": 8}, "options": {"MultiPV": 2}}
    with client.stream("POST", f"/v1/sessions/{session}/analyse", json=body) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/x-ndjson")
        events = events_of(response)
    assert events[0] == {
        "type": "start",
        "fen": START,
        "engine": events[0]["engine"],
        "applied": {"MultiPV": 2},
        "refused": [],
    }
    assert events[-1]["type"] == "bestmove"
    assert {e["multipv"] for e in events if e["type"] == "info" and e.get("depth") == 8} == {1, 2}


def test_eval_answers_once_with_both_points_of_view_and_san(client: httpx.Client, session: str):
    body = {"fen": AFTER_E4, "limit": {"depth": 10}, "options": {"MultiPV": 3}}
    result = client.post(f"/v1/sessions/{session}/eval", json=body).json()
    assert result["turn"] == "black" and result["depth"] == 10 and not result["stopped"]
    assert len(result["lines"]) == 3
    for line in result["lines"]:
        assert line["scoreWhite"] == {k: -v for k, v in line["score"].items()}
        assert len(line["pvSan"]) == len(line["pv"])
    assert result["bestmove"] == result["lines"][0]["pv"][0]


def test_eval_prunes_only_when_asked(client: httpx.Client, session: str):
    body = {"fen": START, "limit": {"depth": 8}, "options": {"MultiPV": 20}}
    every = client.post(f"/v1/sessions/{session}/eval", json=body).json()["lines"]
    assert len(every) == 20
    pruned = client.post(f"/v1/sessions/{session}/eval", json={**body, "pruneWithinCp": 30}).json()["lines"]
    best = pruned[0]["score"]["cp"]
    assert 1 <= len(pruned) < 20
    assert all(best - line["score"]["cp"] <= 30 for line in pruned)


def test_eval_of_a_finished_game(client: httpx.Client, session: str):
    result = client.post(f"/v1/sessions/{session}/eval", json={"fen": CHECKMATED, "limit": {"depth": 5}}).json()
    assert result["isGameOver"] is True and result["bestmove"] is None


def test_a_client_that_hangs_up_stops_its_search(client: httpx.Client, session: str):
    body = {"fen": START, "limit": {"infinite": True}}
    with client.stream("POST", f"/v1/sessions/{session}/analyse", json=body) as response:
        for line in response.iter_lines():
            if '"score"' in line:
                break  # running — now hang up
    # Were it still running, this would wait behind it for good.
    result = client.post(f"/v1/sessions/{session}/eval", json={"fen": AFTER_E4, "limit": {"depth": 6}}, timeout=10)
    assert result.status_code == 200


@pytest.mark.parametrize(
    ("body", "status"),
    [
        ({"fen": "not a fen", "limit": {"depth": 5}}, 422),
        ({"fen": "8/8/8/8/8/8/8/8 w - - 0 1", "limit": {"depth": 5}}, 422),  # no kings
        ({"fen": START, "limit": {"infinite": True}}, 422),  # an eval must end
        ({"fen": START, "limit": {}}, 422),
        ({"fen": START, "limit": {"infinite": True, "depth": 5}}, 422),
    ],
)
def test_eval_refuses_what_it_cannot_search(client: httpx.Client, session: str, body: dict, status: int):
    assert client.post(f"/v1/sessions/{session}/eval", json=body).status_code == status


def test_unknown_engines_and_sessions(client: httpx.Client, session: str):
    assert client.post("/v1/sessions", json={"engine": "stockfish-9000"}).status_code == 404
    for method, path in [("POST", "/stop"), ("POST", "/eval"), ("POST", "/analyse"), ("DELETE", "")]:
        body = {"fen": START, "limit": {"depth": 1}} if path in ("/eval", "/analyse") else None
        response = client.request(method, f"/v1/sessions/nope{path}", json=body)
        assert response.status_code == 404, (method, path)
    assert client.delete(f"/v1/sessions/{session}").status_code == 204
    assert client.post(f"/v1/sessions/{session}/stop").status_code == 404


def test_stop_with_nothing_running(client: httpx.Client, session: str):
    assert client.post(f"/v1/sessions/{session}/stop").status_code == 204


@pytest.mark.parametrize(
    ("origin", "allowed"),
    [
        ("http://localhost:5173", True),
        ("http://127.0.0.1:4173", True),
        ("https://chessapp.dev", True),
        ("https://evil.example", False),
        ("https://chessapp.dev.evil.example", False),
    ],
)
def test_cors_lets_in_this_machine_and_the_configured_origins(client: httpx.Client, origin: str, allowed: bool):
    preflight = client.options(
        "/v1/engines",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
            "Access-Control-Request-Private-Network": "true",
        },
    )
    # A refused preflight is a 400 with no allow-origin — the browser blocks it, whatever else it carries.
    assert (preflight.status_code == 200) is allowed
    assert (preflight.headers.get("access-control-allow-origin") == origin) is allowed
    if allowed:
        assert preflight.headers.get("access-control-allow-private-network") == "true"
    simple = client.get("/v1/engines", headers={"Origin": origin})
    assert (simple.headers.get("access-control-allow-origin") == origin) is allowed


def test_the_legacy_routes_are_still_there(client: httpx.Client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/config").json()["multipv"] == 1


def test_seq_orders_requests_that_overtake_each_other(client: httpx.Client, session: str):
    late = client.post(f"/v1/sessions/{session}/analyse", json={"fen": START, "limit": {"depth": 4}, "seq": 2})
    assert [json.loads(l)["type"] for l in late.text.splitlines()][-1] == "bestmove"
    stale = client.post(f"/v1/sessions/{session}/analyse", json={"fen": START, "limit": {"depth": 4}, "seq": 1})
    assert [json.loads(l) for l in stale.text.splitlines()] == [{"type": "superseded", "fen": START}]
    assert client.post(f"/v1/sessions/{session}/stop", json={"seq": 3}).status_code == 204
    assert client.post(f"/v1/sessions/{session}/stop").status_code == 204  # no body: no seq
