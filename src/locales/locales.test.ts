import { describe, expect, it } from "vitest";
import { navLabelKeys } from "../views/main/navTree";
import en from "./en";
import he from "./he";

/** Every leaf key, as dotted paths, so two catalogs can be compared directly. */
const leafKeys = (value: unknown, prefix = ""): string[] =>
  typeof value === "object" && value !== null
    ? Object.entries(value).flatMap(([key, child]) =>
        leafKeys(child, prefix ? `${prefix}.${key}` : key),
      )
    : [prefix];

const read = (catalog: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node as never)[part], catalog);

describe("translation catalogs", () => {
  it("ship the same keys in both languages", () => {
    // `he: typeof en` already makes a missing key a compile error. This catches
    // the other direction — a key added to `he` alone — and keeps the failure
    // legible when someone runs the suite before `tsc`.
    expect(leafKeys(he).sort()).toEqual(leafKeys(en).sort());
  });

  it("leaves no string untranslated in Hebrew", () => {
    // Identical by design: the brand mark and the file-format and opening-code
    // initialisms are written the same way in both languages, and language
    // names are always written in their own language.
    const identicalOnPurpose = new Set([
      "app.brandMark",
      // The site's name, a domain — written the same way in both languages (CTA-155).
      "app.brandText",
      "language.en",
      "language.he",
      "gamePanel.info.eco",
      // The Library table's headers: a number sign, and two initialisms.
      "library.table.columns.number",
      "library.table.columns.whiteElo",
      "library.table.columns.blackElo",
      "library.table.columns.eco",
      // The Lobby table's own Elo columns, the same two initialisms (CTA-100).
      "playedGames.table.columns.whiteElo",
      "playedGames.table.columns.blackElo",
      // Analysis V2's Cases table's, the same initialisms (CTA-186).
      "analysisV2.case.columns.whiteElo",
      "analysisV2.case.columns.blackElo",
      "analysisV2.case.columns.eco",
      // Its new-Case dialog's Position sources and FEN field: the initialism is the whole label.
      "analysisV2.newCase.fromFen",
      "analysisV2.newCase.fromPgn",
      "analysisV2.newCase.fen",
      "positionEditor.tabs.fen",
      "positionEditor.tabs.pgn",
      // A pairing, "White - Black": only the two names inside it translate.
      "playedGames.players",
      // A knockout's side read aloud, "name score" (CTA-128): nothing in it but the two values.
      "tournament.knockout.side",
      // The tournament-type suggestion's line, "type: reason." (CTA-142): the
      // two values and their punctuation, nothing to translate around them.
      "library.settings.suggestion.text",
      // The arrow palette named after the site whose colours it takes — a brand.
      "analysis.arrows.palettes.lichess",
      // The tournament tables' headers (CTA-120): a number sign, and the two
      // tie-breaks' initialisms — each read by its translated full name.
      "tournament.columns.rank",
      "tournament.columns.buchholz",
      "tournament.columns.sonnebornBerger",
      // Settings → Engine's heading for the engine server (CTA-198) — the initialism is the whole label.
      "settings.engine.connectors.api",
      // An engine's option with no default or range: a dash, in any language.
      "engineOptionsTable.none",
      // A preset's option's range, "min–max" (CTA-179): the two values and a dash.
      "enginePresets.range",
      // The Hash slider's sizes (CTA-185): a number and its unit, "4GB", "512MB" — the units written the same in Hebrew.
      "engineMenu.hashGb",
      "engineMenu.hashMb",
      // An arena game's words and what made its score (CTA-204): the two values and a comma.
      "tournament.arena.withNotes",
      // Resume's settings dialog's Hash value (CTA-236): a number and its unit, as the job's page writes it.
      "jobs.settingsChanged.megabytes",
      // The Accuracy Trainer's lines (CTA-238): a number sign for the rank, and a loss's bound, "≥ N".
      "accuracyTrainer.lines.rank",
      "accuracyTrainer.lines.lossAtLeast",
      // A move as a job's title names it, "12. White": the number and the translated side, nothing around them.
      "accuracyTrainer.session.moveLabel",
      // A move in the Case's answer comment, "1. Nf3 (#1, Best)": the values and their punctuation.
      "accuracyTrainer.session.answer.move",
      // A loss in the left panel's list, "−10": a sign and the value.
      "accuracyTrainer.details.lossShort",
    ]);

    const untranslated = leafKeys(en).filter(
      (key) =>
        !identicalOnPurpose.has(key) && read(en, key) === read(he, key),
    );

    expect(untranslated).toEqual([]);
  });

  it("covers every nav entry in both languages", () => {
    /*
      Read off the nav tree rather than listed by hand: the assertion is that
      the catalogs cover the navigation, and a hardcoded list only ever says
      they covered it on the day it was written. A screen *or a folder* added
      without its label still fails here, which is the point.
    */
    const keys = navLabelKeys();
    expect(keys.length).toBeGreaterThan(0);

    for (const labelKey of keys) {
      expect(read(en, labelKey), `en is missing ${labelKey}`).toBeTypeOf("string");
      expect(read(he, labelKey), `he is missing ${labelKey}`).toBeTypeOf("string");
    }
  });
});
