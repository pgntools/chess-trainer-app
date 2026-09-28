import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import SideToggle, { type SideValue } from "./SideToggle";

const labels = { white: "White", black: "Black", all: "All" };

const gallery: GalleryModule = {
  section: "forms",
  title: "SideToggle",
  demos: [
    {
      name: "White / Black",
      render: () => (
        <WithState initial={"white" as "white" | "black"}>
          {(side, setSide) => <SideToggle value={side} onChange={setSide} labels={labels} ariaLabel="Side" testId="gallery-side" />}
        </WithState>
      ),
    },
    {
      name: "With “all” (a filter)",
      render: () => (
        <WithState initial={"all" as SideValue}>
          {(side, setSide) => (
            <SideToggle value={side} onChange={setSide} labels={labels} withAll ariaLabel="Played as" testId="gallery-side-all" />
          )}
        </WithState>
      ),
    },
    {
      name: "Full width (a form's row)",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <WithState initial={"black" as "white" | "black"}>
            {(side, setSide) => (
              <SideToggle value={side} onChange={setSide} labels={labels} fullWidth ariaLabel="Play as" testId="gallery-side-full" />
            )}
          </WithState>
        </Box>
      ),
    },
    {
      name: "Full width with “all”, disabled",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <SideToggle value={"all" as SideValue} onChange={() => {}} labels={labels} withAll fullWidth disabled ariaLabel="Side" testId="gallery-side-off" />
        </Box>
      ),
    },
  ],
};

export default gallery;
