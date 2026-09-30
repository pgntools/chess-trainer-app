import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import NavDrawer from "./NavDrawer";

/* A reader's own words among them, so the RTL switch shows the sheet as Hebrew has it. */
const links = ["Lobby", "Analysis Board", "Openings explorer", "מאגר הפתיחות שלי", "Collections"];

const gallery: GalleryModule = {
  section: "navigation",
  title: "NavDrawer",
  demos: [
    {
      name: "A narrow window's navigation — Escape closes it, the focus comes back to the button (try RTL)",
      render: () => (
        <WithState initial={false}>
          {(open, setOpen) => (
            <Box>
              <Button onClick={() => setOpen(true)} data-testid="gallery-nav-open">
                Open navigation
              </Button>
              <NavDrawer
                open={open}
                onClose={() => setOpen(false)}
                label="Main navigation"
                testId="gallery-nav-drawer"
              >
                <Box component="nav" aria-label="Main navigation" sx={{ p: 2 }}>
                  {links.map((link) => (
                    <Typography key={link} variant="body2" dir="auto" sx={{ py: 1 }}>
                      {link}
                    </Typography>
                  ))}
                </Box>
              </NavDrawer>
            </Box>
          )}
        </WithState>
      ),
    },
    {
      name: "A wider sheet (360 px)",
      render: () => (
        <WithState initial={false}>
          {(open, setOpen) => (
            <Box>
              <Button onClick={() => setOpen(true)} data-testid="gallery-nav-wide-open">
                Open the wide sheet
              </Button>
              <NavDrawer
                open={open}
                onClose={() => setOpen(false)}
                label="Filters"
                width={360}
                testId="gallery-nav-wide"
              >
                <Typography variant="body2" sx={{ p: 2 }}>
                  Anything a rail held fits here.
                </Typography>
              </NavDrawer>
            </Box>
          )}
        </WithState>
      ),
    },
  ],
};

export default gallery;
