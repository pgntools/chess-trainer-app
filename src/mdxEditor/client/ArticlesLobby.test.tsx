import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

import { expectNoAxeViolations } from "../../test/axe";
import LobbyMain from "./LobbyMain";

/*
  The MDX editor's lobby (`/dev/mdx-editor`, CTA-137): the Blog's files on
  disk as a tree of folders, each row's actions, a search, and rows ticked
  to delete together — `fetch` standing in for the storage service.
*/

const FOLDERS = [
  {
    path: "",
    files: ["get-started.he.mdx", "get-started.mdx"],
    articles: { "get-started.mdx": { title: "Get started" }, "get-started.he.mdx": { title: "מתחילים" } },
    others: [],
  },
  {
    path: "club",
    title: "Club",
    files: ["board.png", "games.pgn", "index.mdx", "night.he.mdx", "night.mdx"],
    articles: { "index.mdx": { title: "Club" }, "night.mdx": { title: "A night", date: "2026-10-01", draft: true }, "night.he.mdx": { title: "לילה" } },
    others: ["notes.txt"],
  },
  { path: "club/winter", title: "Winter", files: ["index.mdx"], articles: { "index.mdx": { title: "Winter" } }, others: [] },
];

type Calls = { deletes: { paths: string[]; folders: string[] }[] };

const stubService = (up = true): Calls => {
  const calls: Calls = { deletes: [] };
  const reply = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body }) as Response;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (!up) throw new TypeError("Failed to fetch");
      const { pathname } = new URL(url);
      if (pathname === "/folders") return reply(200, { folders: FOLDERS });
      if (pathname === "/git-status") return reply(200, { available: true, branch: "feature/x", files: [{ path: "club/games.pgn", state: "new", bytes: 4096 }] });
      if (pathname === "/importers") return reply(200, { importers: ["club/night.mdx"] });
      const body = JSON.parse(String(init?.body)) as { paths?: string[]; folders?: string[] };
      calls.deletes.push({ paths: body.paths ?? [], folders: body.folders ?? [] });
      return reply(200, { deleted: body.paths ?? [], deletedFolders: body.folders ?? [] });
    }),
  );
  return calls;
};

const mount = () =>
  render(
    <MemoryRouter initialEntries={["/dev/mdx-editor"]}>
      <Routes>
        <Route path="/dev/mdx-editor" element={<LobbyMain />} />
      </Routes>
    </MemoryRouter>,
  );

const row = (path: string) => screen.getByTestId(`mdx-lobby-row-${path}`);

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the MDX editor's lobby", () => {
  it("lists the Blog's files as a tree of folders that open, each article's title, date and draft, and git's word", async () => {
    const user = userEvent.setup();
    stubService();
    mount();
    expect(screen.getByRole("heading", { level: 1, name: "Articles" })).toBeInTheDocument();
    expect(await screen.findByTestId("mdx-lobby-row-club")).toHaveTextContent("Club · 4 files");
    // A folder opens on its own; at the root, an article and its translation after it.
    expect(within(row("get-started.mdx")).getByText("Get started")).toBeInTheDocument();
    expect(row("get-started.mdx").nextElementSibling).toBe(row("get-started.he.mdx"));
    expect(screen.queryByTestId("mdx-lobby-row-club/night.mdx")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open club" }));
    // Its sub-folders, its page, its articles (each followed by its translations), then its PGNs and images.
    const order = ["club/winter", "club/index.mdx", "club/night.mdx", "club/night.he.mdx", "club/games.pgn", "club/board.png"].map(row);
    order.slice(1).forEach((current, index) => expect(order[index].compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
    expect(row("club/night.mdx")).toHaveTextContent("A night");
    expect(row("club/night.mdx")).toHaveTextContent("2026-10-01");
    expect(within(row("club/night.mdx")).getByText("Draft")).toBeInTheDocument();
    expect(row("club/index.mdx")).toHaveTextContent("(the folder's page)");
    // What git has not got: marked, and said, with a PGN's size.
    expect(await within(row("club/games.pgn")).findByText("not in git yet, 4 KB")).toBeInTheDocument();
    expect(row("club")).toHaveTextContent("not synced");
    expect(within(row("club/games.pgn")).getByTitle("Not synced with git")).toBeInTheDocument();
    expect(row("club/night.mdx")).toHaveTextContent("in git");
  });

  it("opens an article in the editor and on the Blog, and starts a new one", async () => {
    stubService();
    mount();
    await screen.findByTestId("mdx-lobby-row-club");
    expect(screen.getByRole("link", { name: "Edit get-started.he.mdx" })).toHaveAttribute("href", "/dev/mdx-editor/edit?article=get-started.he");
    expect(screen.getByRole("link", { name: "Open get-started.mdx on the Blog" })).toHaveAttribute("href", "/blog/get-started");
    expect(screen.getByRole("link", { name: "Open Club on the Blog" })).toHaveAttribute("href", "/blog/club");
    expect(screen.getByRole("link", { name: "New article" })).toHaveAttribute("href", "/dev/mdx-editor/edit?new");
  });

  it("finds a file or a title, opening the folders down to it", async () => {
    const user = userEvent.setup();
    stubService();
    mount();
    await screen.findByTestId("mdx-lobby-row-club");
    await user.type(screen.getByRole("searchbox", { name: "Find a file or a title" }), "a night");
    expect(row("club")).toBeInTheDocument();
    expect(row("club/night.mdx")).toBeInTheDocument();
    expect(screen.queryByTestId("mdx-lobby-row-get-started.mdx")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mdx-lobby-row-club/games.pgn")).not.toBeInTheDocument();
  });

  it("deletes a PGN alone, saying which article imports it and that git has never had it", async () => {
    const user = userEvent.setup();
    const calls = stubService();
    mount();
    await user.click(await screen.findByRole("button", { name: "Open club" }));
    await user.click(screen.getByRole("button", { name: "Delete club/games.pgn" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete the PGN file?" });
    expect(await within(dialog).findByTestId("mdx-lobby-delete-pgn-importers")).toHaveTextContent("club/night.mdx imports it");
    expect(within(dialog).getByTestId("mdx-lobby-delete-pgn-not-in-git")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(calls.deletes).toEqual([{ paths: ["club/games.pgn"], folders: [] }]));
    expect(await screen.findByTestId("mdx-lobby-notice")).toHaveTextContent("Deleted club/games.pgn.");
  });

  it("deletes the ticked rows together — a folder whole, an article with its translations — naming every file first", async () => {
    const user = userEvent.setup();
    const calls = stubService();
    mount();
    await screen.findByTestId("mdx-lobby-row-club");
    const bar = screen.getByRole("button", { name: "Delete the selected" });
    expect(bar).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Select the folder club/" }));
    await user.click(screen.getByRole("checkbox", { name: "Select get-started.mdx" }));
    expect(screen.getByTestId("mdx-lobby-selection-selected-count")).toHaveTextContent("2 selected");
    await user.click(screen.getByRole("button", { name: "Delete the selected" }));

    const dialog = await screen.findByRole("dialog", { name: "Delete 2 items?" });
    expect(within(dialog).getByTestId("mdx-lobby-delete-picks-folders")).toHaveTextContent("club/");
    // Everything under the folder, at any depth — an image and another file too.
    expect(within(dialog).getByTestId("mdx-lobby-delete-picks-folders")).toHaveTextContent("4 article files, 1 PGN file, 1 image, 1 other file (notes.txt)");
    expect(within(dialog).getByTestId("mdx-lobby-delete-picks-translations")).toHaveTextContent("get-started.he.mdx");
    // A PGN that goes is imported only by an article that goes with it: nothing breaks.
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Delete 9 files" })).toBeEnabled());
    expect(within(dialog).queryByTestId("mdx-lobby-delete-picks-broken")).not.toBeInTheDocument();
    await expectNoAxeViolations(dialog);
    await user.click(within(dialog).getByRole("button", { name: "Delete 9 files" }));

    await waitFor(() => expect(calls.deletes).toEqual([{ paths: ["get-started.mdx", "get-started.he.mdx"], folders: ["club"] }]));
    expect(await screen.findByTestId("mdx-lobby-notice")).toHaveTextContent("Deleted 2 files and 1 folder (club/).");
    expect(screen.queryByTestId("mdx-lobby-selection-selected-count")).not.toBeInTheDocument();
  });

  it("says the service is not running, and how to start it", async () => {
    stubService(false);
    mount();
    expect(await screen.findByTestId("mdx-lobby-problem")).toHaveTextContent("yarn mdx-editor:start");
  });

  it("has no axe violations", async () => {
    const user = userEvent.setup();
    stubService();
    mount();
    await user.click(await screen.findByRole("button", { name: "Open club" }));
    await within(row("club/games.pgn")).findByText("not in git yet, 4 KB");
    await expectNoAxeViolations();
  });
});
