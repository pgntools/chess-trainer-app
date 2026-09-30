import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import StatusText from "./StatusText";

const gallery: GalleryModule = {
  section: "feedback",
  title: "StatusText",
  demos: [
    { name: "Error — role alert", render: () => <StatusText tone="error" testId="gallery-status-error">The save failed: storage is full.</StatusText> },
    { name: "Success — role status", render: () => <StatusText tone="success" testId="gallery-status-success">Loaded 1 game.</StatusText> },
    {
      name: "Neutral and emphasised — a game's result under its board",
      render: () => <StatusText tone="neutral" emphasis testId="gallery-status-neutral">Game over · 1-0</StatusText>,
    },
    {
      name: "Warning and info",
      render: () => (
        <Box sx={{ display: "grid", gap: 0.5 }}>
          <StatusText tone="warning" testId="gallery-status-warning">Fixed at 1 in this build.</StatusText>
          <StatusText tone="info" testId="gallery-status-info">The engine is off.</StatusText>
        </Box>
      ),
    },
  ],
};

export default gallery;
