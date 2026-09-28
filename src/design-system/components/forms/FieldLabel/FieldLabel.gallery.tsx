import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";

import type { GalleryModule } from "../../../gallery/types";
import FieldLabel from "./FieldLabel";

const gallery: GalleryModule = {
  section: "forms",
  title: "FieldLabel",
  demos: [
    {
      name: "A label for one control",
      render: () => (
        <Box>
          <FieldLabel htmlFor="gallery-field-label-fen">FEN</FieldLabel>
          <TextField id="gallery-field-label-fen" size="small" fullWidth defaultValue="8/8/8/8/8/8/8/K6k w - - 0 1" slotProps={{ htmlInput: { dir: "ltr" } }} />
        </Box>
      ),
    },
    {
      name: "A legend heading a fieldset",
      render: () => (
        <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
          <FieldLabel component="legend">Castling</FieldLabel>
          <FormControlLabel control={<Checkbox size="small" defaultChecked />} label="White O-O" />
          <FormControlLabel control={<Checkbox size="small" />} label="White O-O-O" />
        </Box>
      ),
    },
  ],
};

export default gallery;
