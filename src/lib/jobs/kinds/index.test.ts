import { describe, expect, it } from "vitest";
import type { JobKind, StepContext } from "@pgntools/jobs-runtime";

import en from "../../../locales/en";
import he from "../../../locales/he";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../../computerAnalysis";
import { JOB_ENTITY_TYPES } from "../entityTypes";
import { COMPUTER_ANALYSIS_ERRORS, COMPUTER_ANALYSIS_KIND } from "./computerAnalysis/core";
import { isRegisteredJobKind, jobKinds, jobKindLocaleKey, JOB_KIND_LOCALE_KEYS, RETIRED_JOB_KIND_LOCALE_KEYS } from ".";
import { DEFAULT_REPERTOIRE_EVALUATION_SETTINGS, REPERTOIRE_EVALUATION_KIND } from "./repertoireEvaluation/core";
import { REPERTOIRE_EVALUATION_ERRORS } from "./repertoireEvaluation/kind";
import { EVALUATE_POSITION_KIND } from "./evaluatePosition/core";
import { EVALUATE_POSITION_ERRORS } from "./evaluatePosition/kind";

/*
  **The kind registry's checklist, held** (CTA-221, `.claude/rules/jobs.md`):
  every registered kind has its words in both catalogs — its name, its
  description, its every error — names entity types the registry knows, and
  parses its own plan's state back as it planned it.
*/

const kinds = jobKinds();

/** A sample input each kind plans from. */
const SAMPLES: Record<string, unknown> = {
  [COMPUTER_ANALYSIS_KIND]: {
    source: { projectId: "p", caseId: "c", name: "A game", pgn: "1. e4 e5 2. Nf3 Nc6 *" },
    options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
    preset: { id: "", name: "", values: {} },
    target: { kind: "project", projectId: "p" },
  },
  [REPERTOIRE_EVALUATION_KIND]: {
    repertoireId: "r",
    name: "A repertoire",
    pgn: "1. d4 d5 2. c4 e6 (2... c6) *",
    engine: "stockfish-19-lite",
    preset: null,
    ...DEFAULT_REPERTOIRE_EVALUATION_SETTINGS,
  },
  [EVALUATE_POSITION_KIND]: {
    caseId: "c",
    name: "Evaluate position — A game, 1. White",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    path: [],
    label: "1. White",
    engine: "stockfish-19-lite",
    preset: null,
    search: { depth: 12, moveTimeMs: 1000, threads: 1, hashMb: 16, multiPv: 3 },
  },
};

/** Each kind's error codes — every one worded. */
const ERRORS: Record<string, readonly string[]> = {
  [COMPUTER_ANALYSIS_KIND]: COMPUTER_ANALYSIS_ERRORS,
  [REPERTOIRE_EVALUATION_KIND]: REPERTOIRE_EVALUATION_ERRORS,
  [EVALUATE_POSITION_KIND]: EVALUATE_POSITION_ERRORS,
};

const read = (catalog: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((node, key) => (typeof node === "object" && node !== null ? (node as Record<string, unknown>)[key] : undefined), catalog);

/** A step context the plan is never meant to use. */
const ctx = { jobId: "j", attempt: 1, signal: new AbortController().signal } as unknown as StepContext;

describe("the kind registry (CTA-221)", () => {
  it("registers each kind once, every one with a locale key", () => {
    expect(kinds.map((kind) => kind.id)).toEqual([COMPUTER_ANALYSIS_KIND, REPERTOIRE_EVALUATION_KIND, EVALUATE_POSITION_KIND]);
    expect(Object.keys(JOB_KIND_LOCALE_KEYS).sort()).toEqual(kinds.map((kind) => kind.id).sort());
  });

  it("retires the collection merge (CTA-232): not registered, its old name in both catalogs", () => {
    expect(kinds.map((kind) => kind.id)).not.toContain("library.collection-merge");
    expect(isRegisteredJobKind("library.collection-merge")).toBe(false);
    expect(isRegisteredJobKind(COMPUTER_ANALYSIS_KIND)).toBe(true);
    // A name the prototype carries is no kind.
    expect(isRegisteredJobKind("toString")).toBe(false);
    for (const [id, key] of Object.entries(RETIRED_JOB_KIND_LOCALE_KEYS)) {
      expect(JOB_KIND_LOCALE_KEYS[id]).toBeUndefined();
      for (const catalog of [en, he]) expect(typeof read(catalog, `jobs.retiredKinds.${key}`), id).toBe("string");
    }
  });

  it.each(kinds.map((kind) => [kind.id, kind] as const))("%s has its words in both catalogs — its name, its description, its every error", (id, kind) => {
    const key = jobKindLocaleKey(id);
    expect(key).toBeDefined();
    for (const catalog of [en, he]) {
      expect(typeof read(catalog, `jobs.kinds.${key}.name`)).toBe("string");
      expect(typeof read(catalog, `jobs.kinds.${key}.description`)).toBe("string");
      for (const code of ERRORS[kind.id] ?? []) expect(typeof read(catalog, `jobs.kinds.${key}.errors.${code}`), code).toBe("string");
    }
  });

  it.each(kinds.map((kind) => [kind.id, kind] as const))("%s applies to entity types the registry knows, each worded", (_id, kind) => {
    for (const type of kind.appliesTo) {
      expect(JOB_ENTITY_TYPES).toContain(type);
      expect(typeof read(en, `jobs.entities.${type}`)).toBe("string");
      expect(typeof read(he, `jobs.entities.${type}`)).toBe("string");
    }
  });

  it.each(kinds.map((kind) => [kind.id, kind] as const))("%s parses its own plan's state back — parseState(plan().state) round-trips", async (id, kind: JobKind<unknown, unknown>) => {
    const input = kind.parseInput(SAMPLES[id]);
    expect(input).toBeDefined();
    const planned = await kind.plan(input!, ctx);
    // As the store keeps it: a structured clone of the record.
    const stored = structuredClone(planned.state);
    expect(kind.parseState(stored, kind.version)).toEqual(planned.state);
    // A state of another version is re-planned, never misread.
    expect(kind.parseState(stored, kind.version + 1)).toBeUndefined();
  });
});
