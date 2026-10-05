import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import TextInputField, { type TextInputFieldProps } from "./TextInputField";

const live = (initial: string, props: Partial<TextInputFieldProps> & { label: string }) => (
  <Box sx={{ maxWidth: 320 }}>
    <WithState initial={initial}>
      {(value, setValue) => <TextInputField value={value} onChange={setValue} testId="gallery-text" {...props} />}
    </WithState>
  </Box>
);

const gallery: GalleryModule = {
  section: "forms",
  title: "TextInputField",
  demos: [
    { name: "Plain — a reader's words", render: () => live("Ocean", { label: "Name", dir: "auto" }) },
    {
      name: "Machine words, left to right, with a caption and a placeholder",
      render: () => live("", { label: "Font family", dir: "ltr", placeholder: "Roboto, sans-serif", helperText: "A CSS font stack, first choice first." }),
    },
    {
      name: "Invalid — the caption says why",
      render: () => live("Ocean Blue", { label: "Id", dir: "ltr", error: true, helperText: "Lower-case words joined by dashes." }),
    },
    { name: "Disabled", render: () => live("default", { label: "Id", dir: "ltr", disabled: true }) },
    {
      name: "Several lines — a summary",
      render: () => live("Where an article's file goes, and what it may embed.", { label: "Summary", dir: "auto", multiline: true }),
    },
    { name: "A number", render: () => live("70", { label: "Order", type: "number", helperText: "Empty: not pinned." }) },
    { name: "A date", render: () => live("2026-09-14", { label: "Date", type: "date" }) },
  ],
};

export default gallery;
