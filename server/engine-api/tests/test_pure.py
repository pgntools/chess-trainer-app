"""The parsers, the option rules and the config — no engine."""

from __future__ import annotations

import pytest

from engine_api.config import ConfigError, EngineSpec, Settings, settings_from
from engine_api.engines import capped, version_of
from engine_api.sessions import Limit, go_command, wire_value
from engine_api.uci import UciOption, parse_bestmove, parse_info, parse_option

SETTINGS = Settings(engines=(EngineSpec(id="sf", path="/bin/sf"),), max_threads=4, max_hash_mb=256, max_depth=50)


class TestParseOption:
    def test_spin_with_a_name_of_two_words(self):
        assert parse_option("option name Skill Level type spin default 20 min 0 max 20") == UciOption(
            name="Skill Level", type="spin", default="20", min=0, max=20
        )

    def test_check_button_and_string(self):
        assert parse_option("option name Ponder type check default false") == UciOption(
            name="Ponder", type="check", default="false"
        )
        assert parse_option("option name Clear Hash type button") == UciOption(name="Clear Hash", type="button")
        assert parse_option("option name Debug Log File type string default <empty>").default == "<empty>"

    def test_combo_values(self):
        option = parse_option("option name Style type combo default Normal var Solid var Normal var Risky Play")
        assert option is not None
        assert option.vars == ("Solid", "Normal", "Risky Play")

    def test_not_an_option(self):
        assert parse_option("id name Stockfish 19") is None
        assert parse_option("option name Broken") is None

    def test_settable(self):
        assert UciOption(name="Threads", type="spin", min=1, max=1024).settable
        assert not UciOption(name="Threads", type="spin", min=1, max=1).settable  # pinned
        assert not UciOption(name="Clear Hash", type="button").settable


class TestParseInfo:
    def test_a_search_line(self):
        line = (
            "info depth 18 seldepth 24 multipv 2 score cp -31 upperbound nodes 1200 nps 400000 "
            "hashfull 12 tbhits 0 time 3 pv e7e5 g1f3"
        )
        assert parse_info(line) == {
            "depth": 18,
            "seldepth": 24,
            "multipv": 2,
            "score": {"cp": -31},
            "bound": "upper",
            "nodes": 1200,
            "nps": 400000,
            "hashfull": 12,
            "tbhits": 0,
            "timeMs": 3,
            "pv": ["e7e5", "g1f3"],
        }

    def test_mate_and_game_over(self):
        assert parse_info("info depth 0 score mate 0") == {"depth": 0, "score": {"mate": 0}}
        assert parse_info("info depth 5 score mate -2 pv a1a2")["score"] == {"mate": -2}

    def test_string_and_currmove(self):
        assert parse_info("info string Using 4 threads") == {"string": "Using 4 threads"}
        assert parse_info("info depth 30 currmove e2e4 currmovenumber 1") == {
            "depth": 30,
            "currmove": "e2e4",
            "currmovenumber": 1,
        }

    def test_bestmove(self):
        assert parse_bestmove("bestmove e2e4 ponder e7e5") == ("e2e4", "e7e5")
        assert parse_bestmove("bestmove (none)") == ("(none)", None)


class TestOptions:
    def test_threads_and_hash_are_capped_by_the_server(self):
        threads = UciOption(name="Threads", type="spin", default="1", min=1, max=1024)
        hash_ = UciOption(name="Hash", type="spin", default="16", min=1, max=33554432)
        assert capped(threads, SETTINGS).max == 4
        assert capped(hash_, SETTINGS).max == 256
        multipv = UciOption(name="MultiPV", type="spin", min=1, max=256)
        assert capped(multipv, SETTINGS) is multipv

    def test_wire_values(self):
        spin = UciOption(name="MultiPV", type="spin", min=1, max=256)
        assert wire_value(spin, 3) == "3"
        assert wire_value(spin, "3") == "3"
        assert wire_value(spin, 999) == "256"
        assert wire_value(spin, 0) == "1"
        assert wire_value(spin, "lots") is None
        assert wire_value(spin, True) is None

        check = UciOption(name="UCI_LimitStrength", type="check")
        assert wire_value(check, True) == "true"
        assert wire_value(check, "FALSE") == "false"
        assert wire_value(check, 1) is None

        combo = UciOption(name="Style", type="combo", vars=("Solid", "Risky"))
        assert wire_value(combo, "risky") == "Risky"
        assert wire_value(combo, "Wild") is None

        string = UciOption(name="SyzygyPath", type="string")
        assert wire_value(string, "/tb") == "/tb"
        assert wire_value(string, "/tb\nquit") is None  # never a second command

    def test_go_command(self):
        assert go_command(Limit(infinite=True), SETTINGS) == "go infinite"
        assert go_command(Limit(depth=20), SETTINGS) == "go depth 20"
        assert go_command(Limit(depth=200), SETTINGS) == "go depth 50"
        assert go_command(Limit(depth=20, movetime_ms=500), SETTINGS) == "go depth 20 movetime 500"
        assert go_command(Limit(movetime_ms=10_000_000), SETTINGS) == "go movetime 600000"
        assert go_command(Limit(), SETTINGS) == "go depth 50"

    def test_version_of(self):
        assert version_of("Stockfish 18") == "18"
        assert version_of("Stockfish 17.1") == "17.1"
        assert version_of("Stockfish dev-20260101-abc") is None


class TestConfig:
    def test_reads_engines_and_limits(self):
        settings = settings_from(
            {
                "engines": [{"id": "a", "path": "/a"}, {"id": "b", "path": "/b", "name": "B"}],
                "maxSessions": 3,
                "allowedOrigins": ["https://chessapp.dev/"],
                "legacyEngine": "b",
            }
        )
        assert [e.id for e in settings.engines] == ["a", "b"]
        assert settings.max_sessions == 3
        assert settings.allowed_origins == ("https://chessapp.dev",)
        assert settings.engine("b") == EngineSpec(id="b", path="/b", name="B")

    @pytest.mark.parametrize(
        "data",
        [
            {},
            {"engines": []},
            {"engines": [{"id": "a"}]},
            {"engines": [{"id": "a", "path": "/a"}, {"id": "a", "path": "/b"}]},
            {"engines": [{"id": "a", "path": "/a"}], "legacyEngine": "z"},
        ],
    )
    def test_refuses_a_bad_config(self, data):
        with pytest.raises(ConfigError):
            settings_from(data)
