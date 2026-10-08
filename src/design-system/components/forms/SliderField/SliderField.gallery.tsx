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
    {
      name: "Marked, with a help caption — the marks are the slider's own values, so a drag or a key lands on one (CTA-163)",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <WithState initial={8}>
            {(slot, setSlot) => (
              <SliderField
                label="Hash (MB)"
                value={slot}
                onChange={setSlot}
                min={0}
                max={8}
                marks={[
                  { value: 0, label: "128" },
                  { value: 2, label: "256" },
                  { value: 4, label: "512" },
                  { value: 6, label: "1024" },
                  { value: 8, label: "2048" },
                ]}
                help="Engine memory (RAM)"
                testId="gallery-slider-marks"
              />
            )}
          </WithState>
        </Box>
      ),
    },
  ],
};

export default gallery;
