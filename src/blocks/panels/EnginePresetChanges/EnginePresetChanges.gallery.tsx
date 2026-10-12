import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import EnginePresetChanges from "./EnginePresetChanges";
import { DEEP_NAME, DEFAULT_NAME, LONG_NAME } from "./fixtures";

const noop = () => {};

const demo = (presetName: string, testId: string) => (
  <Box sx={{ width: 420 }}>
    <EnginePresetChanges presetName={presetName} onSave={noop} onSaveAs={noop} testId={testId} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "EnginePresetChanges",
  demos: [
    { name: "Default changed — save, or save as a new preset", render: () => demo(DEFAULT_NAME, "gallery-preset-changes") },
    { name: "A preset of the reader's own", render: () => demo(DEEP_NAME, "gallery-preset-changes-own") },
    { name: "A long name", render: () => demo(LONG_NAME, "gallery-preset-changes-long") },
  ],
};

export default gallery;
