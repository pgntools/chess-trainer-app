import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../gallery/types";

/**
 * The Dialogs section's placeholder (CTA-107): plain MUI atoms, so the gallery
 * proves it discovers the section and every theme, mode and direction can be
 * looked at here. The section's own components replace it in the follow-up.
 */
const gallery: GalleryModule = {
  section: "dialogs",
  title: "Placeholder",
  demos: [
    {
      name: "MUI atoms",
      render: () => (
        <Paper elevation={8} sx={{ maxWidth: 360 }}>
          <DialogTitle>Delete 3 games?</DialogTitle>
          <DialogContent>
            <Typography variant="body2">This cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button>Cancel</Button>
            <Button variant="contained" color="error">
              Delete
            </Button>
          </DialogActions>
        </Paper>
      ),
    },
  ],
};

export default gallery;
