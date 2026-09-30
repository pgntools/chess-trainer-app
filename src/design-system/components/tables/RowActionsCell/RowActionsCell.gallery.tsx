import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

import { DEMO_GAMES, demoTable, textCell } from "../../../gallery/demoTable";
import type { GalleryModule } from "../../../gallery/types";
import { IconAction } from "../../toolbars";
import RowActionsCell from "./RowActionsCell";

const actionsTable = (reveal: "always" | "hover") =>
  demoTable(
    <>
      {textCell("White")}
      {textCell("")}
    </>,
    DEMO_GAMES.map((game) => (
      <>
        {textCell(game.white)}
        <RowActionsCell reveal={reveal} testId={`gallery-row-actions-${reveal}-${game.id}`}>
          <IconAction label="Download" testId={`gallery-row-download-${game.id}`}>
            <DownloadRoundedIcon fontSize="small" />
          </IconAction>
          <IconAction label="Delete" testId={`gallery-row-delete-${game.id}`}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconAction>
        </RowActionsCell>
      </>
    )),
  );

const gallery: GalleryModule = {
  section: "tables",
  title: "RowActionsCell",
  demos: [
    { name: "Reveal always", render: () => actionsTable("always") },
    { name: "Reveal on hover and focus (always on a touch screen)", render: () => actionsTable("hover") },
  ],
};

export default gallery;
