import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import FileInputButton, { type FileInputButtonProps } from "./FileInputButton";

const live = (props: Partial<FileInputButtonProps>) => (
  <WithState initial={[] as string[]}>
    {(names, setNames) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <FileInputButton
          label="Choose a PGN file"
          accept=".pgn"
          onFiles={(files) => setNames(files.map((file) => file.name))}
          testId="gallery-file"
          {...props}
        />
        <Typography variant="caption" color="text.secondary">
          {names.length === 0 ? "Nothing picked" : names.join(", ")}
        </Typography>
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule = {
  section: "forms",
  title: "FileInputButton",
  demos: [
    { name: "Contained (the default)", render: () => live({}) },
    { name: "Outlined, small", render: () => live({ variant: "outlined", size: "small", label: "Load a file" }) },
    { name: "Several files, an accept list", render: () => live({ multiple: true, accept: [".pgn", ".zip"], label: "Choose files" }) },
    { name: "No icon, disabled", render: () => live({ startIcon: null, disabled: true, label: "Choose a .zip" }) },
  ],
};

export default gallery;
