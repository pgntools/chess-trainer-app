import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { pgnFile } from "./fixtures";
import NewProjectDialog, { type NewProjectDialogProps } from "./NewProjectDialog";

const mount = (props: Partial<NewProjectDialogProps> = {}) =>
  render(<NewProjectDialog open onClose={() => {}} onCreate={() => {}} testId="probe" {...props} />);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("NewProjectDialog (CTA-186)", () => {
  it("makes a Project of a name alone", async () => {
    const onCreate = vi.fn();
    const { baseElement } = mount({ onCreate });
    const create = screen.getByRole("button", { name: "Create" });
    expect(create).toBeDisabled();
    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "Najdorf");
    await userEvent.click(create);
    expect(onCreate).toHaveBeenCalledWith("Najdorf", undefined);
    await expectNoAxeViolations(baseElement);
  });

  it("takes a .pgn, naming the Project after it when no name was typed — and lets it go again", async () => {
    const onCreate = vi.fn();
    mount({ onCreate });
    const file = pgnFile();
    await userEvent.upload(screen.getByTestId("probe-file-input"), file);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("club-championship");
    expect(screen.getByTestId("probe-picked")).toHaveTextContent("club-championship.pgn");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onCreate).toHaveBeenCalledWith("club-championship", file);

    await userEvent.click(screen.getByRole("button", { name: "Remove club-championship.pgn" }));
    expect(screen.queryByTestId("probe-picked")).toBeNull();
  });

  it("says the screen's problem", () => {
    mount({ problem: "No game could be read in that file." });
    expect(screen.getByTestId("probe-problem")).toHaveTextContent("No game could be read in that file.");
  });

  it("tells the screen a file was picked, with the name as it then stands (CTA-208)", async () => {
    const onFilePicked = vi.fn();
    mount({ onFilePicked });
    const file = pgnFile();
    await userEvent.upload(screen.getByTestId("probe-file-input"), file);
    // No name typed: the file's.
    expect(onFilePicked).toHaveBeenLastCalledWith(file.name.replace(/\.pgn$/i, ""), file);

    await userEvent.click(screen.getByTestId("probe-picked-remove"));
    const name = screen.getByRole("textbox", { name: "Name" });
    await userEvent.clear(name);
    await userEvent.type(name, "Najdorf");
    await userEvent.upload(screen.getByTestId("probe-file-input"), file);
    expect(onFilePicked).toHaveBeenLastCalledWith("Najdorf", file);
  });
});
