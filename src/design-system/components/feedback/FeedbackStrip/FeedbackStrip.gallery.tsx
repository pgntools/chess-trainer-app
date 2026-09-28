import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../gallery/types";
import FeedbackStrip from "./FeedbackStrip";

const gallery: GalleryModule = {
  section: "feedback",
  title: "FeedbackStrip",
  demos: [
    {
      name: "Info — the comment block",
      render: () => (
        <FeedbackStrip tone="info" testId="gallery-strip-info">
          <Typography variant="body2" sx={{ fontStyle: "italic" }}>
            A sharp line — White gives up the exchange for the attack.
          </Typography>
        </FeedbackStrip>
      ),
    },
    {
      name: "Success, with actions — the changes strip",
      render: () => (
        <FeedbackStrip
          tone="success"
          ariaLabel="Unsaved changes"
          actions={
            <>
              <Button size="small" variant="contained">
                Update
              </Button>
              <Button size="small">Save as copy</Button>
              <Button size="small" color="inherit">
                Discard
              </Button>
            </>
          }
          testId="gallery-strip-success"
        >
          <Typography variant="body2">3 moves added since the last save.</Typography>
        </FeedbackStrip>
      ),
    },
    {
      name: "Neutral, capped height — the next-moves bar",
      render: () => (
        <FeedbackStrip tone="neutral" maxHeight={64} testId="gallery-strip-neutral">
          {Array.from({ length: 6 }, (_, index) => (
            <Typography key={index} variant="body2" dir="ltr">
              {index + 1}. e4 e5 2. Nf3 Nc6 3. Bb5 a6
            </Typography>
          ))}
        </FeedbackStrip>
      ),
    },
  ],
};

export default gallery;
