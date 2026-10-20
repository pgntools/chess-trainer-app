import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

import i18n from "../../../i18n";
import { trainingPositionsOf } from "../../../lib/accuracyTrainer";
import { addAnalysisCases, loadAnalysisCases } from "../../../lib/analysisCaseStore";
import { gameCaseOf } from "../../../lib/analysisProjects";
import { createAnalysisProject } from "../../../lib/analysisProjectStore";
import { answerPosition, sessionBaseTree, startSession } from "../../../lib/findBestMoveSession";
import { withSessionRecord } from "../../../lib/findBestMoveSessionPgn";
import { parsePgnTree } from "../../../lib/pgn";
import { expectNoAxeViolations } from "../../../test/axe";
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

/* Find Best Move's sessions lobby (CTA-239): every Case of the Find Best Move project, its session read from its PGN — and the New session form beside it (its own tests: `FindBestMoveV3.test.tsx`). */

const ANALYSED = `[White "Alice"]
[Black "Bob"]

1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] }) 1... e5 { [%eval 0.30,20] } (1... c5 { [%eval 0.35,20] }) 2. Nf3 *`;

/** A session's tree: its first position answered with `answer`, or none. */
const sessionTree = (answer?: readonly string[]) => {
  const source = parsePgnTree(ANALYSED);
  const base = sessionBaseTree(source);
  const started = startSession({ caseRef: { projectId: "", caseId: "" }, side: "w", game: "Alice – Bob", positions: trainingPositionsOf(source), wanted: 2, tree: base })!;
  const session = answer === undefined ? started : answerPosition(started, answer);
  return withSessionRecord(base, { ...session, engine: false, showArrows: true });
};

const seed = async () => {
  const project = (await createAnalysisProject("Find Best Move", null))!;
  const other = (await createAnalysisProject("Openings", null))!;
  await addAnalysisCases([
    gameCaseOf({ id: "fresh", projectId: project.id, name: "Fresh", now: new Date("2026-10-19T10:00:00Z") }, sessionTree()),
    gameCaseOf({ id: "going", projectId: project.id, name: "Going", now: new Date("2026-10-18T10:00:00Z") }, sessionTree(["e4", "d4"])),
    gameCaseOf({ id: "plain", projectId: project.id, name: "By hand", now: new Date("2026-10-17T10:00:00Z") }, parsePgnTree(ANALYSED)),
    gameCaseOf({ id: "elsewhere", projectId: other.id, name: "Elsewhere" }, sessionTree()),
  ]);
  return project;
};

const mount = () =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/accuracy-trainer/find-best-move-v3"]}>
        <RightPanelProvider>
          <Routes>
            <Route path="/accuracy-trainer/find-best-move-v3" element={<SessionsLobby />} />
            <Route path="/accuracy-trainer/find-best-move-v3/:caseId" element={<p>The session</p>} />
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

describe("Find Best Move's sessions lobby (CTA-239)", () => {
  it("lists the Find Best Move project's sessions, newest first — a Case that is no session said so", async () => {
    await seed();
    mount();
    expect(await screen.findByTestId("find-best-move-sessions-table-row-fresh")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /Find Best Move sessions/ })).toBeInTheDocument();
    expect(screen.getByTestId("find-best-move-sessions-header-count")).toHaveTextContent("3 sessions");
    expect(listed()).toEqual(["fresh", "going", "plain"]);
    const going = within(screen.getByTestId("find-best-move-sessions-table-row-going")).getAllByRole("cell");
    expect(going[2]).toHaveTextContent("White");
    expect(going[4]).toHaveTextContent("1/21 answered, 0 passed");
    expect(going[5]).toHaveTextContent("2/22 in place");
    expect(screen.getByTestId("find-best-move-sessions-table-status-going")).toHaveTextContent("Ongoing");
    expect(screen.getByTestId("find-best-move-sessions-table-note-plain")).toHaveTextContent("By hand holds no session");
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

  it("downloads a row's PGN — its Case's own", async () => {
    await seed();
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole("button", { name: "Download the PGN of Going" }));
    const stored = (await loadAnalysisCases()).find((each) => each.id === "going");
    expect(downloaded.pgns).toEqual([stored?.pgn]);
    expect(downloaded.pgns[0]).toContain('[FindBestMove "1"]');
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
    await waitFor(() => expect(listed()).toEqual(["going"]));
    expect((await loadAnalysisCases()).map((each) => each.id).sort()).toEqual(["elsewhere", "going"]);
    expect(screen.queryByRole("button", { name: /Delete picked/ })).not.toBeInTheDocument();
  });

  it("says there is no session before the first", async () => {
    mount();
    expect(await screen.findByTestId("find-best-move-sessions-table-empty")).toHaveTextContent("No session yet");
  });
});
