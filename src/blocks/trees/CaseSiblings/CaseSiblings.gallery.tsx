import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { CaseRow } from "../../../lib/analysisCaseRows";
import type { BlockFamilyId } from "../../families";
import CaseSiblings from "./CaseSiblings";
import { HEBREW_ROWS, ROWS } from "./fixtures";

const href = (id: string) => ({ href: `#case-${id}` });

const demo = (rows: readonly CaseRow[], currentId: string) => (
  <WithState<{ text: string }> initial={{ text: "" }}>
    {(state, setState) => {
      const shown = rows.filter((row) => row.name.toLowerCase().includes(state.text.toLowerCase()));
      const at = shown.findIndex((row) => row.id === currentId);
      return (
        <Box sx={{ width: 400, height: 420, display: "flex", flexDirection: "column" }}>
          <CaseSiblings
            projectName="Club Championship"
            rows={shown}
            currentId={currentId}
            linkOf={(row) => href(row.id)}
            closeLink={{ href: "#project" }}
            previous={at > 0 ? href(shown[at - 1].id) : undefined}
            next={at >= 0 && at < shown.length - 1 ? href(shown[at + 1].id) : undefined}
            text={state.text}
            onTextChange={(text) => setState({ text })}
            testId="gallery-case-siblings"
          />
        </Box>
      );
    }}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "trees",
  title: "CaseSiblings",
  demos: [
    { name: "A Project's Cases, the second on the board — type to narrow them", render: () => demo(ROWS, "cpos") },
    { name: "A Hebrew name (switch to RTL — the arrows turn)", render: () => demo(HEBREW_ROWS, "cheb") },
  ],
};

export default gallery;
