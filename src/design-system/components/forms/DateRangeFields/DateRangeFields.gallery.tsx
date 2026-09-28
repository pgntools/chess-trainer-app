import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import DateRangeFields, { type DateRange } from "./DateRangeFields";

const gallery: GalleryModule = {
  section: "forms",
  title: "DateRangeFields",
  demos: [
    {
      name: "Open (each end bounds the other once set)",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <WithState initial={{ from: "", to: "" } as DateRange}>
            {(range, setRange) => <DateRangeFields value={range} onChange={setRange} fromLabel="From" toLabel="To" testId="gallery-dates" />}
          </WithState>
        </Box>
      ),
    },
    {
      name: "Both ends set",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <WithState initial={{ from: "1960-01-01", to: "1961-12-31" } as DateRange}>
            {(range, setRange) => <DateRangeFields value={range} onChange={setRange} fromLabel="From" toLabel="To" testId="gallery-dates-set" />}
          </WithState>
        </Box>
      ),
    },
    {
      name: "Disabled",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <DateRangeFields value={{ from: "", to: "" }} onChange={() => {}} fromLabel="From" toLabel="To" disabled testId="gallery-dates-off" />
        </Box>
      ),
    },
  ],
};

export default gallery;
