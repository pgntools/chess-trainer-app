import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import List from "@mui/material/List";

import RecordRow from "./RecordRow";

describe("RecordRow", () => {
  it("shows the name over its caption and description, then Open, the actions and the pick", () => {
    const open = vi.fn();
    const toggle = vi.fn();
    render(
      <List>
        <RecordRow
          name="Najdorf"
          caption="24 moves"
          description="Deep lines."
          primaryAction={{ label: "Open", onClick: open }}
          actions={<button>Download</button>}
          pick={{ checked: false, onToggle: toggle, label: "Pick Najdorf" }}
          testId="probe"
        />
      </List>,
    );
    expect(screen.getByTestId("probe-name")).toHaveAttribute("dir", "auto");
    expect(screen.getByTestId("probe")).toHaveTextContent("Najdorf24 movesDeep lines.OpenDownload");
    fireEvent.click(screen.getByTestId("probe-open"));
    expect(open).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("checkbox", { name: "Pick Najdorf" }));
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it("opens by a link, and leaves out what it is not given", () => {
    render(
      <List>
        <RecordRow name="Caro-Kann" primaryAction={{ label: "Open", link: { href: "/r/1" } }} testId="probe" />
      </List>,
    );
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/r/1");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
