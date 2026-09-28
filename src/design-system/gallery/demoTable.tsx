import type { ReactNode } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

/** A few games, the tables' gallery demos' rows. */
export const DEMO_GAMES = [
  { id: "g1", white: "Tal, Mikhail", black: "Fischer, Robert James", elo: 2700, moves: 41, date: "1960-05-12" },
  { id: "g2", white: "Capablanca, José Raúl", black: "Alekhine, Alexander", elo: undefined, moves: 82, date: "1927.11" },
  { id: "g3", white: "Petrosian, Tigran", black: "Spassky, Boris", elo: 2650, moves: 27, date: undefined },
  { id: "g4", white: "Smyslov, Vasily", black: "Botvinnik, Mikhail", elo: 2720, moves: 63, date: "1961-03-20" },
] as const;

/**
 * A small plain table for a cell's demo: `head`'s cells over `rows`, each a
 * row of cells — the parts a cell needs around it and nothing more.
 */
export const demoTable = (head: ReactNode, rows: ReactNode[]) => (
  <Table size="small">
    <TableHead>
      <TableRow>{head}</TableRow>
    </TableHead>
    <TableBody>
      {rows.map((row, index) => (
        <TableRow key={index} hover>
          {row}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

/** {@link demoTable} for a body of whole rows — a demo of a row component (the empty row, the loading row). */
export const demoTableOfRows = (head: ReactNode, rows: ReactNode) => (
  <Table size="small">
    <TableHead>
      <TableRow>{head}</TableRow>
    </TableHead>
    <TableBody>{rows}</TableBody>
  </Table>
);

/** A plain body cell, for the columns around the one a demo shows. */
export const textCell = (text: ReactNode) => <TableCell>{text}</TableCell>;
