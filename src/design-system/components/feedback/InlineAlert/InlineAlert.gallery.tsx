import Button from "@mui/material/Button";

import type { GalleryModule } from "../../../gallery/types";
import InlineAlert from "./InlineAlert";

const gallery: GalleryModule = {
  section: "feedback",
  title: "InlineAlert",
  demos: [
    { name: "Error", render: () => <InlineAlert severity="error" testId="gallery-alert-error">The file could not be read.</InlineAlert> },
    {
      name: "Error with a title and an LTR detail block",
      render: () => (
        <InlineAlert severity="error" title="Not a PGN" detail={'1. e4 e5 2. Nf3 Nc6 3. Bb5 ?? — unexpected token at 3…'} testId="gallery-alert-detail">
          The third move could not be read.
        </InlineAlert>
      ),
    },
    { name: "Success", render: () => <InlineAlert severity="success" testId="gallery-alert-success">Downloaded chessapp-2026-09-28.zip.</InlineAlert> },
    {
      name: "Warning, outlined, with an action",
      render: () => (
        <InlineAlert
          severity="warning"
          variant="outlined"
          action={
            <Button color="inherit" size="small">
              Edit
            </Button>
          }
          testId="gallery-alert-warning"
        >
          This position cannot be played from: both kings are in check.
        </InlineAlert>
      ),
    },
    { name: "Info, dense, dismissible", render: () => <InlineAlert severity="info" dense onClose={() => {}} testId="gallery-alert-info">Nothing is written until you confirm.</InlineAlert> },
  ],
};

export default gallery;
