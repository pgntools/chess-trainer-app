import Box from "@mui/material/Box";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { DEMO_GAMES } from "../../../gallery/demoTable";
import type { GalleryModule } from "../../../gallery/types";
import TableFrame, { type TableFrameProps } from "./TableFrame";

const ROWS = Array.from({ length: 12 }, (_, index) => ({ ...DEMO_GAMES[index % DEMO_GAMES.length], n: index + 1 }));

const framed = (props: Partial<TableFrameProps>) => (
  <Box sx={{ height: 220, display: "flex", flexDirection: "column" }}>
    <TableFrame testId="gallery-table-frame" {...props}>
      <TableHead>
        <TableRow>
          <TableCell>#</TableCell>
          <TableCell>White</TableCell>
          <TableCell>Black</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {ROWS.map((row) => (
          <TableRow key={row.n} hover>
            <TableCell>{row.n}</TableCell>
            <TableCell dir="auto">{row.white}</TableCell>
            <TableCell dir="auto">{row.black}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </TableFrame>
  </Box>
);

const gallery: GalleryModule = {
  section: "tables",
  title: "TableFrame",
  demos: [
    { name: "Density normal — the body scrolls under a sticky header", render: () => framed({}) },
    { name: "Density dense", render: () => framed({ density: "dense" }) },
    { name: "Header not sticky", render: () => framed({ stickyHeader: false }) },
  ],
};

export default gallery;
