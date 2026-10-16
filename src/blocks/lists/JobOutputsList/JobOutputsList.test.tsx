import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { formatBytes } from "../../../lib/formatBytes";
import { expectNoAxeViolations } from "../../../test/axe";
import { APPLIED, MIXED, PENDING, PGN } from "./fixtures";
import JobOutputsList, { type JobOutputsListProps } from "./JobOutputsList";

const mount = (props: Partial<JobOutputsListProps> = {}) => {
  const onDownload = vi.fn();
  const renderData = vi.fn((output: { label: string }) => <p>the view of {output.label}</p>);
  render(<JobOutputsList outputs={APPLIED} onDownload={onDownload} renderData={renderData} testId="outputs" {...props} />);
  return { onDownload, renderData };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("JobOutputsList (CTA-217)", () => {
  it("lists each output under its heading: an entity opens, a deleted one is said, a file downloads, a report is the kind's view", async () => {
    const { renderData } = mount();
    expect(screen.getByRole("heading", { level: 3, name: "Outputs" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Outputs" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Carlsen – Nepomniachtchi (light)" })).toHaveAttribute("href", "#case-light");
    expect(screen.getByTestId("outputs-case-full")).toHaveTextContent("Carlsen – Nepomniachtchi (full) (deleted)");
    expect(within(screen.getByTestId("outputs-case-full")).queryByRole("link")).toBeNull();
    expect(screen.getByTestId("outputs-pgn")).toHaveTextContent("application/x-chess-pgn");
    expect(screen.getByTestId("outputs-pgn-size")).toHaveTextContent(formatBytes(1_203_455));
    expect(screen.getByTestId("outputs-summary-data")).toHaveTextContent("the view of Summary");
    expect(renderData).toHaveBeenCalledWith(APPLIED[3]);
    await expectNoAxeViolations(screen.getByTestId("outputs"));
  });

  it("downloads a file by its named button, from the keyboard too, and is busy while it reads", async () => {
    const user = userEvent.setup();
    const { onDownload } = mount();
    const button = screen.getByRole("button", { name: "Download Tata Steel 2026 + Wijk 2025.pgn" });
    await user.click(button);
    expect(onDownload).toHaveBeenCalledWith(PGN);
    button.focus();
    await user.keyboard("{Enter}");
    expect(onDownload).toHaveBeenCalledTimes(2);
  });

  it("holds a download's button while it reads", () => {
    mount({ downloadingKey: "pgn" });
    expect(screen.getByTestId("outputs-pgn-download")).toBeDisabled();
    expect(screen.getByTestId("outputs-pgn-download")).toHaveAttribute("aria-busy", "true");
  });

  it("shows a pending output as such — its name and a Pending chip, nothing to open, download or draw", async () => {
    const { renderData } = mount({ outputs: PENDING });
    expect(screen.getAllByText("Pending")).toHaveLength(3);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Download/ })).toBeNull();
    expect(screen.getByTestId("outputs-collection")).toHaveTextContent("Tata Steel 2026 + Wijk 2025");
    expect(screen.queryByTestId("outputs-pgn-pending-size")).toBeNull();
    expect(renderData).not.toHaveBeenCalled();
    await expectNoAxeViolations(screen.getByTestId("outputs"));
  });

  it("shows applied and pending side by side", () => {
    mount({ outputs: MIXED });
    expect(screen.getByRole("link", { name: "Carlsen – Nepomniachtchi (light)" })).toBeInTheDocument();
    expect(screen.getAllByText("Pending")).toHaveLength(2);
  });

  it("says when there is none, and takes the heading level it is given", () => {
    mount({ outputs: [], headingLevel: 2 });
    expect(screen.getByRole("heading", { level: 2, name: "Outputs" })).toBeInTheDocument();
    expect(screen.getByTestId("outputs-empty")).toHaveTextContent("No outputs yet");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("takes the reader's words in Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount();
    expect(screen.getByRole("heading", { name: "תוצרים" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^הורדת/ })).toBeInTheDocument();
  });
});
