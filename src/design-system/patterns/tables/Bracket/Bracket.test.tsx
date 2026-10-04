import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../../test/axe";
import Bracket, { type BracketMatch, type BracketRound } from "./Bracket";

const match = (id: string, a: string, b: string, scores: [string, string], winner?: 0 | 1, detail?: [string, string]): BracketMatch => ({
  id,
  sides: [
    { id: "a", name: a, score: scores[0], winner: winner === 0, detail: detail?.[0] },
    { id: "b", name: b, score: scores[1], winner: winner === 1, detail: detail?.[1] },
  ],
  label: `${a} ${scores[0]}, ${b} ${scores[1]}${winner === undefined ? "" : `: ${winner === 0 ? a : b} goes through`}`,
});

const ROUNDS: BracketRound[] = [
  {
    id: "1",
    title: "Semi-finals",
    matches: [match("1", "Ada", "Alan", ["2", "0"], 0), match("2", "Grace", "Donald", ["1½", "2½"], 1, ["(5)", "(7)"])],
  },
  { id: "2", title: "Final", matches: [match("3", "Ada", "Donald", ["1", "1"])] },
];

const mount = (props: Partial<Parameters<typeof Bracket>[0]> = {}) =>
  render(<Bracket rounds={ROUNDS} ariaLabel="Cup — bracket" emptyLabel="No matches." testId="b" {...props} />);

describe("Bracket", () => {
  it("is a named region the keyboard can reach and scroll", async () => {
    const user = userEvent.setup();
    mount();
    const region = screen.getByRole("region", { name: "Cup — bracket" });
    await user.tab();
    expect(region).toHaveFocus();
  });

  it("is a list per round, named by its title, a match per item read by its words", () => {
    mount();
    const semis = screen.getByRole("list", { name: "Semi-finals" });
    expect(within(semis).getAllByRole("listitem")).toHaveLength(2);
    expect(within(semis).getByText("Grace 1½, Donald 2½: Donald goes through")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Final" })).toBeInTheDocument();
  });

  it("marks the side that went through — bold, and in the words — and only it", () => {
    mount();
    expect(screen.getByTestId("b-match-2-b")).toHaveAttribute("data-winner", "true");
    expect(screen.getByTestId("b-match-2-b")).toHaveStyle({ fontWeight: 700 });
    expect(screen.getByTestId("b-match-2-a")).not.toHaveAttribute("data-winner");
    // A level match marks no one.
    expect(screen.getByTestId("b-match-3-a")).not.toHaveAttribute("data-winner");
    expect(screen.getByTestId("b-match-3-b")).not.toHaveAttribute("data-winner");
  });

  it("shows a side's score and its detail, pinned left to right, out of the screen reader's way", () => {
    mount();
    const line = screen.getByTestId("b-match-2-b");
    expect(line).toHaveTextContent("Donald2½(7)");
    expect(line.closest("[aria-hidden]")).not.toBeNull();
    expect(within(line).getByText("2½")).toHaveAttribute("dir", "ltr");
  });

  it("shows a match's caption over its box, out of the screen reader's way", () => {
    mount({ rounds: [{ id: "1", title: "Final", matches: [{ ...match("1", "Ada", "Alan", ["2", "0"], 0), caption: "Match for third place" }] }] });
    expect(screen.getByTestId("b-match-1-caption")).toHaveTextContent("Match for third place");
    expect(screen.getByTestId("b-match-1-caption").closest("[aria-hidden]")).not.toBeNull();
  });

  it("says it is reading, busy, and that it has nothing — in place of the rounds", () => {
    const { unmount } = mount({ loading: true, loadingLabel: "Reading…" });
    expect(screen.getByRole("status")).toHaveTextContent("Reading…");
    expect(screen.getByRole("region")).toHaveAttribute("aria-busy", "true");
    unmount();
    mount({ rounds: [] });
    expect(screen.getByTestId("b-empty")).toHaveTextContent("No matches.");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
