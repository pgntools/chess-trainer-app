import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import { expectNoAxeViolations } from "../../test/axe";
import ComponentGalleryMain from "./ComponentGalleryMain";

/*
  The MDX editor's Components gallery (`/dev/mdx-editor/components`,
  CTA-140): every component an article embeds, picked from a tree, opened on
  a shipped sample — its settings a form over its code, the code to copy,
  the component rendered as an article renders it; the source switched to a
  pasted PGN, a Blog file or the Library. It writes nothing: `fetch` (the
  storage service) is never called.
*/

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../views/board/boardTestHarness");
  return reactChessboardMock();
});

const fetchSpy = vi.fn(async () => {
  throw new TypeError("Failed to fetch");
});
beforeEach(() => vi.stubGlobal("fetch", fetchSpy));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchSpy.mockClear();
});

const mount = () =>
  render(
    <MemoryRouter initialEntries={["/dev/mdx-editor/components"]}>
      <ComponentGalleryMain />
    </MemoryRouter>,
  );

const code = () => screen.getByRole("textbox", { name: "The code" });
const tree = () => screen.getByRole("tree", { name: "Components" });
const preview = () => screen.getByRole("region", { name: /^Preview/ });
const pick = async (user: ReturnType<typeof userEvent.setup>, name: string) => user.click(within(tree()).getByRole("treeitem", { name }));

describe("the Components gallery (CTA-140)", () => {
  it("opens on the first board, its sample read from the Blog's file — the code, the form and the preview", async () => {
    mount();
    expect(screen.getByRole("heading", { level: 1, name: "Components gallery" })).toBeInTheDocument();
    // Its folders, open: each a branch of the tree.
    const folders = within(tree()).getAllByRole("treeitem", { expanded: true });
    expect(folders).toHaveLength(5);
    ["Boards", "Tournament tables", "Images", "Other", "Future components"].forEach((title, index) => expect(folders[index]).toHaveTextContent(new RegExp(`^${title}\\d`)));
    expect(within(tree()).getByRole("treeitem", { name: "A PGN's game" })).toHaveAttribute("aria-current", "page");
    expect(code()).toHaveValue('import game from "./writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn?raw"\n\n<InlinePgnGame pgn={game} />');
    expect(screen.getByTestId("mdx-component-gallery-note")).toHaveTextContent("from the Blog's root, src/views/blog/articles/");
    // The sample, compiled with its import, rendered as an article renders it.
    await waitFor(() => expect(within(preview()).getByTestId("mdx-component-gallery-preview")).not.toHaveAttribute("aria-busy"), { timeout: 10_000 });
    expect(within(preview()).queryByTestId("mdx-component-gallery-preview-error")).not.toBeInTheDocument();
    expect(await within(preview()).findByRole("group", { name: /^The game, from The start to 42\. Rh6\+/ })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("writes the code from the form, and reads the form from the code typed", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("switch", { name: "Side lines" }));
    expect(code()).toHaveValue('import game from "./writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn?raw"\n\n<InlinePgnGame pgn={game} variations={false} />');
    fireEvent.change(code(), { target: { value: 'import game from "./writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn?raw"\n\n<InlinePgnGame pgn={game} caption="Hello" />' } });
    expect(screen.getByRole("textbox", { name: "Caption" })).toHaveValue("Hello");
    expect(screen.getByRole("switch", { name: "Side lines" })).toBeChecked();
  });

  it("picks an entry from the tree by the keyboard, and opens it on its own sample", async () => {
    const user = userEvent.setup();
    mount();
    within(tree()).getByRole("treeitem", { name: "A PGN's game" }).focus();
    // Down through the Boards to the Library game.
    await user.keyboard("{ArrowDown}{Enter}");
    expect(within(tree()).getByRole("treeitem", { name: "A Library game" })).toHaveAttribute("aria-current", "page");
    expect(code()).toHaveValue('<CollectionGameBoard game="/library/capablanca/1" />');
    expect(screen.getByRole("radio", { name: /^The sample — Capablanca, game 1/ })).toBeChecked();
    await pick(user, "Match");
    expect(code()).toHaveValue('import games from "./tournaments/clutchlegends26.pgn?raw"\n\n<MatchTable pgn={games} />');
  });

  it("switches the source: a pasted PGN written in, a Blog file, the Library by an address — and says when one does not fit", async () => {
    const user = userEvent.setup();
    mount();
    await pick(user, "Swiss standings");
    await user.click(screen.getByRole("radio", { name: "A PGN pasted here" }));
    expect(screen.getByTestId("mdx-component-gallery-waiting")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "The PGN" }), {
      target: { value: '[Event "M"]\n[White "A"]\n[Black "B"]\n[Round "1"]\n[Result "1-0"]\n\n1. e4 1-0\n\n[Event "M"]\n[White "B"]\n[Black "A"]\n[Round "2"]\n[Result "0-1"]\n\n1. d4 0-1' },
    });
    expect((code() as HTMLTextAreaElement).value).toMatch(/^export const games = `\[Event "M"\][\s\S]*`\n\n<SwissStandingsTable pgn=\{games\} density="dense" rowsPerPage="25" \/>$/);
    // Two players, every game theirs: a match, not a Swiss — said, the table still shown.
    expect(await screen.findByTestId("mdx-component-gallery-other-kind")).toHaveTextContent("The games look like a match");
    expect(screen.getByTestId("mdx-component-gallery-other-kind")).toHaveTextContent("try Match, <MatchTable>");

    await user.click(screen.getByRole("radio", { name: "A PGN beside the Blog's articles" }));
    expect(code()).toHaveValue('import games from "./tournaments/20th-werner-obermeyer-swiss-5r.pgn?raw"\n\n<SwissStandingsTable pgn={games} density="dense" rowsPerPage="25" />');

    // A Swiss table reads a PGN: a Library collection does not fit it.
    await user.click(screen.getByRole("radio", { name: /^The Library/ }));
    await user.type(screen.getByRole("textbox", { name: "The address" }), "/library/capablanca");
    await user.click(screen.getByRole("button", { name: "Look it up" }));
    expect(await screen.findByTestId("mdx-component-gallery-found")).toHaveTextContent("Found Capablanca — 1,035 games.");
    expect(screen.getByTestId("mdx-component-gallery-misfit")).toHaveTextContent("<SwissStandingsTable> does not read a whole Library collection: it reads a PGN.");
    expect(screen.queryByRole("textbox", { name: "The code" })).not.toBeInTheDocument();

    // The same address fits a collection's card.
    await pick(user, "A Library collection");
    await user.click(screen.getByRole("radio", { name: /^The Library/ }));
    await user.type(screen.getByRole("textbox", { name: "The address" }), "/library/tal");
    await user.click(screen.getByRole("button", { name: "Look it up" }));
    await waitFor(() => expect(code()).toHaveValue('<CollectionCard _id="/library/tal" />'));
    // An address that is none says so.
    await user.clear(screen.getByRole("textbox", { name: "The address" }));
    await user.type(screen.getByRole("textbox", { name: "The address" }), "/somewhere");
    await user.click(screen.getByRole("button", { name: "Look it up" }));
    expect(screen.getByRole("textbox", { name: "The address" })).toHaveAccessibleDescription(/^An address is a game's/);
  });

  it("copies the code, and writes nothing", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    mount();
    await pick(user, "The app's screens");
    expect(code()).toHaveValue("<NavCards />");
    expect(screen.getByTestId("mdx-component-gallery-settings-none")).toHaveTextContent("<NavCards> has no settings");
    await user.click(screen.getByRole("button", { name: "Copy the code" }));
    expect(writeText).toHaveBeenCalledWith("<NavCards />");
    expect(screen.getByTestId("mdx-component-gallery-copied")).toHaveTextContent("Copied — paste it into an article.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("opens an image on one beside the Blog's articles, and previews a file of the reader's without writing it", async () => {
    const user = userEvent.setup();
    Object.defineProperty(URL, "createObjectURL", { value: vi.fn(() => "blob:photo"), configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
    mount();
    await pick(user, "An image");
    expect(code()).toHaveValue('import photo from "./writing-an-article/sample-image.png"\n\n<ArticleImage src={photo} alt="A chessboard after 1. e4 e5 2. Nf3 Nc6 3. Bb5, beside the words Analysis Board" />');
    await user.click(screen.getByRole("switch", { name: "Rounded corners" }));
    expect((code() as HTMLTextAreaElement).value).toMatch(/ rounded \/>$/);

    await user.click(screen.getByRole("radio", { name: /^A file of your own/ }));
    await user.upload(screen.getByTestId("mdx-component-gallery-image-upload-input"), new File(["png"], "My photo.png", { type: "image/png" }));
    await waitFor(() => expect(code()).toHaveValue('import photo from "./My-photo.png"\n\n<ArticleImage src={photo} alt="…" />'));
    expect(screen.getByTestId("mdx-component-gallery-note")).toHaveTextContent("My-photo.png is shown from this browser alone — the gallery writes it nowhere.");
    expect(await within(preview()).findByRole("img", { name: "…" })).toHaveAttribute("src", "blob:photo");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows a component not built yet as a sketch and its code", async () => {
    const user = userEvent.setup();
    mount();
    await pick(user, "A puzzle — not built");
    expect(screen.getByTestId("mdx-component-gallery-mock")).toHaveTextContent("Not built yet");
    expect(code()).toHaveValue('import game from "./writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn?raw"\n\n<PuzzleBoard pgn={game} hideNextMoves />');
    expect(within(preview()).getByTestId("mdx-component-gallery-sketch")).toHaveTextContent("A puzzle — how it would look");
    await expectNoAxeViolations();
  });
});
