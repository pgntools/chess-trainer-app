import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import KeyValueList from "./KeyValueList";

const gallery: GalleryModule = {
  section: "lists",
  title: "KeyValueList",
  demos: [
    {
      name: "A few facts — a long value wraps",
      render: () => (
        <Box sx={{ maxWidth: 320 }}>
          <KeyValueList
            rows={[
              { id: "event", label: "Event", value: "World Championship Match, Game 6 — the longest game ever played in a title match", dir: "ltr" },
              { id: "date", label: "Date", value: "2021.12.03", dir: "ltr" },
              { id: "result", label: "Result", value: "1-0", dir: "ltr" },
            ]}
            testId="gallery-key-values"
          />
        </Box>
      ),
    },
    {
      name: "A reader's words (Hebrew values, switch to RTL)",
      render: () => (
        <Box sx={{ maxWidth: 320 }}>
          <KeyValueList
            rows={[
              { id: "name", label: "Name", value: "פתיחת המלכה", dir: "auto" },
              { id: "note", label: "Note", value: "לשחק מהר", dir: "auto" },
            ]}
            testId="gallery-key-values-he"
          />
        </Box>
      ),
    },
  ],
};

export default gallery;
