import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { CaseRow } from "../../../lib/analysisCaseRows";
import type { BlockFamilyId } from "../../families";
import CaseSiblings from "./CaseSiblings";
import { HEBREW_ROWS, ROWS } from "./fixtures";

const href = (id: string) => ({ href: `#case-${id}` });

const demo = (rows: readonly CaseRow[], currentId: string, initiallyCollapsed = false) => (
  <WithState<{ text: string; collapsed: boolean }> initial={{ text: "", collapsed: initiallyCollapsed }}>
    {(state, setState) => {
      const shown = rows.filter((row) => row.name.toLowerCase().includes(state.text.toLowerCase()));
      const at = shown.findIndex((row) => row.id === currentId);
      return (
        <Box sx={{ width: state.collapsed ? 48 : 400, height: 420, display: "flex", flexDirection: "column" }}>
          <CaseSiblings
            projectName="Club Championship"
            rows={shown}
            currentId={currentId}
            linkOf={(row) => href(row.id)}
            closeLink={{ href: "#project" }}
            previous={at > 0 ? href(shown[at - 1].id) : undefined}
            next={at >= 0 && at < shown.length - 1 ? href(shown[at + 1].id) : undefined}
            text={state.text}
            onTextChange={(text) => setState({ ...state, text })}
            collapsed={state.collapsed}
            onCollapsedChange={(collapsed) => setState({ ...state, collapsed })}
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
    { name: "Folded to a rail", render: () => demo(ROWS, "cpos", true) },
    { name: "A Hebrew name (switch to RTL — the arrows turn)", render: () => demo(HEBREW_ROWS, "cheb") },
  ],
};

export default gallery;
