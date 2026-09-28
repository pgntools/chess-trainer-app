import ViewComfyRounded from "@mui/icons-material/ViewComfyRounded";
import ViewListRounded from "@mui/icons-material/ViewListRounded";
import ViewModuleRounded from "@mui/icons-material/ViewModuleRounded";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import ViewToggle from "./ViewToggle";

type View = "list" | "compact" | "comfortable";

const OPTIONS = [
  { value: "list", label: "List", icon: <ViewListRounded fontSize="small" /> },
  { value: "compact", label: "Small boards", icon: <ViewComfyRounded fontSize="small" /> },
  { value: "comfortable", label: "Large boards", icon: <ViewModuleRounded fontSize="small" /> },
] as const;

const gallery: GalleryModule = {
  section: "toolbars",
  title: "ViewToggle",
  demos: [
    {
      name: "List, small boards, large boards — a click on the pressed one does nothing",
      render: () => (
        <WithState<View> initial="list">
          {(view, setView) => (
            <ViewToggle<View> value={view} onChange={setView} options={OPTIONS} ariaLabel="View" testId="gallery-view-toggle" />
          )}
        </WithState>
      ),
    },
  ],
};

export default gallery;
