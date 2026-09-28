import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import ExpandToggle from "./ExpandToggle";

const gallery: GalleryModule = {
  section: "navigation",
  title: "ExpandToggle",
  demos: [
    {
      name: "A tree row — closed points along the text, open points down (try RTL)",
      render: () => (
        <WithState initial={false}>
          {(expanded, setExpanded) => (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <ExpandToggle
                  expanded={expanded}
                  onToggle={() => setExpanded(!expanded)}
                  label={expanded ? "Close Openings" : "Open Openings"}
                  testId="gallery-expand"
                />
                <Typography variant="body2">Openings</Typography>
              </Box>
              {expanded && (
                <Typography variant="body2" color="text.secondary" sx={{ paddingInlineStart: 4 }}>
                  Sicilian · French · Caro-Kann
                </Typography>
              )}
            </Box>
          )}
        </WithState>
      ),
    },
    {
      name: "Open",
      render: () => <ExpandToggle expanded onToggle={() => {}} label="Close Built-in" testId="gallery-expand-open" />,
    },
  ],
};

export default gallery;
