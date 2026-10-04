import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { expectNoAxeViolations } from "../../../../test/axe";
import Flag from "./Flag";
import { FLAG_URLS } from "./flagUrls";

describe("Flag", () => {
  it("is an image read by the country's name, and titled with it", () => {
    render(<Flag code="DE" label="Germany" testId="probe" />);
    const flag = screen.getByRole("img", { name: "Germany" });
    expect(flag).toHaveAttribute("title", "Germany");
    expect(flag).toHaveAttribute("data-flag", "de");
    expect(flag.getAttribute("src")).toMatch(/de\.svg/);
  });

  it("has the parts of the United Kingdom", () => {
    render(<Flag code="gb-sct" label="Scotland" />);
    expect(screen.getByRole("img", { name: "Scotland" }).getAttribute("src")).toMatch(/gb-sct\.svg/);
  });

  it("shows its fallback for a code with no flag, and nothing with none", () => {
    const { container, unmount } = render(<Flag code="fid" label="FIDE" fallback="FID" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("FID");
    unmount();
    expect(render(<Flag code="zz" label="Nowhere" />).container).toBeEmptyDOMElement();
  });

  it("knows every flag of the package, by its code", () => {
    expect(Object.keys(FLAG_URLS).length).toBeGreaterThan(250);
    expect(FLAG_URLS["gb-eng"]).toBeDefined();
  });

  it("passes axe", async () => {
    render(<Flag code="fr" label="France" />);
    await expectNoAxeViolations();
  });
});
