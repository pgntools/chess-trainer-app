import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { expectNoAxeViolations } from "../../../test/axe";
import JobEngineSettings from "./JobEngineSettings";
import { HEBREW, NO_OPTIONS, NO_PRESET, WITH_OPTIONS } from "./fixtures";

const valuesOf = (list: HTMLElement) => within(list).getAllByRole("definition").map((value) => value.textContent);
const namesOf = (list: HTMLElement) => within(list).getAllByRole("term").map((term) => term.textContent);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("JobEngineSettings (CTA-248)", () => {
  it("draws the engine, the preset and the search, and lists the options the preset sent", async () => {
    render(<JobEngineSettings settings={WITH_OPTIONS} testId="probe" />);
    const plate = screen.getByRole("region", { name: "Engine settings" });
    expect(plate).toBe(screen.getByTestId("probe"));
    expect(within(plate).getByRole("heading", { level: 3, name: "Engine settings" })).toBeInTheDocument();
    const facts = screen.getByTestId("probe-facts");
    expect(namesOf(facts)).toEqual(["Engine", "Preset", "Depth", "Time per move", "Lines", "Threads", "Hash"]);
    expect(valuesOf(facts)).toEqual(["Stockfish 19 Lite", "Deep analysis", "24", "5 s", "3", "4", "256 MB"]);
    for (const id of ["depth", "lines", "threads", "hash"]) {
      expect(screen.getByTestId(`probe-facts-${id}`).querySelector("bdi")).toHaveAttribute("dir", "ltr");
    }

    expect(within(plate).getByRole("heading", { level: 4, name: "Options the preset sent" })).toBeInTheDocument();
    const sent = within(plate).getByLabelText("Options the preset sent");
    expect(namesOf(sent)).toEqual(["Threads", "Hash", "UCI_ShowWDL", "Contempt", "SyzygyPath"]);
    expect(valuesOf(sent)).toEqual(["4", "256", "true", "24", "/opt/syzygy"]);
    expect(within(sent).getAllByRole("term")[2]!.querySelector("bdi")).toHaveAttribute("dir", "ltr");
    expect(screen.getByTestId("probe-options-SyzygyPath").querySelector("bdi")).toHaveAttribute("dir", "ltr");
    expect(screen.queryByTestId("probe-no-options")).toBeNull();
    await expectNoAxeViolations(plate);
  });

  it("says a preset that sent nothing, and a search with no time limit", async () => {
    render(<JobEngineSettings settings={NO_OPTIONS} headingLevel="h2" testId="probe" />);
    const plate = screen.getByRole("region", { name: "Engine settings" });
    expect(within(plate).getByRole("heading", { level: 2, name: "Engine settings" })).toBeInTheDocument();
    expect(within(plate).getByRole("heading", { level: 3, name: "Options the preset sent" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-facts-preset")).toHaveTextContent("Default");
    expect(screen.getByTestId("probe-facts-time")).toHaveTextContent("No limit");
    expect(screen.getByTestId("probe-no-options")).toHaveTextContent("The preset sent no options — the engine ran with its own defaults.");
    expect(within(plate).queryByLabelText("Options the preset sent")).toBeNull();
    await expectNoAxeViolations(plate);
  });

  it("says a preset was not recorded, the engine by the id it was asked for", () => {
    render(<JobEngineSettings settings={NO_PRESET} testId="probe" />);
    expect(screen.getByTestId("probe-facts-engine")).toHaveTextContent("stockfish-19-lite-single");
    expect(screen.getByTestId("probe-facts-preset")).toHaveTextContent("None recorded");
    expect(screen.getByTestId("probe-facts-time")).toHaveTextContent("2.5 s");
    expect(screen.getByTestId("probe-no-options")).toBeInTheDocument();
  });

  it("reads in Hebrew, right to left — the numbers and the options left to right", async () => {
    await i18n.changeLanguage("he");
    render(
      <AppThemeWithLang>
        <JobEngineSettings settings={HEBREW} testId="probe" />
      </AppThemeWithLang>,
    );
    const plate = screen.getByRole("region", { name: "הגדרות המנוע" });
    expect(screen.getByTestId("probe-facts-preset")).toHaveTextContent("ניתוח עמוק");
    const sent = within(plate).getByLabelText("האפשרויות שהפריסט שלח");
    expect(namesOf(sent)).toEqual(["Threads", "Skill Level", "UCI_ShowWDL"]);
    expect(valuesOf(sent)).toEqual(["4", "20", "false"]);
    expect(screen.getByTestId("probe-options-Skill Level").querySelector("bdi")).toHaveAttribute("dir", "ltr");
    expect(screen.getByTestId("probe-facts-hash").querySelector("bdi")).toHaveAttribute("dir", "ltr");
    await expectNoAxeViolations(plate);
  });
});
