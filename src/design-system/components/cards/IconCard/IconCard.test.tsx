import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Link as RouterLink } from "react-router";

import IconCard from "./IconCard";

describe("IconCard", () => {
  it("is one link to its screen", () => {
    render(
      <MemoryRouter>
        <IconCard icon={<svg />} label="Library" link={{ component: RouterLink, to: "/library" }} testId="probe" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute("href", "/library");
  });

  it("is a button with its description when given a click", () => {
    const onClick = vi.fn();
    render(<IconCard icon={<svg />} label="Library" description="Collections." onClick={onClick} testId="probe" />);
    fireEvent.click(screen.getByRole("button", { name: /Library/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("probe")).toHaveTextContent("Collections.");
  });
});
