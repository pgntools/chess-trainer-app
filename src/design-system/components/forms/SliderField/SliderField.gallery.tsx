import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import SliderField from "./SliderField";

const gallery: GalleryModule = {
  section: "forms",
  title: "SliderField",
  demos: [
    {
      name: "The number as its value",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <WithState initial={12}>
            {(depth, setDepth) => <SliderField label="Depth" value={depth} onChange={setDepth} min={1} max={24} testId="gallery-slider-depth" />}
          </WithState>
        </Box>
      ),
    },
    {
      name: "The caller's value words",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <WithState initial={1000}>
            {(ms, setMs) => (
              <SliderField
                label="Move time"
                value={ms}
                onChange={setMs}
                min={0}
                max={10000}
                step={250}
                valueLabel={ms === 0 ? "off" : `${(ms / 1000).toFixed(2)} s`}
                testId="gallery-slider-time"
              />
            )}
          </WithState>
        </Box>
      ),
    },
    {
      name: "Disabled, with a notice",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <SliderField label="Threads" value={1} onChange={() => {}} min={1} max={1} disabled notice="Fixed at 1 in this build." testId="gallery-slider-off" />
        </Box>
      ),
    },
  ],
};

export default gallery;
