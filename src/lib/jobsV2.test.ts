import { describe, expect, it } from "vitest";

import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type PositionResult } from "./computerAnalysis";
import { findNode, mainline, treeToPgn } from "./gameTree";
import {
  jobV2AnalysisOf,
  jobV2From,
  jobV2MergedPgn,
  jobV2Of,
  jobV2OfCase,
  jobV2OutputName,
  withCheckpointV2,
  type JobV2,
  type JobV2Request,
} from "./jobsV2";
import { parsePgnTree } from "./pgn";

const PGN = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6 *';
const AT = new Date("2026-10-12T12:00:00Z");

const request = (patch: Partial<JobV2Request> = {}): JobV2Request => ({
  source: { projectId: "p", caseId: "c", name: " Alice – Bob ", pgn: PGN },
  options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
  preset: { id: "deep", name: "Deep", values: { "Move Overhead": 250 } },
  target: { kind: "project", projectId: "p" },
  ...patch,
});

/** Every position checkpointed at +0.20 for White, line 1 the first legal reply in the game. */
const finished = (job: JobV2): JobV2 =>
  job.positions.reduce<JobV2>((done, position, index) => {
    const result: PositionResult = { fen: position.fen, lines: [{ score: { kind: "cp", value: 20 }, depth: 20, pv: [] }] };
    return withCheckpointV2(done, index, result, AT);
  }, job);

describe("Jobs V2, the record (CTA-188)", () => {
  it("queues a Case's request: its positions, an empty checkpoint, the preset and the target as given", () => {
    const job = jobV2Of("j", request(), AT)!;
    expect(job).toMatchObject({
      id: "j",
      status: "queued",
      source: { projectId: "p", caseId: "c", name: "Alice – Bob" },
      preset: { id: "deep", name: "Deep", values: { "Move Overhead": 250 } },
      target: { kind: "project", projectId: "p" },
      engine: null,
      outputs: [],
    });
    expect(job.positions.length).toBe(5);
    expect(job.checkpoint).toEqual([null, null, null, null, null]);
  });

  it("refuses a request with nothing to run, and a merge into the Case with more than one variant", () => {
    expect(jobV2Of("j", request({ options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: [] } }))).toBeUndefined();
    expect(jobV2Of("j", request({ source: { projectId: "p", caseId: "c", name: "x", pgn: "*" } }))).toBeUndefined();
    const two = { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light", "full"] as const };
    expect(jobV2Of("j", request({ target: { kind: "case" }, options: { ...two, outputs: [...two.outputs] } }))).toBeUndefined();
    expect(jobV2Of("j", request({ target: { kind: "case" } }))?.target).toEqual({ kind: "case" });
  });

  it("names an output Case after its source", () => {
    expect(jobV2OutputName("Alice – Bob", "full")).toBe("Alice – Bob - computer analysis (full)");
  });

  it("reads a stored record back, and drops one without its Case", () => {
    const job = jobV2Of("j", request(), AT)!;
    expect(jobV2From(JSON.parse(JSON.stringify(job)))).toEqual(job);
    expect(jobV2From({ ...job, source: { ...job.source, caseId: "" } })).toBeUndefined();
    expect(jobV2From({ ...job, kind: "other" })).toBeUndefined();
    // An unknown status reads as interrupted; a target that will not read as new Cases beside the source.
    expect(jobV2From({ ...job, status: "weird", target: { kind: "other" } })).toMatchObject({
      status: "interrupted",
      target: { kind: "project", projectId: "p" },
    });
    expect(jobV2From({ ...job, preset: undefined })?.preset).toEqual({ id: "", name: "", values: {} });
    // A row from before the rename (CTA-188's branch): `linked` is another Project.
    expect(jobV2From({ ...job, target: { kind: "linked", projectId: "p2" } })?.target).toEqual({ kind: "other", projectId: "p2" });
  });

  it("annotates whatever tree it is given, keeping the reader's moves, side lines and comments", () => {
    const job = { ...finished(jobV2Of("j", request(), AT)!), engine: { id: "sf", name: "Stockfish 19 Lite", version: "19" } };
    // The Case as it stands now: a comment and a side line of the reader's own, added since the job was sent.
    const now = parsePgnTree(`${PGN.replace("2. Nf3", "2. Nf3 {my plan}").replace(" Nc6", " Nc6 (2... d6 {solid})")}`);
    const merged = jobV2AnalysisOf(job, now, "light");
    const line = mainline(merged);
    expect(line.map((node) => node.san)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(line[2].comments?.some((text) => text.includes("my plan"))).toBe(true);
    expect(line.every((node) => node.comments?.some((text) => text.includes("[%eval")))).toBe(true);
    // The side line stays, comment and all — and the reader's nodes keep their ids.
    const side = findNode(merged, line[2].id)?.children[1];
    expect(side?.san).toBe("d6");
    expect(side?.comments).toEqual(["solid"]);
    expect(line[0].id).toBe(mainline(now)[0].id);
    expect(merged.headers.Annotator).toBe("Stockfish 19 Lite [light]");
  });

  it("merges into a PGN as a PGN edit, the one variant asked", () => {
    const job = finished(jobV2Of("j", request({ target: { kind: "case" } }), AT)!);
    const merged = jobV2MergedPgn(job, PGN);
    expect(merged).toContain("[%eval");
    expect(jobV2MergedPgn(job, "1. e4 e5 *")).toContain("[%eval");
    expect(treeToPgn(parsePgnTree(merged!))).toBe(merged);
  });

  it("finds the job a Case's New job leads to: the newest unfinished, else done, else the newest", () => {
    const of = (id: string, caseId: string, status: JobV2["status"]): JobV2 => ({ ...jobV2Of(id, request(), AT)!, status, source: { ...jobV2Of(id, request())!.source, caseId } });
    const jobs = [of("4", "c", "failed"), of("3", "c", "done"), of("2", "c", "paused"), of("1", "other", "queued")];
    expect(jobV2OfCase(jobs, "c")?.id).toBe("2");
    expect(jobV2OfCase(jobs.slice(0, 2), "c")?.id).toBe("3");
    expect(jobV2OfCase(jobs.slice(0, 1), "c")?.id).toBe("4");
    expect(jobV2OfCase(jobs, "none")).toBeUndefined();
    expect(jobV2OfCase(undefined, "c")).toBeUndefined();
  });
});
