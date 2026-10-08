import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { EngineEntry } from "../../../lib/engines";
import { expectNoAxeViolations } from "../../../test/axe";
import EnginePicker from "./EnginePicker";
import { ISOLATED_HOST, PLAIN_HOST, WITH_ADDED } from "./fixtures";

const mount = (entries: readonly EngineEntry[], value: string) => {
  const onChange = vi.fn();
  render(<EnginePicker entries={entries} value={value} onChange={onChange} testId="picker" />);
  return { onChange };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("EnginePicker", () => {
  it("is one named group of radios, a radio per engine, the chosen one checked", () => {
    mount(ISOLATED_HOST, "stockfish-19-lite-single");

    const group = screen.getByRole("radiogroup", { name: "Engine" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((radio) => (radio as HTMLInputElement).value)).toEqual([
      "stockfish-19-lite-single",
      "stockfish-19-lite-multi",
    ]);
    expect(screen.getByRole("radio", { name: "Stockfish 19 Lite" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /multi-thread/ })).not.toBeChecked();
  });

  it("says each engine's version, threading and how its strength is set", () => {
    mount(WITH_ADDED, "stockfish-19-lite-single");

    expect(screen.getByTestId("picker-facts-my-engine")).toHaveTextContent(
      "Version 2 · Single-thread · Strength by Skill Level",
    );
    expect(screen.getByTestId("picker-facts-stockfish-19-lite-single")).toHaveTextContent(
      "Version 19 · Single-thread · Strength by Skill Level or Elo",
    );
    expect(screen.getByTestId("picker-facts-stockfish-19-lite-multi")).toHaveTextContent(
      "Version 19 · Multi-thread · Strength by Skill Level or Elo",
    );
  });

  it("reads an engine's facts with its name — they describe the radio", () => {
    mount(ISOLATED_HOST, "stockfish-19-lite-single");

    expect(screen.getByRole("radio", { name: /Stockfish 19 Lite \(multi-thread\)/ })).toHaveAccessibleDescription(
      /Version 19 · Multi-thread/,
    );
  });

  it("lists an engine the host cannot run disabled, saying why", () => {
    mount(PLAIN_HOST, "stockfish-19-lite-single");

    const multi = screen.getByRole("radio", { name: /multi-thread/i });
    expect(multi).toBeDisabled();
    expect(screen.getByTestId("picker-reason-stockfish-19-lite-multi")).toHaveTextContent(
      "Needs cross-origin isolation — not available on this host",
    );
    expect(multi).toHaveAccessibleDescription(/Needs cross-origin isolation/);
    // An engine that can run says nothing of the sort.
    expect(screen.queryByTestId("picker-reason-stockfish-19-lite-single")).toBeNull();
    expect(screen.getByRole("radio", { name: "Stockfish 19 Lite" })).toBeEnabled();
  });

  it("leaves a disabled engine unchosen however it is clicked", async () => {
    const { onChange } = mount(PLAIN_HOST, "stockfish-19-lite-single");

    // The disabled radio takes no pointer events — which is the point; the check is switched off to try anyway.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(screen.getByRole("radio", { name: /multi-thread/i }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("hands the chosen engine's id to onChange, by click", async () => {
    const { onChange } = mount(ISOLATED_HOST, "stockfish-19-lite-single");

    await userEvent.click(screen.getByRole("radio", { name: /multi-thread/ }));

    expect(onChange).toHaveBeenCalledWith("stockfish-19-lite-multi");
  });

  it("is operated from the keyboard: Tab into the group, an arrow moves the choice", async () => {
    const { onChange } = mount(ISOLATED_HOST, "stockfish-19-lite-single");

    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "Stockfish 19 Lite" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");

    expect(onChange).toHaveBeenLastCalledWith("stockfish-19-lite-multi");
  });

  it("skips a disabled engine when an arrow moves the choice", async () => {
    const { onChange } = mount(WITH_ADDED, "stockfish-19-lite-single");

    screen.getByRole("radio", { name: "Stockfish 19 Lite" }).focus();
    await userEvent.keyboard("{ArrowDown}");

    // The multi-thread build is next in the list but cannot be chosen: the arrow moves past it.
    expect(onChange).toHaveBeenLastCalledWith("hosted-stockfish-19-full-strength-nnue-big-net");
  });

  it("shows engines beyond the shipped ones, a long name and a name in Hebrew among them", () => {
    mount(WITH_ADDED, "my-engine");

    expect(screen.getByRole("radio", { name: /מנוע אישי/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Stockfish 19 Full Strength NNUE/ })).toBeEnabled();
  });

  it("reads in Hebrew, its names pinned left to right", async () => {
    await i18n.changeLanguage("he");
    mount(PLAIN_HOST, "stockfish-19-lite-single");

    expect(screen.getByRole("radiogroup", { name: "מנוע" })).toBeInTheDocument();
    expect(screen.getByTestId("picker-reason-stockfish-19-lite-multi")).toHaveTextContent("דורש בידוד בין־מקורות");
    expect(screen.getByText("Stockfish 19 Lite")).toHaveAttribute("dir", "ltr");
  });

  it("passes axe, with and without a disabled engine", async () => {
    const { unmount } = render(
      <EnginePicker entries={ISOLATED_HOST} value="stockfish-19-lite-single" onChange={() => {}} testId="picker-a" />,
    );
    await expectNoAxeViolations();
    unmount();

    render(<EnginePicker entries={PLAIN_HOST} value="stockfish-19-lite-single" onChange={() => {}} testId="picker-b" />);
    await expectNoAxeViolations();
  });
});
