import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import { ThemeProvider } from "@mui/material/styles";

import { buildTheme } from "../../../theme";
import { defaultTheme } from "../../../themes";
import DateCell from "./DateCell";
import { tableDate } from "./tableDate";

describe("tableDate", () => {
  it("writes a date as YYYY-MM-DD, the reader's own day", () => {
    expect(tableDate(new Date(2026, 8, 3, 23, 30))?.text).toBe("2026-09-03");
    expect(tableDate(new Date(2026, 0, 1).getTime())?.text).toBe("2026-01-01");
  });

  it("shows a PGN's partial date as given", () => {
    expect(tableDate("1848")).toEqual({ text: "1848", dateTime: "1848" });
    expect(tableDate("1927.11")?.text).toBe("1927-11");
  });

  it("reads nothing, and anything unreadable, as missing", () => {
    expect(tableDate(undefined)).toBeUndefined();
    expect(tableDate("")).toBeUndefined();
    expect(tableDate("not a date")).toBeUndefined();
  });
});

describe("DateCell", () => {
  it("keeps the date left to right in a <time>, under RTL too", () => {
    render(
      <ThemeProvider theme={buildTheme(defaultTheme, "light", "rtl")}>
        <Table dir="rtl">
          <TableBody>
            <TableRow>
              <DateCell value={new Date(2026, 8, 28)} testId="probe" />
              <DateCell value={undefined} testId="missing" />
            </TableRow>
          </TableBody>
        </Table>
      </ThemeProvider>,
    );
    const time = screen.getByTestId("probe").querySelector("time");
    expect(time).toHaveAttribute("dir", "ltr");
    expect(time).toHaveAttribute("datetime", "2026-09-28");
    expect(time).toHaveTextContent("2026-09-28");
    expect(screen.getByTestId("missing")).toHaveTextContent("–");
  });
});
