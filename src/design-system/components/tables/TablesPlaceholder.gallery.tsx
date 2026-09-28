import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import type { GalleryModule } from "../../gallery/types";

/**
 * The Tables section's placeholder (CTA-107): plain MUI atoms, so the gallery
 * proves it discovers the section and every theme, mode and direction can be
 * looked at here. The section's own components replace it in the follow-up.
 */
const gallery: GalleryModule = {
  section: "tables",
  title: "Placeholder",
  demos: [
    {
      name: "MUI atoms",
      render: () => (
        <Table size="small" sx={{ maxWidth: 360 }}>
          <TableHead>
            <TableRow>
              <TableCell>White</TableCell>
              <TableCell>Black</TableCell>
              <TableCell>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow hover>
              <TableCell>Morphy</TableCell>
              <TableCell>Anderssen</TableCell>
              <TableCell>1-0</TableCell>
            </TableRow>
            <TableRow hover selected>
              <TableCell>Tal</TableCell>
              <TableCell>Botvinnik</TableCell>
              <TableCell>½-½</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ),
    },
  ],
};

export default gallery;
