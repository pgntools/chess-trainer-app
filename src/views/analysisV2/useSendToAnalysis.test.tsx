import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";

import i18n from "../../i18n";
import { addAnalysisCases, analysisCasesSnapshot, loadAnalysisCases } from "../../lib/analysisCaseStore";
import { createAnalysisProject, loadAnalysisProjects } from "../../lib/analysisProjectStore";
import { positionCaseOfFen } from "../../lib/analysisProjects";
import { loadUploadedCollections, loadUploadedGames, resetLibraryCollectionStore } from "../../lib/libraryCollectionStore";
import { parsePgnTree } from "../../lib/pgn";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { useSendToAnalysis, type SendRequest } from "./useSendToAnalysis";

/*
  A game handed to Analysis (CTA-192) past a Project's limit of Cases
  (CTA-225): the hook behind every sender, driven by a probe button.
*/

const GAME = `[Event "Club Championship"]
[White "Carlsen"]
[Black "Caruana"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`;

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname}</div>;
}

function Sender({ request }: { request: SendRequest }) {
  const { send, dialog } = useSendToAnalysis("probe");
  return (
    <>
      <button type="button" onClick={() => send(request)}>
        Send
      </button>
      {dialog}
      <Where />
    </>
  );
}

const mount = (request: SendRequest) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/somewhere"]}>
        <Sender request={request} />
      </MemoryRouter>
    </AppThemeWithLang>,
  );

const where = () => screen.getByTestId("where").textContent;

/** One game, as the Library's picks send it: its tree and its PGN as stored. */
const ONE: SendRequest = { games: [{ tree: parsePgnTree(GAME), pgn: GAME }], projectName: "Club — 1 game", inLibrary: true };

/** A Project holding `count` Cases already. */
const projectOf = async (count: number) => {
  const project = (await createAnalysisProject("Studies", null))!;
  await addAnalysisCases(
    Array.from({ length: count }, (_, index) => positionCaseOfFen({ id: `k${index}`, projectId: project.id, name: "" }, "8/8/4k3/8/8/4K3/4P3/8 w - - 0 1")),
  );
  await Promise.all([loadAnalysisProjects(), loadAnalysisCases()]);
  return project;
};

/** Send, and choose `project` in the picker. */
const sendInto = async (user: ReturnType<typeof userEvent.setup>, projectId: string) => {
  await user.click(screen.getByRole("button", { name: "Send" }));
  const picker = await screen.findByTestId("probe");
  await user.click(within(picker).getByTestId(`probe-projects-${projectId}`));
  await user.click(within(picker).getByRole("button", { name: "Open" }));
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
  await resetLibraryCollectionStore();
});

describe("useSendToAnalysis past a Project's limit of cases (CTA-225)", () => {
  it("asks first when the chosen Project would pass 1,000 — games out of the Library said so", async () => {
    const project = await projectOf(1_000);
    const user = userEvent.setup();
    const { baseElement } = mount(ONE);
    await sendInto(user, project.id);
    const ask = await screen.findByRole("dialog", { name: "A large project" });
    expect(within(ask).getByTestId("probe-case-limit-message")).toHaveTextContent(
      "This game makes a case. With the 1,000 the project holds already, it would hold 1,001",
    );
    expect(within(ask).getByTestId("probe-case-limit-suggestion")).toHaveTextContent("These games are in the Library already.");
    await expectNoAxeViolations(baseElement);

    // Cancel: back to the picker, nothing written.
    await user.click(within(ask).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "A large project" })).toBeNull());
    expect(screen.getByTestId("probe")).toBeInTheDocument();
    expect(analysisCasesSnapshot()).toHaveLength(1_000);
  }, 60_000);

  it("writes the Cases past it on Create anyway", async () => {
    const project = await projectOf(1_000);
    const user = userEvent.setup();
    mount(ONE);
    await sendInto(user, project.id);
    await user.click(within(await screen.findByRole("dialog", { name: "A large project" })).getByRole("button", { name: "Create anyway" }));
    await waitFor(() => expect(where()).toMatch(new RegExp(`^/analysis/projects/${project.id}/cases/g`)));
    expect(analysisCasesSnapshot()).toHaveLength(1_001);
  }, 60_000);

  it("saves the games as a Library collection instead — as stored, no Case made, the picker closed", async () => {
    const project = await projectOf(1_000);
    const user = userEvent.setup();
    mount(ONE);
    await sendInto(user, project.id);
    await user.click(
      within(await screen.findByRole("dialog", { name: "A large project" })).getByRole("button", { name: "Save them as a Library collection instead" }),
    );
    await waitFor(() => expect(where()).toMatch(/^\/library\/u/));
    const [collection] = await loadUploadedCollections();
    expect(collection).toMatchObject({ name: "Club — 1 game", count: 1 });
    expect(await loadUploadedGames(collection.id)).toEqual([GAME]);
    expect(analysisCasesSnapshot()).toHaveLength(1_000);
    await waitFor(() => expect(screen.queryByTestId("probe")).toBeNull());
  }, 60_000);

  it("asks for a new Project of more than 1,000 games, and makes no Project for a collection", async () => {
    const many: SendRequest = {
      games: Array.from({ length: 1_001 }, () => ({ tree: parsePgnTree(GAME) })),
      projectName: "Bulk",
    };
    const user = userEvent.setup();
    mount(many);
    await user.click(screen.getByRole("button", { name: "Send" }));
    // A new Project is the picker's first choice, named as sent.
    await user.click(within(await screen.findByTestId("probe")).getByRole("button", { name: "Add 1001 cases" }));
    const ask = await screen.findByRole("dialog", { name: "A large project" });
    expect(within(ask).getByTestId("probe-case-limit-message")).toHaveTextContent("These games make 1,001 cases");
    expect(within(ask).getByRole("button", { name: "Create a Library collection instead" })).toBeInTheDocument();
    await user.click(within(ask).getByRole("button", { name: "Create a Library collection instead" }));
    await waitFor(() => expect(where()).toMatch(/^\/library\/u/), { timeout: 60_000 });
    expect((await loadUploadedCollections())[0]).toMatchObject({ name: "Bulk", count: 1_001 });
    expect(await loadAnalysisProjects()).toEqual([]);
    expect(await loadAnalysisCases()).toEqual([]);
  }, 90_000);

  it("opens no popup for a Project kept at 1,000", async () => {
    const project = await projectOf(999);
    const user = userEvent.setup();
    mount(ONE);
    await sendInto(user, project.id);
    await waitFor(() => expect(where()).toMatch(new RegExp(`^/analysis/projects/${project.id}/cases/g`)));
    expect(screen.queryByRole("dialog", { name: "A large project" })).toBeNull();
    expect(analysisCasesSnapshot()).toHaveLength(1_000);
  }, 60_000);
});
