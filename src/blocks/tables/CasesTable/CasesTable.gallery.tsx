import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { CaseColumn, CaseRow } from "../../../lib/analysisCaseRows";
import type { BlockFamilyId } from "../../families";
import CasesTable from "./CasesTable";
import { HEBREW_ROWS, manyRows, ROWS } from "./fixtures";

type State = { column: CaseColumn; direction: "asc" | "desc"; page: number; rowsPerPage: number; picked: ReadonlySet<string> };

const demo = (rows: readonly CaseRow[], { canMove = true, column = "order", direction = "asc", filtered = false }: { canMove?: boolean; column?: CaseColumn; direction?: "asc" | "desc"; filtered?: boolean } = {}) => (
  <WithState<State> initial={{ column, direction, page: 0, rowsPerPage: 25, picked: new Set<string>() }}>
    {(state, setState) => (
      <CasesTable
        rows={rows}
        sort={{ column: state.column, direction: state.direction }}
        onSort={(column, direction) => setState({ ...state, column, direction, page: 0 })}
        paging={
          rows.length > 25
            ? {
                page: state.page,
                rowsPerPage: state.rowsPerPage,
                onPageChange: (page) => setState({ ...state, page }),
                onRowsPerPageChange: (rowsPerPage) => setState({ ...state, rowsPerPage, page: 0 }),
              }
            : undefined
        }
        caseLink={(row) => ({ href: `#case-${row.id}` })}
        onCaseAction={() => {}}
        canMove={canMove}
        picked={state.picked}
        onPickedChange={(picked) => setState({ ...state, picked })}
        filtered={filtered}
        testId="gallery-cases-table"
      />
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "CasesTable",
  demos: [
    { name: "Games with their tags, and a Position whose game columns are blank — in the Project's order, reorderable", render: () => demo(ROWS) },
    { name: "Sorted by Updated — reordering is off, its tooltips say why", render: () => demo(ROWS, { column: "updated", direction: "desc" }) },
    { name: "Words typed — reordering is off, its tooltips say why", render: () => demo(ROWS, { filtered: true }) },
    { name: "The only Project — Move is off", render: () => demo(ROWS, { canMove: false }) },
    { name: "Empty", render: () => demo([]) },
    { name: "Sixty Cases, paged", render: () => demo(manyRows(60)) },
    { name: "A Hebrew name (switch to RTL)", render: () => demo(HEBREW_ROWS) },
  ],
};

export default gallery;
