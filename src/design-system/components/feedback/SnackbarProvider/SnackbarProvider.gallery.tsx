import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import type { GalleryModule } from "../../../gallery/types";
import WithHook from "../../../gallery/WithHook";
import SnackbarProvider from "./SnackbarProvider";
import type { SnackbarMessage } from "./snackbarContext";
import { useSnackbar } from "./useSnackbar";

/** A button per message; the snackbar opens at the bottom of the window, under the preview's theme. */
const buttons = (messages: { name: string; message: SnackbarMessage | SnackbarMessage[] }[]) => (
  <SnackbarProvider testId="gallery-snackbar">
    <WithHook hook={useSnackbar} args={[]}>
      {({ show }) => (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {messages.map(({ name, message }) => (
            <Button
              key={name}
              size="small"
              variant="outlined"
              onClick={() => (Array.isArray(message) ? message : [message]).forEach(show)}
            >
              {name}
            </Button>
          ))}
        </Box>
      )}
    </WithHook>
  </SnackbarProvider>
);

const gallery: GalleryModule = {
  section: "feedback",
  title: "SnackbarProvider + useSnackbar",
  demos: [
    {
      name: "Plain message (3 s) — the move menu's “Copied”",
      render: () => buttons([{ name: "Copy variation PGN", message: { message: "Copied the variation's PGN.", duration: 3000 } }]),
    },
    {
      name: "Severities, filled",
      render: () =>
        buttons([
          { name: "Success", message: { message: "Saved.", severity: "success" } },
          { name: "Info", message: { message: "The engine is thinking.", severity: "info" } },
          { name: "Warning", message: { message: "3 games could not be read.", severity: "warning" } },
          { name: "Error", message: { message: "The save failed: storage is full.", severity: "error" } },
        ]),
    },
    {
      name: "With an action that is a link (href), 10 s — the collection's Analyse notice",
      render: () =>
        buttons([
          {
            name: "Analyse 12 games",
            message: { message: "12 games saved to Saved analyses.", severity: "success", duration: 10000, action: { label: "Open", onClick: () => {}, href: "#saved-analyses" } },
          },
        ]),
    },
    {
      name: "Until dismissed (duration null)",
      render: () => buttons([{ name: "Show", message: { message: "Stays until closed.", severity: "info", duration: null } }]),
    },
    {
      name: "A queue — three at once show in turn",
      render: () =>
        buttons([
          {
            name: "Queue three",
            message: [
              { message: "First", duration: 1500 },
              { message: "Second", severity: "success", duration: 1500 },
              { message: "Third", severity: "error", duration: 1500 },
            ],
          },
        ]),
    },
  ],
};

export default gallery;
