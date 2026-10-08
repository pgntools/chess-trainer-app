import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { downloadTextFile } from "../../lib/pgnExport";
import { starterFrontmatter, todayIso } from "./metadataYaml";
import { expectNoAxeViolations } from "../../test/axe";
import { resetLibrary } from "../../views/library/libraryTestKit";
import Main from "./Main";

/*
  The MDX editor (`/dev/mdx-editor/edit`, CTA-135, CTA-137): MDX typed on
  the left is compiled in the browser and rendered on the right with the
  components every article embeds — the Library's data and all; a document
  that will not compile keeps the last one that did, a component that
  throws is contained. It saves, lists, edits and adds the article's PGNs,
  components and images (a section each), and deletes, through its storage service — `fetch` stands in for it here,
  down unless a test starts it (`stubService`).
*/

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../views/board/boardTestHarness");
  return reactChessboardMock();
});

vi.mock("../../lib/pgnExport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/pgnExport")>()),
  downloadTextFile: vi.fn(() => true),
}));

/** Where the router is — the editor drops `?article=` and `?new` once it has done what they ask. */
function Where() {
  const location = useLocation();
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

const mount = (entry = "/dev/mdx-editor/edit") =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/dev/mdx-editor/edit"
          element={
            <>
              <Main />
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

const WERNER = "/dev/mdx-editor/edit?article=tournaments%2Fwerner-obermeyer-swiss-2026";
// Hidden from the accessibility tree too — behind an open dialog, which a section's test reads it through.
const source = () => screen.getByRole("textbox", { name: "MDX source", hidden: true });
const metadataTab = () => screen.getByRole("tab", { name: "Metadata" });
const contentTab = () => screen.getByRole("tab", { name: "Content" });
const preview = () => screen.getByRole("region", { name: "Preview" });
/** Replace the whole document, as a paste would. */
const setSource = (text: string) => fireEvent.change(source(), { target: { value: text } });
/** One of the header's More menu's entries. */
const more = async (user: ReturnType<typeof userEvent.setup>, entry: string) => {
  await user.click(screen.getByRole("button", { name: "More" }));
  await user.click(await screen.findByRole("menuitem", { name: entry }));
  // The menu closes with a transition: the next one opens on a page without it.
  await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
};
/** The dialogs close with a transition: wait until none is left. */
const noDialog = () => waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

/*
  The storage service (`yarn mdx-editor:start`) as `fetch` sees it: the
  files it holds (a path under articles/ → its text), what git has not got,
  whether it is up — and every write and delete it was asked for.
*/
type GitFile = { path: string; state: "new" | "changed" | "deleted" | "renamed"; bytes?: number };
type Service = {
  up: boolean;
  files: Map<string, string>;
  git: GitFile[];
  writes: { path: string; content: string; overwrite: boolean; encoding?: string }[];
  deletes: { paths: string[]; folders: string[] }[];
};

const folderOf = (path: string) => path.split("/").slice(0, -1).join("/");

const stubService = (files: Record<string, string> = {}, git: GitFile[] = []): Service => {
  const service: Service = { up: true, files: new Map(Object.entries(files)), git, writes: [], deletes: [] };
  const reply = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body }) as Response;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (!service.up) throw new TypeError("Failed to fetch");
      const { pathname, searchParams } = new URL(url);
      const method = init?.method ?? "GET";
      if (pathname === "/folders") {
        const folders = new Map<string, string[]>([["", []]]);
        for (const path of [...service.files.keys()].sort()) {
          const parts = path.split("/");
          for (let depth = 1; depth < parts.length; depth += 1) if (!folders.has(parts.slice(0, depth).join("/"))) folders.set(parts.slice(0, depth).join("/"), []);
          folders.get(folderOf(path))?.push(parts.at(-1) ?? "");
        }
        return reply(200, {
          folders: [...folders].map(([path, names]) => ({ path, ...(path === "tournaments" ? { title: "Tournaments" } : {}), files: names, articles: {}, others: [] })),
        });
      }
      if (pathname === "/git-status") return reply(200, { available: true, branch: "feature/x", files: service.git });
      if (pathname === "/importers") {
        const path = searchParams.get("path") ?? "";
        const name = path.split("/").at(-1) ?? path;
        const importers = [...service.files].filter(([file, text]) => file.endsWith(".mdx") && folderOf(file) === folderOf(path) && text.includes(`./${name}`)).map(([file]) => file);
        return reply(200, { importers });
      }
      if (method === "DELETE") {
        const { paths = [], folders = [] } = JSON.parse(String(init?.body)) as { paths?: string[]; folders?: string[] };
        service.deletes.push({ paths, folders });
        for (const path of paths) service.files.delete(path);
        for (const folder of folders) for (const path of [...service.files.keys()]) if (path.startsWith(`${folder}/`)) service.files.delete(path);
        return reply(200, { deleted: paths, deletedFolders: folders });
      }
      const { path, content, overwrite, encoding } = JSON.parse(String(init?.body)) as Service["writes"][number];
      if (path.includes("..")) return reply(400, { error: `${path}: leaves articles/.` });
      if (service.files.has(path) && !overwrite) return reply(409, { error: `${path} is already there.`, exists: path });
      service.writes.push({ path, content, overwrite, ...(encoding === undefined ? {} : { encoding }) });
      service.files.set(path, content);
      return reply(201, { written: path, created: true, foldersCreated: [] });
    }),
  );
  return service;
};

beforeEach(async () => {
  sessionStorage.clear();
  await resetLibrary();
  // The service is down unless a test starts it.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  // A spy (window.confirm, console) is each test's own.
  vi.restoreAllMocks();
});

describe("the MDX editor", () => {
  it("renders the starter article, its embeds reading the shipped Library", async () => {
    mount();
    expect(screen.getByRole("heading", { level: 1, name: "MDX editor" })).toBeInTheDocument();
    expect(await within(preview()).findByRole("heading", { name: "A draft" })).toBeInTheDocument();
    expect(await within(preview()).findByRole("table", { name: "FIDE Candidates 2026 — crosstable" })).toBeInTheDocument();
    // A new article, nothing to save yet.
    expect(screen.getByTestId("mdx-editor-editing")).toHaveTextContent("A new article — not saved yet");
  });

  it("renders what is typed, a moment after typing stops", async () => {
    const user = userEvent.setup();
    mount();
    await within(preview()).findByRole("heading", { name: "A draft" });
    await user.clear(source());
    await user.type(source(), "## Fresh words\n\nSome **bold** text");
    expect(await within(preview()).findByRole("heading", { name: "Fresh words" })).toBeInTheDocument();
    expect(within(preview()).getByText("bold").tagName).toBe("STRONG");
    expect(within(preview()).queryByRole("heading", { name: "A draft" })).not.toBeInTheDocument();
    expect(screen.getByTestId("mdx-editor-state")).toHaveTextContent("Up to date");
  });

  it("keeps the last document that compiled under the error of one that does not", async () => {
    mount();
    setSource("## Good");
    await within(preview()).findByRole("heading", { name: "Good" });
    setSource("## Good\n\n<BoardRow>\n");
    const error = await screen.findByTestId("mdx-editor-compile-error");
    expect(error).toHaveTextContent("Expected a closing tag for `<BoardRow>`");
    expect(error).toHaveTextContent("showing the last version that did");
    expect(within(preview()).getByRole("heading", { name: "Good" })).toBeInTheDocument();
    expect(screen.getByTestId("mdx-editor-state")).toHaveTextContent("Not compiled");

    setSource("## Better");
    await within(preview()).findByRole("heading", { name: "Better" });
    expect(screen.queryByTestId("mdx-editor-compile-error")).not.toBeInTheDocument();
  });

  it("marks where each block's source line starts in the preview, and scrolls the panes together until switched off", async () => {
    const user = userEvent.setup();
    mount();
    setSource("export const x = 1\n\n## One\n\nWords\n\n{/* a note */}\n\n## Two");
    await within(preview()).findByRole("heading", { name: "Two" });
    const lines = Array.from(preview().querySelectorAll<HTMLElement>("[data-source-line]"), (marker) => marker.dataset.sourceLine);
    // Not the export or the comment, which draw nothing.
    expect(lines).toEqual(["3", "5", "9"]);
    expect(within(preview()).getByRole("heading", { name: "One" }).previousElementSibling).toHaveAttribute("data-source-line", "3");

    const together = screen.getByRole("switch", { name: "Scroll together" });
    expect(together).toBeChecked();
    await user.click(together);
    expect(together).not.toBeChecked();
  });

  it("shows the code alone, both side by side, or the preview alone — Scroll together only while both are", async () => {
    const user = userEvent.setup();
    mount();
    expect(screen.getByRole("button", { name: "Code and preview, side by side" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Code only" }));
    expect(screen.getByRole("button", { name: "Code only" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("switch", { name: "Scroll together" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview only" }));
    expect(screen.getByRole("button", { name: "Preview only" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("switch", { name: "Scroll together" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Code and preview, side by side" }));
    expect(screen.getByRole("switch", { name: "Scroll together" })).toBeInTheDocument();
  });

  it("contains a component that throws, and renders again on the next compile", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mount();
    setSource('{(() => { throw new Error("broken embed") })()}');
    expect(await screen.findByTestId("mdx-editor-render-error")).toHaveTextContent("broken embed");
    setSource("## Mended");
    expect(await within(preview()).findByRole("heading", { name: "Mended" })).toBeInTheDocument();
    expect(screen.queryByTestId("mdx-editor-render-error")).not.toBeInTheDocument();
  });

  it("opens the article the lobby's Edit names, over the kept draft, its PGN import read beside it, then drops it from the address", async () => {
    mount();
    setSource("## A draft of my own");
    await within(preview()).findByRole("heading", { name: "A draft of my own" });
    cleanup();

    mount(WERNER);
    expect(await screen.findByTestId("mdx-editor-notice")).toHaveTextContent("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    expect((source() as HTMLTextAreaElement).value).toContain('import games from "./20th-werner-obermeyer-swiss-5r.pgn?raw"');
    expect(screen.getByTestId("mdx-editor-editing")).toHaveTextContent("Editing tournaments/werner-obermeyer-swiss-2026.mdx");
    expect(screen.getByTestId("mdx-editor-dirty")).toHaveTextContent("No changes");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/dev\/mdx-editor\/edit$/));
    expect(await within(preview()).findByRole("heading", { name: "The standings" })).toBeInTheDocument();
    expect(screen.queryByTestId("mdx-editor-compile-error")).not.toBeInTheDocument();
  });

  it("says so when the article an address names has no file, keeping the draft", async () => {
    mount("/dev/mdx-editor/edit?article=nowhere");
    expect(await screen.findByTestId("mdx-editor-notice")).toHaveTextContent("No article file nowhere.mdx.");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/dev\/mdx-editor\/edit$/));
    expect((source() as HTMLTextAreaElement).value).toContain("## A draft");
  });

  it("starts a new article on the lobby's New article — asking first over changes — then drops it from the address", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    mount();
    setSource("## Mine");
    cleanup();
    mount("/dev/mdx-editor/edit?new");
    expect(await screen.findByTestId("mdx-editor-notice")).toHaveTextContent("Started a new article.");
    expect(confirm).toHaveBeenCalledOnce();
    expect((source() as HTMLTextAreaElement).value).toContain("## A draft");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/dev\/mdx-editor\/edit$/));
  });

  it("says an import it cannot read, and where", async () => {
    mount();
    setSource('import games from "./nowhere.pgn?raw"\n\n## Title');
    expect(await screen.findByTestId("mdx-editor-compile-error")).toHaveTextContent('Line 1: Cannot resolve "./nowhere.pgn?raw"');
  });

  it("asks before replacing changed text, and downloads the document — both under More", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount();
    setSource("## Mine");
    await more(user, "New article");
    expect(confirm).toHaveBeenCalledOnce();
    expect(source()).toHaveValue("## Mine");

    await more(user, "Download .mdx");
    // The metadata and the content, joined back into one file (CTA-135).
    expect(vi.mocked(downloadTextFile)).toHaveBeenLastCalledWith("article.mdx", `---\n${starterFrontmatter(todayIso())}---\n\n## Mine`, "text/markdown");
    expect(screen.getByTestId("mdx-editor-notice")).toHaveTextContent("Downloaded article.mdx.");
    // Delete article is for an article with a file of its own.
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(await screen.findByRole("menuitem", { name: "Delete article…" })).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps the draft across a remount in the same tab", async () => {
    const { unmount } = mount();
    setSource("## Kept");
    await within(preview()).findByRole("heading", { name: "Kept" });
    unmount();
    mount();
    expect(source()).toHaveValue("## Kept");
    // Still changed, so replacing it asks first.
    expect(screen.getByTestId("mdx-editor-dirty")).toHaveTextContent("Unsaved changes");
  });

  it("has no axe violations", async () => {
    mount();
    setSource("## Accessible\n\nWords.");
    await within(preview()).findByRole("heading", { name: "Accessible" });
    await expectNoAxeViolations();
  });
});

describe("the MDX editor's Content and Metadata (CTA-135)", () => {
  it("opens a file in two — its body in Content, its frontmatter in Metadata — and draws the header from the metadata", async () => {
    const user = userEvent.setup();
    mount("/dev/mdx-editor/edit?article=tournaments%2Fwerner-obermeyer-swiss-2026");
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    expect((source() as HTMLTextAreaElement).value.startsWith('import games from "./20th-werner-obermeyer-swiss-5r.pgn?raw"')).toBe(true);
    expect((source() as HTMLTextAreaElement).value).not.toContain("---");
    // The preview's header, as the article's page draws it.
    const header = within(preview()).getByTestId("mdx-editor-preview-header");
    expect(within(header).getByRole("heading", { name: "20th Werner-Obermeyer" })).toBeInTheDocument();
    expect(within(header).getByTestId("article-dates")).toHaveTextContent("Published Sep 11, 2026");

    await user.click(metadataTab());
    expect(screen.getByRole("textbox", { name: "Title (required)" })).toHaveValue("20th Werner-Obermeyer");
    expect(screen.getByTestId("mdx-editor-meta-date")).toHaveValue("2026-09-11");
    await user.click(screen.getByRole("button", { name: "YAML" }));
    expect(screen.getByRole("textbox", { name: "Metadata YAML" })).toHaveValue(
      'title: 20th Werner-Obermeyer\nsummary: "A Swiss: five rounds, the top boards of each — <SwissStandingsTable> and three of its games."\ndate: 2026-09-11\n',
    );
    expect(screen.getByTestId("mdx-editor-dirty")).toHaveTextContent("No changes");
  });

  it("edits the metadata in the form, shows it in the YAML and the header, and joins it back on copy", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    mount();
    setSource("## Body");
    await user.click(metadataTab());
    const title = screen.getByRole("textbox", { name: "Title (required)" });
    await user.clear(title);
    // Validated as the build validates it, against its field.
    expect(screen.getByText("title is required")).toBeInTheDocument();
    await user.type(title, "My event");
    await user.click(screen.getByRole("switch", { name: "Draft — in yarn dev only, not in the build" }));
    expect(within(preview()).getByRole("heading", { name: "My event" })).toBeInTheDocument();
    expect(within(preview()).queryByTestId("article-draft")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "YAML" }));
    expect(screen.getByRole("textbox", { name: "Metadata YAML" })).toHaveValue(
      `title: My event\nsummary: One line about it, for the index pages.\ndate: ${todayIso()}\n`,
    );
    await more(user, "Copy MDX");
    expect(writeText).toHaveBeenCalledWith(`---\ntitle: My event\nsummary: One line about it, for the index pages.\ndate: ${todayIso()}\n---\n\n## Body`);
  });

  it("starts a new article as a draft dated today, marked in the preview", async () => {
    mount();
    const header = await within(preview()).findByTestId("mdx-editor-preview-header");
    expect(within(header).getByRole("heading", { name: "A new article" })).toBeInTheDocument();
    expect(within(header).getByTestId("article-draft")).toHaveTextContent("Draft");
  });

  it("keeps YAML that does not parse in the YAML view, saying where, and keeps a key it does not know", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(metadataTab());
    await user.click(screen.getByRole("button", { name: "YAML" }));
    const yaml = screen.getByRole("textbox", { name: "Metadata YAML" });
    fireEvent.change(yaml, { target: { value: "title: [unclosed\n" } });
    expect(screen.getByTestId("mdx-editor-meta-yaml-error")).toHaveTextContent(/Line \d+: Flow sequence/);
    await user.click(screen.getByRole("button", { name: "Form" }));
    // Nothing for the form to show: still the YAML.
    expect(screen.getByRole("textbox", { name: "Metadata YAML" })).toBeInTheDocument();

    fireEvent.change(yaml, { target: { value: "title: T\nsummary: S\nslug: x # mine\n" } });
    expect(screen.getByTestId("mdx-editor-meta-issues")).toHaveTextContent('unknown key "slug"');
    await user.click(screen.getByRole("button", { name: "Form" }));
    expect(screen.getByTestId("mdx-editor-meta-unknown-slug")).toHaveTextContent("an unknown key, kept as written");
    await user.type(screen.getByRole("textbox", { name: "Title (required)" }), "wo");
    await user.click(screen.getByRole("button", { name: "YAML" }));
    expect(screen.getByRole("textbox", { name: "Metadata YAML" })).toHaveValue("title: Two\nsummary: S\nslug: x # mine\n");
  });

  it("gives a translation its own words only, and shows what the English file says", async () => {
    const user = userEvent.setup();
    mount("/dev/mdx-editor/edit?article=tournaments%2Folympiad-2026.he");
    await screen.findByText("Opened tournaments/olympiad-2026.he.mdx.");
    await user.click(metadataTab());
    expect(screen.getByRole("textbox", { name: "Title (required)" })).toHaveValue("האולימפיאדה ה-46 בשחמט 2026");
    expect(screen.queryByTestId("mdx-editor-meta-date")).not.toBeInTheDocument();
    expect(screen.getByTestId("mdx-editor-meta-english")).toHaveTextContent("From the English file: date 2026-09-16.");
  });

  it("offers to move a --- block pasted into Content into Metadata", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mount();
    setSource("---\ntitle: Pasted\nsummary: S\n---\n\n## Pasted body");
    // It draws nothing in the preview, and takes no line marker.
    expect(await within(preview()).findByRole("heading", { name: "Pasted body" })).toBeInTheDocument();
    expect(Array.from(preview().querySelectorAll<HTMLElement>("[data-source-line]"), (marker) => marker.dataset.sourceLine)).toEqual(["6"]);
    await user.click(screen.getByRole("button", { name: "Move it to Metadata" }));
    expect(source()).toHaveValue("## Pasted body");
    await user.click(metadataTab());
    expect(screen.getByRole("textbox", { name: "Title (required)" })).toHaveValue("Pasted");
    await user.click(contentTab());
    expect(screen.queryByTestId("mdx-editor-pasted-frontmatter")).not.toBeInTheDocument();
  });
});

const saveDialog = () => screen.getByRole("dialog", { name: "Save the article" });

describe("the MDX editor's Save (CTA-137)", () => {
  it("shows Save, enabled only once the document changed, and says how to start the service when it is not running, then retries", async () => {
    const user = userEvent.setup();
    mount();
    // Unchanged: the button is there, but it has nothing to save (CTA-161).
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    setSource("## Body");
    expect(save).toBeEnabled();
    await user.click(save);
    const down = await screen.findByRole("dialog", { name: "The storage service is not running" });
    expect(down).toHaveTextContent("yarn mdx-editor:start");
    expect(down).toHaveTextContent("http://127.0.0.1:5172");

    stubService({ "tournaments/index.mdx": "x" });
    await user.click(within(down).getByRole("button", { name: "Retry" }));
    // A new article has no file yet: Save asks where.
    expect(await screen.findByRole("dialog", { name: "Save the article" })).toBeInTheDocument();
    await expectNoAxeViolations(saveDialog());
  });

  it("saves a new article where the reader picks, and tracks that file from then on", async () => {
    const user = userEvent.setup();
    const service = stubService({ "get-started.mdx": "x", "tournaments/index.mdx": "x", "tournaments/cup.mdx": "x" });
    mount();
    setSource("## Body");
    await user.click(screen.getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog", { name: "Save the article" });
    // The name starts from the title, the folder at the root.
    const name = within(dialog).getByRole("textbox", { name: "File name" });
    expect(name).toHaveValue("a-new-article");
    await user.click(within(dialog).getByRole("treeitem", { name: "Tournaments (tournaments/)" }));
    await user.clear(name);
    await user.type(name, "my-event");
    expect(within(dialog).getByTestId("mdx-editor-save-path")).toHaveTextContent("src/views/blog/articles/tournaments/my-event.mdx");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByTestId("mdx-editor-notice")).toHaveTextContent("Saved src/views/blog/articles/tournaments/my-event.mdx.");
    expect(service.writes).toEqual([{ path: "tournaments/my-event.mdx", content: `---\n${starterFrontmatter(todayIso())}---\n\n## Body`, overwrite: false }]);
    await noDialog();
    expect(screen.getByTestId("mdx-editor-editing")).toHaveTextContent("Editing tournaments/my-event.mdx");
    expect(screen.getByTestId("mdx-editor-dirty")).toHaveTextContent("No changes");

    // From now on Save writes that file in place.
    setSource("## Body, again");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(service.writes).toHaveLength(2));
    expect(service.writes[1]).toMatchObject({ path: "tournaments/my-event.mdx", overwrite: true });
  });

  it("writes an opened article over its own file, with no dialog", async () => {
    const user = userEvent.setup();
    const service = stubService({ "tournaments/werner-obermeyer-swiss-2026.mdx": "old" });
    mount(WERNER);
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    setSource("## Rewritten");
    expect(screen.getByTestId("mdx-editor-dirty")).toHaveTextContent("Unsaved changes");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved src/views/blog/articles/tournaments/werner-obermeyer-swiss-2026.mdx.")).toBeInTheDocument();
    expect(service.writes).toEqual([{ path: "tournaments/werner-obermeyer-swiss-2026.mdx", content: expect.stringContaining("## Rewritten"), overwrite: true }]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("mdx-editor-dirty")).toHaveTextContent("No changes");
  });

  it("saves as a new file elsewhere, leaving the original, and asks before writing over another file", async () => {
    const user = userEvent.setup();
    const service = stubService({ "tournaments/index.mdx": "x", "tournaments/werner-obermeyer-swiss-2026.mdx": "old", "tournaments/taken.mdx": "theirs" });
    mount(WERNER);
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    await user.click(screen.getByRole("button", { name: "Save as…" }));
    const dialog = await screen.findByRole("dialog", { name: "Save the article" });
    const name = within(dialog).getByRole("textbox", { name: "File name" });
    expect(name).toHaveValue("werner-obermeyer-swiss-2026");
    await user.clear(name);
    await user.type(name, "taken");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    // The service reports the file there; nothing is written until the reader says so.
    const conflict = await screen.findByRole("dialog", { name: "Replace a file that is there?" });
    expect(conflict).toHaveTextContent("src/views/blog/articles/tournaments/taken.mdx is already there.");
    expect(service.files.get("tournaments/taken.mdx")).toBe("theirs");
    await user.click(within(conflict).getByRole("button", { name: "Replace" }));

    expect(await screen.findByText("Saved src/views/blog/articles/tournaments/taken.mdx.")).toBeInTheDocument();
    expect(service.writes.map(({ path, overwrite }) => ({ path, overwrite }))).toEqual([{ path: "tournaments/taken.mdx", overwrite: true }]);
    expect(service.files.get("tournaments/werner-obermeyer-swiss-2026.mdx")).toBe("old");
    expect(screen.getByTestId("mdx-editor-editing")).toHaveTextContent("Editing tournaments/taken.mdx");
  });

  it("offers a new sub-folder, and refuses a translation with no English file beside it", async () => {
    const user = userEvent.setup();
    stubService({ "tournaments/index.mdx": "x", "tournaments/cup.mdx": "x" });
    mount();
    await user.click(screen.getByRole("button", { name: "Save as…" }));
    const dialog = await screen.findByRole("dialog", { name: "Save the article" });
    await user.click(within(dialog).getByRole("treeitem", { name: "Tournaments (tournaments/)" }));
    const name = within(dialog).getByRole("textbox", { name: "File name" });
    await user.clear(name);
    await user.type(name, "cup.he");
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeEnabled();
    await user.clear(name);
    await user.type(name, "final.he");
    expect(within(dialog).getByText("A translation goes beside its English file, and tournaments/final.mdx is not there.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();

    await user.type(within(dialog).getByRole("textbox", { name: "New sub-folder (optional)" }), "club-nights");
    await user.clear(name);
    await user.type(name, "round-one");
    expect(within(dialog).getByTestId("mdx-editor-save-path")).toHaveTextContent("src/views/blog/articles/tournaments/club-nights/round-one.mdx");
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("shows what the service refuses in the dialog", async () => {
    const user = userEvent.setup();
    stubService({});
    mount();
    setSource("## Body");
    await user.click(screen.getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog", { name: "Save the article" });
    const name = within(dialog).getByRole("textbox", { name: "File name" });
    await user.clear(name);
    await user.type(name, "x");
    // The stand-in refuses a path with "..", as the service refuses one out — this one is made by hand.
    vi.mocked(fetch).mockImplementationOnce(async () => ({ ok: false, status: 400, json: async () => ({ error: "x.mdx: leaves articles/." }) }) as Response);
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await within(saveDialog()).findByTestId("mdx-editor-save-error")).toHaveTextContent("leaves articles/");
  });
});

/*
  Ctrl+S / Cmd+S (CTA-161): the same save step as the button, from a
  document-level listener that never leaks past the editor, and never a
  save behind a dialogue that owns what happens next.
*/
describe("the MDX editor's Ctrl+S (CTA-161)", () => {
  /** The shortcut fired — false once the listener has prevented the browser's own save dialogue. */
  const ctrlS = () => fireEvent.keyDown(document.body, { key: "s", ctrlKey: true });
  const cmdS = () => fireEvent.keyDown(document.body, { key: "s", metaKey: true });

  it("saves the changed article — Cmd+S too — and prevents the browser's save dialogue while the editor lives", async () => {
    const service = stubService({ "tournaments/werner-obermeyer-swiss-2026.mdx": "old" });
    const { unmount } = mount(WERNER);
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    setSource("## Rewritten");
    expect(ctrlS()).toBe(false);
    expect(await screen.findByText("Saved src/views/blog/articles/tournaments/werner-obermeyer-swiss-2026.mdx.")).toBeInTheDocument();
    expect(service.writes).toEqual([{ path: "tournaments/werner-obermeyer-swiss-2026.mdx", content: expect.stringContaining("## Rewritten"), overwrite: true }]);
    expect(screen.getByTestId("mdx-editor-dirty")).toHaveTextContent("No changes");

    // Cmd+S on a Mac saves the same way.
    setSource("## Rewritten, again");
    expect(cmdS()).toBe(false);
    await waitFor(() => expect(service.writes).toHaveLength(2));
    expect(service.writes[1]).toMatchObject({ path: "tournaments/werner-obermeyer-swiss-2026.mdx", content: expect.stringContaining("again"), overwrite: true });

    // Unmounted, the listener goes with it: the browser's default is back.
    unmount();
    expect(ctrlS()).toBe(true);
  });

  it("does nothing while the document is unchanged — no write, no dialogue — then saves once it is changed", async () => {
    const service = stubService({ "tournaments/werner-obermeyer-swiss-2026.mdx": "old" });
    mount(WERNER);
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    // The browser's own save dialogue is prevented all the same.
    expect(ctrlS()).toBe(false);
    expect(service.writes).toEqual([]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    setSource("## Rewritten");
    ctrlS();
    await waitFor(() => expect(service.writes).toHaveLength(1));
  });

  it("opens the Save-as dialogue for a new article with changes, and while it is open does not open it again", async () => {
    const user = userEvent.setup();
    stubService({ "tournaments/index.mdx": "x" });
    mount();
    // A new article with no changes: nothing.
    expect(ctrlS()).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    setSource("## Body");
    ctrlS();
    const dialog = await screen.findByRole("dialog", { name: "Save the article" });
    const name = within(dialog).getByRole("textbox", { name: "File name" });
    await user.clear(name);
    await user.type(name, "my-name");
    // The dialogue open takes the key: it is not re-opened behind itself (the name would go back).
    ctrlS();
    expect(name).toHaveValue("my-name");
    expect(screen.getAllByRole("dialog", { name: "Save the article" })).toHaveLength(1);
  });

  it("does nothing while a section's dialogue is open — then saves once it is closed", async () => {
    const user = userEvent.setup();
    const service = stubService({ "tournaments/werner-obermeyer-swiss-2026.mdx": "old" });
    mount(WERNER);
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    setSource("## Rewritten");
    await user.click(screen.getByRole("button", { name: "PGNs" }));
    const dialog = await screen.findByRole("dialog", { name: "PGNs" });
    ctrlS();
    expect(service.writes).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await noDialog();

    ctrlS();
    expect(await screen.findByText("Saved src/views/blog/articles/tournaments/werner-obermeyer-swiss-2026.mdx.")).toBeInTheDocument();
  });
});

describe("the MDX editor and git (CTA-137)", () => {
  it("says whether git has the file, and lists what it has not got, by folder", async () => {
    const user = userEvent.setup();
    stubService({ "tournaments/werner-obermeyer-swiss-2026.mdx": "x", "tournaments/index.mdx": "x" }, [
      { path: "tournaments/werner-obermeyer-swiss-2026.mdx", state: "changed", bytes: 900 },
      { path: "club/games.pgn", state: "new", bytes: 2048 },
    ]);
    mount(WERNER);
    expect(await screen.findByTestId("mdx-editor-git-file")).toHaveTextContent("Git: changed since the last commit");
    await user.click(screen.getByRole("button", { name: "2 files not synced" }));
    const dialog = await screen.findByRole("dialog", { name: "Not synced with git" });
    expect(dialog).toHaveTextContent("feature/x");
    const club = within(dialog).getByTestId("mdx-editor-git-folder-club");
    expect(club).toHaveTextContent("articles/club/");
    expect(club).toHaveTextContent("games.pgn");
    expect(club).toHaveTextContent("2 KB");
    expect(club).toHaveTextContent("not in git yet");
    await expectNoAxeViolations(dialog);
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await noDialog();

    // The save dialog marks a folder holding a file git has not got.
    await user.click(screen.getByRole("button", { name: "Save as…" }));
    const save = await screen.findByRole("dialog", { name: "Save the article" });
    expect(within(save).getByTestId("mdx-editor-save-folders-folder:tournaments")).toHaveTextContent("not synced");
  });
});

/** Two games between the same two players — a match, by its tags. */
const MATCH_PGN =
  '[Event "Club"]\n[Round "1"]\n[White "Amy"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0\n\n[Event "Club"]\n[Round "2"]\n[White "Bob"]\n[Black "Amy"]\n[Result "1/2-1/2"]\n\n1. d4 d5 1/2-1/2';

/** A section of the header — PGNs, Components, Images — opened: its dialog. */
const openSection = async (user: ReturnType<typeof userEvent.setup>, name: "PGNs" | "Components" | "Images") => {
  await user.click(screen.getByRole("button", { name }));
  return screen.findByRole("dialog", { name });
};
/** The section's list — the article's items, an Add entry last. */
const listIn = (dialog: HTMLElement, name: string) => within(dialog).getByRole("list", { name });
/** Where the source's caret is. */
const caret = () => (source() as HTMLTextAreaElement).selectionStart;

describe("the MDX editor's PGNs (CTA-137, CTA-139)", () => {
  it("lists the article's PGNs, read from the content, and adds one as a file beside an opened article, moving to it", async () => {
    const user = userEvent.setup();
    const service = stubService({ "tournaments/werner-obermeyer-swiss-2026.mdx": "x", "tournaments/round-2.pgn": "theirs" });
    mount(WERNER);
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    setSource('import games from "./20th-werner-obermeyer-swiss-5r.pgn?raw"\n\n## Standings\n\n<SwissStandingsTable pgn={games} />');

    const dialog = await openSection(user, "PGNs");
    // The article's own, how often the content reads it — the first chosen.
    const list = listIn(dialog, "The article's PGNs");
    expect(within(list).getByRole("button", { name: /^games/ })).toHaveTextContent("./20th-werner-obermeyer-swiss-5r.pgn · used 1×");
    expect(within(list).getByRole("button", { name: /^games/ })).toHaveAttribute("aria-current", "true");
    // A file's text, read only.
    const fileText = within(within(dialog).getByRole("region", { name: "The PGN games" })).getByRole("textbox", { name: "PGN — ./20th-werner-obermeyer-swiss-5r.pgn, read only" });
    expect(fileText).toHaveAttribute("readonly");
    await waitFor(() => expect((fileText as HTMLTextAreaElement).value).toContain('[Event "20th Werner-Obermeyer"]'));

    await user.click(within(list).getByRole("button", { name: "Add a PGN" }));
    const add = within(dialog).getByRole("region", { name: "Add a PGN" });
    // An article with a file takes a PGN as a file by default.
    expect(within(add).getByRole("radio", { name: "As a file" })).toBeChecked();
    await user.upload(within(add).getByTestId("mdx-editor-pgns-upload-input"), new File([MATCH_PGN], "round-2.pgn"));
    expect(within(add).getByRole("textbox", { name: "PGN" })).toHaveValue(MATCH_PGN);
    expect(within(add).getByRole("textbox", { name: "Name in the article" })).toHaveValue("round2");
    expect(within(add).getByRole("textbox", { name: "File name" })).toHaveValue("round-2.pgn");
    await user.click(within(add).getByRole("button", { name: "Add to the article" }));

    // The file is there already: asked about, then written over.
    const conflict = await screen.findByRole("dialog", { name: "Replace a file that is there?" });
    await user.click(within(conflict).getByRole("button", { name: "Replace" }));
    await waitFor(() => expect(service.files.get("tournaments/round-2.pgn")).toBe(MATCH_PGN));
    expect(service.writes.map(({ path, overwrite }) => ({ path, overwrite }))).toEqual([{ path: "tournaments/round-2.pgn", overwrite: true }]);
    // The list moves to it, and the dialog says what was done.
    const added = await within(dialog).findByRole("region", { name: "The PGN round2" });
    expect(added).toHaveTextContent("./round-2.pgn · not used yet");
    expect(within(list).getByRole("button", { name: /^round2/ })).toHaveAttribute("aria-current", "true");
    expect(within(dialog).getByTestId("mdx-editor-pgns-message")).toHaveTextContent("Added tournaments/round-2.pgn — imported as round2");
    await expectNoAxeViolations(dialog);
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await noDialog();
    expect((source() as HTMLTextAreaElement).value.startsWith('import games from "./20th-werner-obermeyer-swiss-5r.pgn?raw"\nimport round2 from "./round-2.pgn?raw"\n')).toBe(true);
  });

  it("opens on Add for an article with none, writes a pasted PGN inline — nothing to save — and removes it, asking while it is read", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const service = stubService({});
    mount();
    setSource("## Body\n\n<InlinePgnGame pgn={miniature} />");
    const dialog = await openSection(user, "PGNs");
    expect(within(dialog).getByTestId("mdx-editor-pgns-list-empty")).toHaveTextContent("None yet.");
    const add = within(dialog).getByRole("region", { name: "Add a PGN" });
    expect(within(add).getByRole("radio", { name: "Inline — up to 100 KB" })).toBeChecked();
    fireEvent.change(within(add).getByRole("textbox", { name: "PGN" }), { target: { value: '[Event "Paris"]\n\n1. e4 e5 2. Nf3 d6 1-0' } });
    const name = within(add).getByRole("textbox", { name: "Name in the article" });
    await user.type(name, "2bad");
    expect(within(add).getByRole("button", { name: "Add to the article" })).toBeDisabled();
    await user.clear(name);
    await user.type(name, "miniature");
    await user.click(within(add).getByRole("button", { name: "Add to the article" }));
    expect(await within(dialog).findByRole("region", { name: "The PGN miniature" })).toHaveTextContent("inline, 1 KB · used 1×");
    expect(service.writes).toEqual([]);

    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("The content uses miniature once"));
    expect(within(dialog).getByTestId("mdx-editor-pgns-list-empty")).toBeInTheDocument();
    expect(within(dialog).getByRole("region", { name: "Add a PGN" })).toBeInTheDocument();
    expect(within(dialog).getByTestId("mdx-editor-pgns-message")).toHaveTextContent("Removed miniature, written in, from the content.");
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await noDialog();
    expect(source()).toHaveValue("## Body\n\n<InlinePgnGame pgn={miniature} />");
  });

  it("renames a PGN — its definition and every pgn={…} that reads it — refusing a name the content binds", async () => {
    const user = userEvent.setup();
    mount();
    setSource('import games from "./20th-werner-obermeyer-swiss-5r.pgn?raw"\n\nexport const club = `1. e4 *`\n\n<SwissStandingsTable pgn={games} />\n\n<InlinePgnGame pgn={games} game="2" />');
    const dialog = await openSection(user, "PGNs");
    const pane = within(dialog).getByRole("region", { name: "The PGN games" });
    const name = within(pane).getByRole("textbox", { name: "Name in the article" });
    await user.clear(name);
    await user.type(name, "club");
    expect(within(pane).getByText("The content already binds club.")).toBeInTheDocument();
    expect(within(pane).getByRole("button", { name: "Rename" })).toBeDisabled();
    await user.clear(name);
    await user.type(name, "werner");
    await user.click(within(pane).getByRole("button", { name: "Rename" }));

    // Still on it, under its new name.
    expect(await within(dialog).findByRole("region", { name: "The PGN werner" })).toBeInTheDocument();
    expect(within(dialog).getByTestId("mdx-editor-pgns-message")).toHaveTextContent("Renamed games to werner, and the 2 uses of it.");
    expect(screen.getByTestId("mdx-editor-notice")).toHaveTextContent("Renamed games to werner");
    expect(source()).toHaveValue('import werner from "./20th-werner-obermeyer-swiss-5r.pgn?raw"\n\nexport const club = `1. e4 *`\n\n<SwissStandingsTable pgn={werner} />\n\n<InlinePgnGame pgn={werner} game="2" />');
  });

  it("edits an inline PGN's text, refusing one over 100 KB", async () => {
    const user = userEvent.setup();
    mount();
    setSource("export const club = `1. e4 *`\n\n<InlinePgnGame pgn={club} />");
    const dialog = await openSection(user, "PGNs");
    const pane = within(dialog).getByRole("region", { name: "The PGN club" });
    const text = within(pane).getByRole("textbox", { name: "PGN" });
    expect(text).toHaveValue("1. e4 *");
    expect(within(pane).getByRole("button", { name: "Update the text" })).toBeDisabled();
    fireEvent.change(text, { target: { value: "x".repeat(101 * 1024) } });
    expect(within(pane).getByTestId("mdx-editor-pgns-too-big")).toHaveTextContent("goes in as a file beside the article");
    expect(within(pane).getByRole("button", { name: "Update the text" })).toBeDisabled();
    fireEvent.change(text, { target: { value: "1. d4 `d5` *" } });
    await user.click(within(pane).getByRole("button", { name: "Update the text" }));
    expect(source()).toHaveValue("export const club = `1. d4 \\`d5\\` *`\n\n<InlinePgnGame pgn={club} />");
    expect(within(dialog).getByTestId("mdx-editor-pgns-message")).toHaveTextContent("Updated club's text.");
  });

  it("shows a PGN in the content — the Content tab, the caret on its definition — and hands one to Components", async () => {
    const user = userEvent.setup();
    mount();
    const body = "## Body\n\nexport const club = `1. e4 *`\n\nexport const cup = `1. d4 *`";
    setSource(body);
    await user.click(metadataTab());
    let dialog = await openSection(user, "PGNs");
    await user.click(within(listIn(dialog, "The article's PGNs")).getByRole("button", { name: /^cup/ }));
    await user.click(within(dialog).getByRole("button", { name: "Show in the content" }));
    await noDialog();
    expect(contentTab()).toHaveAttribute("aria-selected", "true");
    expect(source()).toHaveFocus();
    expect(caret()).toBe(body.indexOf("export const cup"));

    // Opened again, on the caret: cup chosen first.
    dialog = await openSection(user, "PGNs");
    expect(within(dialog).getByRole("region", { name: "The PGN cup" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Add a component with it" }));
    const components = await screen.findByRole("dialog", { name: "Components" });
    expect(within(components).getByRole("region", { name: "Add a component" })).toBeInTheDocument();
    expect(within(components).getByRole("radio", { name: /^cup — inline/ })).toBeChecked();
  });

  it("shows a big upload cut, a page of games at a time, and takes it only as a file", async () => {
    const user = userEvent.setup();
    stubService({});
    mount();
    const game = (index: number) => `[Event "Big"]\n[Round "${index}"]\n[White "Player ${index}"]\n[Black "Player ${index + 1}"]\n[Result "1-0"]\n\n${"1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 ".repeat(4)}1-0`;
    const big = Array.from({ length: 400 }, (_, index) => game(index + 1)).join("\n\n");
    setSource("## Body");
    const dialog = await openSection(user, "PGNs");
    await user.upload(within(dialog).getByTestId("mdx-editor-pgns-upload-input"), new File([big], "big.pgn"));
    const cut = within(dialog).getByTestId("mdx-editor-pgns-cut");
    expect(cut).toHaveTextContent(/Cut here — showing 10 of 400 games \(\d+ KB\)/);
    expect((within(dialog).getByRole("textbox", { name: "PGN" }) as HTMLTextAreaElement).value.split('[Event "Big"]')).toHaveLength(11);
    // Over 100 KB: a file, never inline — and the article has no folder yet, so it is saved first.
    expect(within(dialog).getByRole("radio", { name: "Inline — up to 100 KB" })).toBeDisabled();
    expect(within(dialog).getByRole("radio", { name: "As a file" })).toBeChecked();
    expect(within(dialog).getByRole("button", { name: "Save the article, then add" })).toBeEnabled();
    await user.click(within(cut).getByRole("button", { name: "Show all" }));
    expect(within(dialog).getByRole("textbox", { name: "PGN" })).toHaveValue(big);
  });

  it("saves an article with no folder first, then puts its PGN beside it — the import in what is saved", async () => {
    const user = userEvent.setup();
    const service = stubService({ "tournaments/index.mdx": "x" });
    mount();
    setSource("## Body");
    const dialog = await openSection(user, "PGNs");
    await user.click(within(dialog).getByRole("radio", { name: "As a file" }));
    expect(within(dialog).getByTestId("mdx-editor-pgns-no-folder")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "PGN" }), { target: { value: MATCH_PGN } });
    await user.type(within(dialog).getByRole("textbox", { name: "Name in the article" }), "match");
    await user.click(within(dialog).getByRole("button", { name: "Save the article, then add" }));

    const save = await screen.findByRole("dialog", { name: "Save the article" });
    await user.click(within(save).getByRole("treeitem", { name: "Tournaments (tournaments/)" }));
    await user.click(within(save).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(service.writes).toHaveLength(2));
    expect(service.writes[0]).toMatchObject({ path: "tournaments/match.pgn", content: MATCH_PGN, overwrite: false });
    expect(service.writes[1]).toMatchObject({ path: "tournaments/a-new-article.mdx", content: expect.stringContaining('import match from "./match.pgn?raw"\n\n## Body') });
    expect(await within(dialog).findByTestId("mdx-editor-pgns-message")).toHaveTextContent("Saved the article as tournaments/a-new-article.mdx, and added tournaments/match.pgn beside it");
    expect(within(dialog).getByRole("region", { name: "The PGN match" })).toBeInTheDocument();
  });
});

describe("the MDX editor's Components (CTA-137, CTA-139)", () => {
  it("opens on Add for an article with none: the game first, then a component that fits it — inserted at the caret, the list moving to it", async () => {
    const user = userEvent.setup();
    stubService({});
    mount();
    setSource("export const opera = `1. e4 e5 2. Nf3 d6 *`\n\n## Body\n\nThe game:");
    // The caret at the end, after "The game:".
    (source() as HTMLTextAreaElement).setSelectionRange(63, 63);
    const dialog = await openSection(user, "Components");
    const add = within(dialog).getByRole("region", { name: "Add a component" });
    expect(within(add).getByTestId("mdx-editor-components-pick-game")).toBeInTheDocument();
    // A PGN written in is one to pick.
    await user.click(within(add).getByRole("radio", { name: /^opera — inline/ }));
    await user.click(within(add).getByRole("treeitem", { name: "The game on a board" }));
    const code = within(add).getByRole("textbox", { name: "The game on a board — <InlinePgnGame>" });
    expect(code).toHaveValue('<InlinePgnGame pgn={opera} game="1" caption="…" />');
    // The form writes the code: side lines off is a prop the component reads.
    await user.click(within(add).getByRole("switch", { name: "Side lines" }));
    expect(code).toHaveValue('<InlinePgnGame pgn={opera} game="1" caption="…" variations={false} />');
    // And the code typed by hand shows in the form.
    fireEvent.change(code, { target: { value: '<InlinePgnGame pgn={opera} caption="Opera" />' } });
    expect(within(add).getByRole("textbox", { name: "Caption" })).toHaveValue("Opera");
    await user.click(within(add).getByRole("button", { name: "Insert into the content" }));

    // Still open, on what went in.
    expect(await within(dialog).findByRole("region", { name: "The component <InlinePgnGame> — opera" })).toBeInTheDocument();
    expect(within(listIn(dialog, "The article's components")).getByRole("button", { name: /^<InlinePgnGame>/ })).toHaveAttribute("aria-current", "true");
    expect(source()).toHaveValue('export const opera = `1. e4 e5 2. Nf3 d6 *`\n\n## Body\n\nThe game:\n\n<InlinePgnGame pgn={opera} caption="Opera" />\n');
    expect(screen.getByTestId("mdx-editor-notice")).toHaveTextContent("Inserted <InlinePgnGame> into the content.");
    await expectNoAxeViolations(dialog);
  });

  it("suggests the table a PGN's games look like, and offers a mock it cannot insert", async () => {
    const user = userEvent.setup();
    stubService({});
    mount();
    setSource(`export const club = \`${MATCH_PGN}\`\n\n## Body`);
    const dialog = await openSection(user, "Components");
    await user.click(within(dialog).getByRole("radio", { name: /^club — inline/ }));
    const suggested = await within(dialog).findByTestId("mdx-editor-components-suggested");
    expect(suggested).toHaveTextContent("Suggested: Match");
    expect(suggested).toHaveTextContent("2 games, every one between the same two players: a match");
    await user.click(within(suggested).getByRole("button", { name: "Pick it" }));
    expect(within(dialog).getByRole("textbox", { name: "Match — <MatchTable>" })).toHaveValue("<MatchTable pgn={club} />");

    await user.click(within(dialog).getByRole("treeitem", { name: "Puzzle board — mock" }));
    expect(within(dialog).getByTestId("mdx-editor-components-mock")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Insert into the content" })).toBeDisabled();
    await expectNoAxeViolations(dialog);
  });

  it("takes a whole Library collection by its address, its tournament tables suggested from its games", async () => {
    const user = userEvent.setup();
    stubService({});
    mount();
    setSource("## Body");
    const dialog = await openSection(user, "Components");
    await user.click(within(dialog).getByRole("radio", { name: "The Library — a game or a whole collection, by its address" }));
    const address = within(dialog).getByRole("textbox", { name: "The address" });
    await user.type(address, "/library/nowhere");
    await user.click(within(dialog).getByRole("button", { name: "Look it up" }));
    expect(await within(dialog).findByText("The Library has no collection nowhere.")).toBeInTheDocument();
    await user.clear(address);
    await user.type(address, "/library/candidates2026");
    await user.click(within(dialog).getByRole("button", { name: "Look it up" }));
    expect(await within(dialog).findByTestId("mdx-editor-components-found")).toHaveTextContent(/^Found .*Candidates.* — \d+ games/);
    const suggested = await within(dialog).findByTestId("mdx-editor-components-suggested");
    expect(suggested).toHaveTextContent("Suggested: Round robin crosstable");
    await user.click(within(suggested).getByRole("button", { name: "Pick it" }));
    // One component, any source (CTA-140): the crosstable over the collection's address.
    expect(within(dialog).getByRole("textbox", { name: "Round robin crosstable — <RoundRobinCrossTable>" })).toHaveValue('<RoundRobinCrossTable src="/library/candidates2026" />');
    // A whole collection: no single-game component to offer.
    expect(within(dialog).queryByRole("treeitem", { name: "The game on a board" })).not.toBeInTheDocument();
  });

  it("lists the content's components — the one the caret is in first — and edits one in place", async () => {
    const user = userEvent.setup();
    mount();
    const body = 'export const club = `1. e4 e5 *`\n\n<InlinePgnGame pgn={club} />\n\n<CollectionTournamentTable _id="/library/candidates2026" />\n\n<ArticleImage src="/x.png" alt="Not a component" />';
    setSource(body);
    (source() as HTMLTextAreaElement).setSelectionRange(body.indexOf("_id"), body.indexOf("_id"));
    const dialog = await openSection(user, "Components");
    const list = listIn(dialog, "The article's components");
    // An image is Images', not a component.
    expect(within(list).getAllByRole("button").map((row) => row.textContent)).toEqual(["<InlinePgnGame>club", "<CollectionTournamentTable>/library/candidates2026", "Add a component"]);
    expect(within(list).getByRole("button", { name: /^<CollectionTournamentTable>/ })).toHaveAttribute("aria-current", "true");

    await user.click(within(list).getByRole("button", { name: /^<InlinePgnGame>/ }));
    const pane = within(dialog).getByRole("region", { name: "The component <InlinePgnGame> — club" });
    const code = within(pane).getByRole("textbox", { name: "Code — <InlinePgnGame>" });
    expect(code).toHaveValue("<InlinePgnGame pgn={club} />");
    const apply = within(pane).getByRole("button", { name: "Apply" });
    expect(apply).toBeDisabled();
    await user.click(within(pane).getByRole("switch", { name: "Side lines" }));
    expect(code).toHaveValue("<InlinePgnGame pgn={club} variations={false} />");
    // Rendered with the PGN it reads compiled ahead of it.
    expect(await within(pane).findByTestId("mdx-editor-components-component-preview")).not.toHaveTextContent("does not compile");
    await user.click(apply);
    expect((source() as HTMLTextAreaElement).value).toContain("\n\n<InlinePgnGame pgn={club} variations={false} />\n\n<CollectionTournamentTable");
    expect(within(dialog).getByTestId("mdx-editor-components-message")).toHaveTextContent("Updated <InlinePgnGame> in the content.");
    expect(within(dialog).getByRole("region", { name: "The component <InlinePgnGame> — club" })).toBeInTheDocument();
    await expectNoAxeViolations(dialog);
  });

  it("removes a component, asked about first, and shows one in the content", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);
    mount();
    const body = '## Body\n\n<MatchTable pgn={club} />\n\n<CollectionTournamentTable _id="/library/candidates2026" />\n';
    setSource(body);
    (source() as HTMLTextAreaElement).setSelectionRange(0, 0);
    let dialog = await openSection(user, "Components");
    expect(within(dialog).getByRole("region", { name: "The component <MatchTable> — club" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(confirm).toHaveBeenLastCalledWith("Remove <MatchTable> from the content?");
    expect(source()).toHaveValue(body);
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(source()).toHaveValue('## Body\n\n<CollectionTournamentTable _id="/library/candidates2026" />\n');
    expect(within(dialog).getByTestId("mdx-editor-components-message")).toHaveTextContent("Removed <MatchTable> from the content.");
    // The next one chosen in its place.
    const next = within(dialog).getByRole("region", { name: "The component <CollectionTournamentTable> — /library/candidates2026" });
    await user.click(within(next).getByRole("button", { name: "Show in the content" }));
    await noDialog();
    expect(source()).toHaveFocus();
    expect(caret()).toBe("## Body\n\n".length);

    // The last one gone: Add.
    dialog = await openSection(user, "Components");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(source()).toHaveValue("## Body\n");
    expect(within(dialog).getByRole("region", { name: "Add a component" })).toBeInTheDocument();
  });
});

describe("the MDX editor's Images (CTA-137, CTA-139)", () => {
  beforeEach(() => {
    // jsdom has no object URLs: the picked file's stand-in.
    Object.defineProperty(URL, "createObjectURL", { value: vi.fn(() => "blob:photo"), configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
  });

  it("opens on Add for an article with none: an image beside the article — its alt text asked for, its look set — then edits it in place", async () => {
    const user = userEvent.setup();
    const service = stubService({ "tournaments/werner-obermeyer-swiss-2026.mdx": "x" });
    mount(WERNER);
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    setSource('import games from "./20th-werner-obermeyer-swiss-5r.pgn?raw"\n\n## The final position');

    const dialog = await openSection(user, "Images");
    const add = within(dialog).getByRole("region", { name: "Add an image" });
    await user.upload(within(add).getByTestId("mdx-editor-images-upload-input"), new File(["png"], "My Photo.PNG", { type: "image/png" }));
    expect(within(add).getByRole("textbox", { name: "File name" })).toHaveValue("my-photo.png");
    expect(within(add).getByRole("textbox", { name: "Name in the article" })).toHaveValue("myPhoto");
    // No alt text, no image — unless it says nothing (decorative).
    const addButton = within(add).getByRole("button", { name: "Add to the article" });
    expect(addButton).toBeDisabled();
    await user.type(within(add).getByRole("textbox", { name: "Alt text" }), "The final position");
    await user.click(within(add).getByRole("switch", { name: "Rounded corners" }));
    // The preview is the component itself.
    expect(within(within(add).getByTestId("mdx-editor-images-preview")).getByRole("img", { name: "The final position" })).toHaveAttribute("src", "blob:photo");
    await user.click(addButton);

    // Still open, on the image just put in.
    const pane = await within(dialog).findByRole("region", { name: "The image The final position" });
    expect(service.writes).toEqual([{ path: "tournaments/my-photo.png", content: "cG5n", overwrite: false, encoding: "base64" }]);
    expect(source()).toHaveValue(
      'import games from "./20th-werner-obermeyer-swiss-5r.pgn?raw"\nimport myPhoto from "./my-photo.png"\n\n## The final position\n\n<ArticleImage src={myPhoto} alt="The final position" rounded />\n',
    );
    expect(screen.getByTestId("mdx-editor-notice")).toHaveTextContent("Added tournaments/my-photo.png and showed it where the cursor was.");
    expect(within(listIn(dialog, "The article's images")).getByRole("button", { name: "The final position — ./my-photo.png" })).toHaveAttribute("aria-current", "true");

    // Its settings as a form, applied in place — the image read from the file just written.
    expect(within(pane).getByRole("textbox", { name: "Code — <ArticleImage>" })).toHaveValue('<ArticleImage src={myPhoto} alt="The final position" rounded />');
    expect(await within(within(pane).getByRole("region", { name: "Preview" })).findByRole("img", { name: "The final position" })).toHaveAttribute("src", "blob:photo");
    await user.click(within(pane).getByRole("switch", { name: "A shadow" }));
    await user.type(within(pane).getByRole("textbox", { name: "Caption" }), "White mates");
    await user.click(within(pane).getByRole("button", { name: "Apply" }));
    expect((source() as HTMLTextAreaElement).value).toContain('<ArticleImage src={myPhoto} alt="The final position" caption="White mates" rounded shadow />');
    expect(within(dialog).getByTestId("mdx-editor-images-message")).toHaveTextContent("Updated the image's settings.");
    await expectNoAxeViolations(dialog);
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await noDialog();
    // The preview reads the file just written.
    expect(await within(preview()).findByRole("img", { name: "The final position" })).toHaveAttribute("src", "blob:photo");
  });

  it("asks an article with no folder to be saved first, staying open under the save dialog", async () => {
    const user = userEvent.setup();
    stubService({});
    mount();
    const dialog = await openSection(user, "Images");
    expect(within(dialog).getByTestId("mdx-editor-images-no-folder")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Save the article first" }));
    expect(await screen.findByRole("dialog", { name: "Save the article" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Images", hidden: true })).toBeInTheDocument();
  });

  it("opens on the image the caret is in, shows it in the content, and removes images — the import with the last that reads it", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    mount();
    const body = 'import photo from "./photo.png"\n\n## Body\n\n<ArticleImage src={photo} alt="The hall" />\n\n<ArticleImage src={photo} alt="" caption="Again" />\n';
    setSource(body);
    const second = body.lastIndexOf("<ArticleImage");
    (source() as HTMLTextAreaElement).setSelectionRange(second + 3, second + 3);
    let dialog = await openSection(user, "Images");
    const list = listIn(dialog, "The article's images");
    expect(within(list).getByRole("button", { name: "Decorative — ./photo.png" })).toHaveAttribute("aria-current", "true");
    await user.click(within(dialog).getByRole("button", { name: "Show in the content" }));
    await noDialog();
    expect(caret()).toBe(second);

    dialog = await openSection(user, "Images");
    await user.click(within(listIn(dialog, "The article's images")).getByRole("button", { name: "The hall — ./photo.png" }));
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(confirm).toHaveBeenLastCalledWith("Remove the image ./photo.png from the content? The file stays beside the article.");
    // The other still reads the import: it stays.
    expect(source()).toHaveValue('import photo from "./photo.png"\n\n## Body\n\n<ArticleImage src={photo} alt="" caption="Again" />\n');
    expect(within(dialog).getByTestId("mdx-editor-images-message")).toHaveTextContent("Removed the image ./photo.png from the content — the file stays beside the article.");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(source()).toHaveValue("## Body\n");
    expect(within(dialog).getByTestId("mdx-editor-images-message")).toHaveTextContent("Removed the image ./photo.png from the content, and its import");
    expect(within(dialog).getByRole("region", { name: "Add an image" })).toBeInTheDocument();
  });
});

describe("the MDX editor's Delete article (CTA-137)", () => {
  it("deletes the article with its translations, and the PGN it imports if ticked — the text kept, unsaved", async () => {
    const user = userEvent.setup();
    const service = stubService(
      {
        "tournaments/werner-obermeyer-swiss-2026.mdx": "x",
        "tournaments/werner-obermeyer-swiss-2026.he.mdx": "x",
        "tournaments/20th-werner-obermeyer-swiss-5r.pgn": "1. e4 *",
      },
      [{ path: "tournaments/werner-obermeyer-swiss-2026.he.mdx", state: "new" }],
    );
    mount(WERNER);
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    await more(user, "Delete article…");
    const dialog = await screen.findByRole("dialog", { name: "Delete the article?" });
    expect(await within(dialog).findByTestId("mdx-editor-delete-translations")).toHaveTextContent("tournaments/werner-obermeyer-swiss-2026.he.mdx");
    const pgn = await within(dialog).findByRole("checkbox", { name: "Delete tournaments/20th-werner-obermeyer-swiss-5r.pgn too" });
    await waitFor(() => expect(pgn).toBeEnabled());
    expect(within(dialog).getByText("Only this article imports it.")).toBeInTheDocument();
    // The translation was never committed: gone for good.
    expect(within(dialog).getByTestId("mdx-editor-delete-not-in-git")).toHaveTextContent("tournaments/werner-obermeyer-swiss-2026.he.mdx has never been committed");
    expect(within(dialog).getByRole("button", { name: "Delete 2 files" })).toBeEnabled();
    await user.click(pgn);
    await user.click(within(dialog).getByRole("button", { name: "Delete 3 files" }));

    await noDialog();
    expect(service.deletes).toEqual([
      { paths: ["tournaments/werner-obermeyer-swiss-2026.mdx", "tournaments/werner-obermeyer-swiss-2026.he.mdx", "tournaments/20th-werner-obermeyer-swiss-5r.pgn"], folders: [] },
    ]);
    expect(screen.getByTestId("mdx-editor-editing")).toHaveTextContent("A new article — not saved yet");
    expect(screen.getByTestId("mdx-editor-dirty")).toHaveTextContent("Unsaved changes");
    expect(screen.getByTestId("mdx-editor-notice")).toHaveTextContent("Deleted tournaments/werner-obermeyer-swiss-2026.mdx");
  });
});
