import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { RepertoireEvaluationReport as Report } from "../../../lib/jobs/kinds/repertoireEvaluation/core";
import type { BlockFamilyId } from "../../families";
import RepertoireEvaluationReport from "./RepertoireEvaluationReport";
import { ALL_GOOD, BLACK, EMPTY, FINISHED, IN_PROGRESS, LARGE } from "./fixtures";

type DemoState = { flaggedOnly: boolean; page: number; rowsPerPage: number };

const demo = (report: Report, { flaggedOnly = false, links = true }: { flaggedOnly?: boolean; links?: boolean } = {}) => (
  <WithState<DemoState> initial={{ flaggedOnly, page: 0, rowsPerPage: 25 }}>
    {(state, set) => (
      <Box sx={{ maxWidth: 760, display: "flex", flexDirection: "column" }}>
        <RepertoireEvaluationReport
          report={report}
          flaggedOnly={state.flaggedOnly}
          onFlaggedOnlyChange={(on) => set({ ...state, flaggedOnly: on, page: 0 })}
          {...(links ? { moveLink: (move) => ({ href: `#at-${move.id}` }) } : {})}
          paging={
            report.moves.length > 25
              ? {
                  page: state.page,
                  rowsPerPage: state.rowsPerPage,
                  onPageChange: (page) => set({ ...state, page }),
                  onRowsPerPageChange: (rowsPerPage) => set({ ...state, rowsPerPage, page: 0 }),
                  labelRowsPerPage: "Moves per page",
                }
              : undefined
          }
          testId="gallery-repertoire-report"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "RepertoireEvaluationReport",
  demos: [
    { name: "A White repertoire, finished — flagged moves first, worst first, each a link", render: () => demo(FINISHED) },
    { name: "Flagged moves only", render: () => demo(FINISHED, { flaggedOnly: true }) },
    { name: "Part-way — moves not evaluated yet", render: () => demo(IN_PROGRESS) },
    { name: "A Black repertoire — evaluations from Black's side", render: () => demo(BLACK) },
    { name: "Every move good, flagged only — no match", render: () => demo(ALL_GOOD, { flaggedOnly: true }) },
    { name: "No move of the side within the ply limit", render: () => demo(EMPTY) },
    { name: "Moves as text — no links", render: () => demo(FINISHED, { links: false }) },
    { name: "300 moves, paged", render: () => demo(LARGE) },
  ],
};

export default gallery;
