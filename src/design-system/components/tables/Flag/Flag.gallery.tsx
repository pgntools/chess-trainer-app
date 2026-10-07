import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import Flag from "./Flag";

const FLAGS: [string, string][] = [
  ["de", "Germany"],
  ["fr", "France"],
  ["gb-eng", "England"],
  ["gb-sct", "Scotland"],
  ["uz", "Uzbekistan"],
  ["jp", "Japan"],
];

const gallery: GalleryModule = {
  section: "tables",
  title: "Flag",
  demos: [
    {
      name: "Beside names — a line high, read by the country's name, the parts of the United Kingdom their own",
      render: () => (
        <Box sx={{ display: "grid", gap: 1 }}>
          {FLAGS.map(([code, label]) => (
            <Box key={code}>
              Ada Lovelace <Flag code={code} label={label} />
            </Box>
          ))}
        </Box>
      ),
    },
    {
      name: "A code with no flag — its fallback in its place",
      render: () => (
        <Box>
          Alan Turing <Flag code="fid" label="FIDE" fallback={<Box component="span" sx={{ color: "text.secondary" }}>FID</Box>} />
        </Box>
      ),
    },
    {
      name: "A larger line — the flag grows with the text",
      render: () => (
        <Box sx={{ typography: "h5" }}>
          Grace Hopper <Flag code="us" label="United States" />
        </Box>
      ),
    },
    {
      name: "Hebrew names (switch the direction to RTL)",
      render: () => (
        <Box>
          עדה לאבלייס <Flag code="il" label="ישראל" />
        </Box>
      ),
    },
  ],
};

export default gallery;
