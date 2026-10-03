import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";

import { demoTable, textCell } from "../../../gallery/demoTable";
import type { GalleryModule } from "../../../gallery/types";
import ResultMark from "./ResultMark";

const gallery: GalleryModule = {
  section: "tables",
  title: "ResultMark",
  demos: [
    {
      name: "The five outcomes — a win, a draw, a loss, an unfinished game, no game (each read by its words, not its glyph)",
      render: () =>
        demoTable(
          <>
            {textCell("Player")}
            {textCell("1")}
            {textCell("2")}
            {textCell("3")}
            {textCell("4")}
            {textCell("5")}
          </>,
          [
            <>
              {textCell("Ada Lovelace")}
              <TableCell>
                <ResultMark outcome="win" label="Round 1, against Alan Turing: win" />
              </TableCell>
              <TableCell>
                <ResultMark outcome="draw" label="Round 2, against Grace Hopper: draw" />
              </TableCell>
              <TableCell>
                <ResultMark outcome="loss" label="Round 3, against Donald Knuth: loss" />
              </TableCell>
              <TableCell>
                <ResultMark outcome="unfinished" label="Round 4, against Barbara Liskov: unfinished" />
              </TableCell>
              <TableCell>
                <ResultMark outcome="none" label="Round 5: no game" />
              </TableCell>
            </>,
          ],
        ),
    },
    {
      name: "Several in one cell, a space between — every result between the same two",
      render: () =>
        demoTable(<>{textCell("Player")}{textCell("Alan Turing")}</>, [
          <>
            {textCell("Ada Lovelace")}
            <TableCell>
              <ResultMark outcome="draw" label="Round 2, against Alan Turing: draw" />{" "}
              <ResultMark outcome="win" label="Round 9, against Alan Turing: win" />
            </TableCell>
          </>,
        ]),
    },
    {
      name: "A legend's entries — the glyph, then its words in view",
      render: () => (
        <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 3, typography: "caption" }}>
          <ResultMark legend outcome="unfinished" label="unfinished game" />
          <ResultMark legend outcome="none" label="no game in the file" />
        </Box>
      ),
    },
    {
      name: "A caller's own glyphs — a team match's board points, toned by the match's outcome (CTA-128)",
      render: () =>
        demoTable(<>{textCell("Team")}{textCell("1")}{textCell("2")}{textCell("3")}</>, [
          <>
            {textCell("Lovelace Club")}
            <TableCell>
              <ResultMark outcome="win" glyph="4½" label="Round 1, against Turing Club: 4½–1½, won" />
            </TableCell>
            <TableCell>
              <ResultMark outcome="draw" glyph="3" label="Round 2, against Hopper Club: 3–3, drawn" />
            </TableCell>
            <TableCell>
              <ResultMark outcome="loss" glyph="1½" label="Round 3, against Knuth Club: 1½–4½, lost" />
            </TableCell>
          </>,
        ]),
    },
    {
      name: "A Hebrew legend (switch the direction to RTL)",
      render: () => (
        <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 3, typography: "caption" }}>
          <ResultMark legend outcome="unfinished" label="משחק שלא הסתיים" />
          <ResultMark legend outcome="none" label="אין משחק בקובץ" />
        </Box>
      ),
    },
  ],
};

export default gallery;
