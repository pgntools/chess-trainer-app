import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import CollectionDetails, { type CollectionDetailsTab } from "./CollectionDetails";
import { CLOSE_LINK, HEBREW_NAME, LONG_NAME, NAME } from "./fixtures";

const demo = (name: string, tab: CollectionDetailsTab = "general") => (
  <WithState<{ tab: CollectionDetailsTab; on: boolean }> initial={{ tab, on: false }}>
    {(state, setState) => (
      <Box sx={{ width: 400, height: 320, display: "flex", flexDirection: "column" }}>
        <CollectionDetails
          name={name}
          closeLink={CLOSE_LINK}
          tab={state.tab}
          onTabChange={(next) => setState({ ...state, tab: next })}
          exampleOption={state.on}
          onExampleOptionChange={(on) => setState({ ...state, on })}
          testId="gallery-collection-details"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "CollectionDetails",
  demos: [
    { name: "A collection, General's placeholder open", render: () => demo(NAME) },
    { name: "The example switch on Options", render: () => demo(NAME, "options") },
    { name: "A long name, wrapping in the head", render: () => demo(LONG_NAME) },
    { name: "A Hebrew name (switch to RTL)", render: () => demo(HEBREW_NAME) },
  ],
};

export default gallery;
