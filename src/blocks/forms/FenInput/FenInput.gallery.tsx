import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import FenInput from "./FenInput";
import { BROKEN, FEN, PROBLEM } from "./fixtures";

const demo = (initial: string, error: string | null = null) => (
  <WithState initial={initial}>
    {(value, setValue) => (
      <Box sx={{ width: 340 }}>
        <FenInput label="Paste a FEN" submitLabel="Set position" value={value} onChange={setValue} onSubmit={() => {}} error={error} testId="gallery-fen" />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "FenInput",
  demos: [
    { name: "Empty — the button off", render: () => demo("") },
    { name: "A FEN, ready", render: () => demo(FEN) },
    { name: "One it could not read", render: () => demo(BROKEN, PROBLEM) },
  ],
};

export default gallery;
