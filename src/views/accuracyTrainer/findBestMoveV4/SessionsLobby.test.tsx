import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

import i18n from "../../../i18n";
import { addAnalysisCases, loadAnalysisCases } from "../../../lib/analysisCaseStore";
import { gameCaseOf } from "../../../lib/analysisProjects";
import { createAnalysisProject } from "../../../lib/analysisProjectStore";
import { sessionEvents as e } from "../../../lib/findBestMove/reducer";
import { sessionTreeOf } from "../../../lib/findBestMove/store";
import { parsePgnTree, readPgnTags } from "../../../lib/pgn";
import { expectNoAxeViolations } from "../../../test/axe";
import { PLAIN_WORDS, applied, sessionOfPgn } from "../../../test/findBestMoveKit";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { RightPanelOutlet, RightPanelProvider } from "../../main/rightPanel";

// The browser's download, caught: what a row's Download PGN hands it.
const downloaded = vi.hoisted(() => ({ pgns: [] as string[] }));
vi.mock("../../../lib/pgnExport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/pgnExport")>()),
  downloadPgn: (_stem: string, pgns: readonly string[]) => {
    downloaded.pgns.push(...pgns);
    return true;
  },
}));

import SessionsLobby from "./SessionsLobby";

/* Find Best Move's sessions lobby (CTA-239; v4's, CTA-244): every Case of the Find Best Move project, its session read from its tags — and the New session form beside it (its own tests: `FindBestMove.test.tsx`). */

const ANALYSED = `[White "Alice"]
[Black "Bob"]

1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] }) 1... e5 { [%eval 0.30,20] } (1... c5 { [%eval 0.35,20] }) 2. Nf3 *`;

/** A session's tree: its first position answered with `answer`, or none. */
const sessionTree = (answer?: readonly string[]) => {
  // Both sides: White's 1. e4 and Black's 1... e5.
  const started = sessionOfPgn(ANALYSED);
  const record = answer === undefined ? started : applied(started, [e.answer(1, answer)]);
  return sessionTreeOf(record, readPgnTags(ANALYSED), PLAIN_WORDS);
};

const seed = async () => {
  const project = (await createAnalysisProject("Find Best Move", null))!;
  const other = (await createAnalysisProject("Openings", null))!;
  await addAnalysisCases([
    gameCaseOf({ id: "fresh", projectId: project.id, name: "Fresh", now: new Date("2026-10-19T10:00:00Z") }, sessionTree()),
    gameCaseOf({ id: "going", projectId: project.id, name: "Going", now: new Date("2026-10-18T10:00:00Z") }, sessionTree(["e4", "d4"])),
    gameCaseOf({ id: "plain", projectId: project.id, name: "By hand", now: new Date("2026-10-17T10:00:00Z") }, parsePgnTree(ANALYSED)),
    gameCaseOf(
      { id: "older", projectId: project.id, name: "Older", now: new Date("2026-10-16T10:00:00Z") },
      parsePgnTree(`[FindBestMove "1"]\n\n1. e4 { [%fbm game:e4 state:open] } *`),
    ),
    gameCaseOf({ id: "elsewhere", projectId: other.id, name: "Elsewhere" }, sessionTree()),
  ]);
  return project;
};

const mount = () =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/accuracy-trainer/find-best-move-v4"]}>
        <RightPanelProvider>
          <Routes>
            <Route path="/accuracy-trainer/find-best-move-v4" element={<SessionsLobby />} />
            <Route path="/accuracy-trainer/find-best-move-v4/:caseId" element={<p>The session</p>} />
          </Routes>
          <RightPanelOutlet />
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

const listed = () => screen.getAllByTestId(/^find-best-move-sessions-table-row-/).map((row) => row.dataset.testid?.slice("find-best-move-sessions-table-row-".length));

beforeEach(async () => {
  await i18n.changeLanguage("en");
  downloaded.pgns = [];
});

describe("Find Best Move's sessions lobby (CTA-239, CTA-244)", () => {
  it("lists the Find Best Move project's sessions, newest first — a Case that is no session, and an older session, said so", async () => {
    await seed();
    mount();
    expect(await screen.findByTestId("find-best-move-sessions-table-row-fresh")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /Find Best Move sessions/ })).toBeInTheDocument();
    expect(screen.getByTestId("find-best-move-sessions-header-count")).toHaveTextContent("4 sessions");
    expect(listed()).toEqual(["fresh", "going", "plain", "older"]);
    const going = within(screen.getByTestId("find-best-move-sessions-table-row-going")).getAllByRole("cell");
    expect(going[2]).toHaveTextContent("Both");
    expect(going[4]).toHaveTextContent("1/21 answered, 0 passed");
    expect(going[5]).toHaveTextContent("2/22 in place");
    expect(screen.getByTestId("find-best-move-sessions-table-status-going")).toHaveTextContent("Ongoing");
    expect(screen.getByTestId("find-best-move-sessions-table-note-plain")).toHaveTextContent("By hand holds no session");
    expect(screen.getByTestId("find-best-move-sessions-table-note-older")).toHaveTextContent("Older is an older Find Best Move session (v3)");
    expect(screen.queryByRole("link", { name: "Open the session Older" })).not.toBeInTheDocument();
    // The New session form beside the table.
    expect(screen.getByRole("heading", { level: 2, name: "New session" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("resumes a session from its row, and opens any row's Case in Analysis", async () => {
    const project = await seed();
    const user = userEvent.setup();
    mount();
    expect(await screen.findByRole("link", { name: "Open By hand in Analysis" })).toHaveAttribute("href", `/analysis/projects/${project.id}/cases/plain`);
    await user.click(screen.getByRole("link", { name: "Open the session Going" }));
    expect(screen.getByText("The session")).toBeInTheDocument();
  });

  it("downloads a row's PGN — a session's projected from its record, any other Case's as kept", async () => {
    await seed();
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole("button", { name: "Download the PGN of Going" }));
    expect(downloaded.pgns[0]).toContain('[FindBestMove "2"]');
    expect(downloaded.pgns[0]).toContain("Find Best Move: 1. e4 (#1, Best), 2. d4 (#2, Good) — 2 of the top 2, 2 in place");
    await user.click(screen.getByRole("button", { name: "Download the PGN of Older" }));
    expect(downloaded.pgns[1]).toBe((await loadAnalysisCases()).find((each) => each.id === "older")?.pgn);
  });

  it("deletes the picked sessions after one confirmation", async () => {
    await seed();
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole("checkbox", { name: "Pick Fresh" }));
    await user.click(screen.getByRole("checkbox", { name: "Pick By hand" }));
    await user.click(screen.getByRole("button", { name: "Delete picked (2)" }));
    const dialog = screen.getByRole("dialog", { name: "Delete 2 picked sessions?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(listed()).toEqual(["going", "older"]));
    expect((await loadAnalysisCases()).map((each) => each.id).sort()).toEqual(["elsewhere", "going", "older"]);
    expect(screen.queryByRole("button", { name: /Delete picked/ })).not.toBeInTheDocument();
  });

  it("says there is no session before the first", async () => {
    mount();
    expect(await screen.findByTestId("find-best-move-sessions-table-empty")).toHaveTextContent("No session yet");
  });
});
