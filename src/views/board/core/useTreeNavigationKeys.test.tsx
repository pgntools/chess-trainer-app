import { describe, expect, it } from "vitest";
import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { nodeAtSanPath, sanPathTo } from "../../../lib/gameTree";
import { parsePgnTree } from "../../../lib/pgn";
import { useTreeNavigation } from "./useTreeNavigation";

/**
 * The board screens' keys (CTA-165): Home / End travel the branch, PgUp /
 * PgDown the whole game — bound on the document by the one navigation hook
 * every board composes (`useBoardCore`).
 */
const tree = parsePgnTree("1. e4 e5 (1... c5 2. Nf3 (2. c3 d5 3. exd5) d6) 2. Nf3 (2. Bc4 Nf6) Nc6 *");
const id = (...sans: string[]) => nodeAtSanPath(tree, sans);

const navigateFrom = (nodeId: string | null) => {
  const hook = renderHook(() => useTreeNavigation(tree, undefined, nodeId));
  return { hook, at: () => sanPathTo(tree, hook.result.current.nodeId).join(" ") };
};

describe("useTreeNavigation — Home / End the branch, PgUp / PgDown the game (CTA-165)", () => {
  it("Home goes to the side line's first move, then climbs a level at a time to the start", async () => {
    const user = userEvent.setup();
    const { at } = navigateFrom(id("e4", "c5", "c3", "d5", "exd5"));
    await user.keyboard("{Home}");
    expect(at()).toBe("e4 c5 c3");
    await user.keyboard("{Home}");
    expect(at()).toBe("e4 c5");
    await user.keyboard("{Home}");
    expect(at()).toBe("");
  });

  it("Home on the mainline is the start position", async () => {
    const user = userEvent.setup();
    const { at } = navigateFrom(id("e4", "e5", "Nf3"));
    await user.keyboard("{Home}");
    expect(at()).toBe("");
  });

  it("End goes to the end of the line on screen, the side line's own", async () => {
    const user = userEvent.setup();
    const { at } = navigateFrom(id("e4", "c5", "c3"));
    await user.keyboard("{End}");
    expect(at()).toBe("e4 c5 c3 d5 exd5");
  });

  it("PgUp goes to the start and PgDown to the mainline's end, from inside a side line", async () => {
    const user = userEvent.setup();
    const { at } = navigateFrom(id("e4", "c5", "c3", "d5"));
    await user.keyboard("{PageDown}");
    expect(at()).toBe("e4 e5 Nf3 Nc6");
    await user.keyboard("{PageUp}");
    expect(at()).toBe("");
  });

  it("takes a key with nowhere to go, so the panel does not scroll", () => {
    const { at } = navigateFrom(null);
    // `fireEvent` answers false when the event's default was prevented.
    expect(fireEvent.keyDown(document.body, { key: "Home" })).toBe(false);
    expect(fireEvent.keyDown(document.body, { key: "PageUp" })).toBe(false);
    expect(at()).toBe("");
    fireEvent.keyDown(document.body, { key: "PageDown" });
    expect(at()).toBe("e4 e5 Nf3 Nc6");
    expect(fireEvent.keyDown(document.body, { key: "PageDown" })).toBe(false);
    expect(fireEvent.keyDown(document.body, { key: "End" })).toBe(false);
  });

  it("leaves the keys to the browser with Ctrl / Alt / ⌘ held, and in a field", async () => {
    const user = userEvent.setup();
    const { at } = navigateFrom(id("e4", "c5", "c3", "d5"));
    expect(fireEvent.keyDown(document.body, { key: "PageUp", ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(document.body, { key: "Home", altKey: true })).toBe(true);
    expect(fireEvent.keyDown(document.body, { key: "PageDown", metaKey: true })).toBe(true);
    expect(at()).toBe("e4 c5 c3 d5");

    render(<input aria-label="A field" />);
    await user.click(screen.getByRole("textbox", { name: "A field" }));
    await user.keyboard("{Home}{PageUp}{PageDown}");
    expect(at()).toBe("e4 c5 c3 d5");
  });
});
