import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import ToggleIconAction from "./ToggleIconAction";

const gallery: GalleryModule = {
  section: "toolbars",
  title: "ToggleIconAction",
  demos: [
    {
      name: "Save — quiet while clean, primary and pressed while dirty",
      render: () => (
        <WithState initial={false}>
          {(dirty, setDirty) => (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <ToggleIconAction
                label={dirty ? "Save — there are changes" : "Save"}
                active={dirty}
                onClick={() => setDirty(false)}
                testId="gallery-save"
              >
                <SaveRoundedIcon fontSize="small" />
              </ToggleIconAction>
              <Button size="small" onClick={() => setDirty(true)}>
                Make a change
              </Button>
            </Box>
          )}
        </WithState>
      ),
    },
    {
      name: "Disabled",
      render: () => (
        <ToggleIconAction label="Save" active={false} disabled onClick={() => {}} testId="gallery-save-off">
          <SaveRoundedIcon fontSize="small" />
        </ToggleIconAction>
      ),
    },
  ],
};

export default gallery;
