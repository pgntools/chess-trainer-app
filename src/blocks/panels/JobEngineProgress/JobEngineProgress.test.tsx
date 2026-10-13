import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import JobEngineProgress from "./JobEngineProgress";
import { DEEP, MATE, STARTING } from "./fixtures";

/* A running Jobs V2 job's live engine progress (CTA-190). */

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

const value = (part: string) => screen.getByTestId(`live-facts-${part}`).textContent;

describe("JobEngineProgress", () => {
  it("shows the move searched, depth / selective depth, nodes, speed, time, hash and the best line with its score", async () => {
    render(<JobEngineProgress live={DEEP} testId="live" />);
    const section = screen.getByRole("region", { name: "Engine" });
    expect(within(section).getByTestId("live-move")).toHaveTextContent("Searching 7. Nf3");
    expect(value("depth")).toBe("22/31");
    expect(value("nodes")).toBe("3.1M");
    expect(value("nps")).toBe("2.4M nodes/s");
    expect(value("time")).toBe("12.3 s");
    expect(value("hash")).toBe("46% full");
    expect(screen.getByTestId("live-line")).toHaveTextContent("Best line +0.35 Nc6 Bb5 a6 Ba4 Nf6 O-O");
    await expectNoAxeViolations();
  });

  it("leaves out what the engine has not said, and names the last position when no move is judged from it", () => {
    render(<JobEngineProgress live={STARTING} testId="live" />);
    expect(screen.getByTestId("live-move")).toHaveTextContent("Searching the final position");
    expect(value("depth")).toBe("0");
    expect(screen.queryByTestId("live-facts-nodes")).toBeNull();
    expect(screen.queryByTestId("live-facts-nps")).toBeNull();
    expect(screen.queryByTestId("live-facts-hash")).toBeNull();
    expect(screen.getByTestId("live-line")).toHaveTextContent("Best line –");
  });

  it("writes a mate as a mate", () => {
    render(<JobEngineProgress live={MATE} testId="live" />);
    expect(screen.getByTestId("live-line")).toHaveTextContent("-M3 Qh4+ g3 Qxg3#");
  });

  it("announces the move and every tenth depth — never each update", () => {
    const { rerender } = render(<JobEngineProgress live={{ ...DEEP, depth: 7 }} testId="live" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Engine searching 7. Nf3.");
    rerender(<JobEngineProgress live={{ ...DEEP, depth: 9, nodes: 9_000_000 }} testId="live" />);
    expect(status).toHaveTextContent("Engine searching 7. Nf3.");
    rerender(<JobEngineProgress live={{ ...DEEP, depth: 22 }} testId="live" />);
    expect(status).toHaveTextContent("Engine searching 7. Nf3, depth 20.");
  });

  it("speaks Hebrew, the numbers and moves kept left to right", async () => {
    await i18n.changeLanguage("he");
    render(<JobEngineProgress live={DEEP} testId="live" />);
    expect(screen.getByRole("region", { name: "מנוע" })).toBeInTheDocument();
    expect(screen.getByTestId("live-move").querySelector("bdi")).toHaveAttribute("dir", "ltr");
    expect(value("nps")).toBe("2.4M צמתים/שנ׳");
  });
});
