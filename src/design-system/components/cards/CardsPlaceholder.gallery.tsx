import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../gallery/types";

/**
 * The Cards section's placeholder (CTA-107): plain MUI atoms, so the gallery
 * proves it discovers the section and every theme, mode and direction can be
 * looked at here. The section's own components replace it in the follow-up.
 */
const gallery: GalleryModule = {
  section: "cards",
  title: "Placeholder",
  demos: [
    {
      name: "MUI atoms",
      render: () => (
        <Card variant="outlined" sx={{ maxWidth: 280 }}>
          <CardContent>
            <Typography variant="subtitle2">My repertoire</Typography>
            <Typography variant="caption" color="text.secondary">
              42 lines · White
            </Typography>
          </CardContent>
          <CardActions>
            <Button size="small">Open</Button>
          </CardActions>
        </Card>
      ),
    },
  ],
};

export default gallery;
