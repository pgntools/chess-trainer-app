import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import IconAction from "../IconAction/IconAction";
import SelectionBar from "./SelectionBar";

const TOTAL = 5;

const gallery: GalleryModule = {
  section: "toolbars",
  title: "SelectionBar",
  demos: [
    {
      name: "Select-all, the count and the actions — pick some, then all",
      render: () => (
        <WithState initial={2}>
          {(picked, setPicked) => (
            <SelectionBar
              checked={picked === TOTAL}
              indeterminate={picked > 0 && picked < TOTAL}
              onToggleAll={() => setPicked(picked === TOTAL ? 0 : TOTAL)}
              selectAllLabel="Select all"
              count={picked}
              countLabel={`${picked} picked`}
              onClear={() => setPicked(0)}
              clearLabel="Clear the picks"
              actions={
                <>
                  <IconAction label="Download the picked" disabled={picked === 0} testId="gallery-selection-download">
                    <DownloadRoundedIcon fontSize="small" />
                  </IconAction>
                  <IconAction label="Delete the picked" disabled={picked === 0} testId="gallery-selection-delete">
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconAction>
                </>
              }
              testId="gallery-selection"
            />
          )}
        </WithState>
      ),
    },
    {
      name: "Nothing picked",
      render: () => (
        <SelectionBar
          checked={false}
          indeterminate={false}
          onToggleAll={() => {}}
          selectAllLabel="Select all"
          count={0}
          countLabel="0 picked"
          onClear={() => {}}
          clearLabel="Clear the picks"
          testId="gallery-selection-none"
        />
      ),
    },
    {
      name: "Beside a table — no select-all of its own (CTA-113, a collection's games)",
      render: () => (
        <SelectionBar
          count={3}
          countLabel="3 picked"
          onClear={() => {}}
          clearLabel="Clear the picks"
          testId="gallery-selection-table"
        />
      ),
    },
  ],
};

export default gallery;
