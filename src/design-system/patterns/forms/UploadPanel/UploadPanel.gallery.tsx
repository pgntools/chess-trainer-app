import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import type { PatternSectionId } from "../../sections";
import UploadPanel, { type UploadProblem } from "./UploadPanel";

const demo = ({ busy, problem, disabled = false, fileHint }: { busy?: string; problem?: UploadProblem; disabled?: boolean; fileHint?: string } = {}) => (
  <WithState initial="">
    {(text, setText) => (
      <Box sx={{ width: 360 }}>
        <UploadPanel
          fileLabel="Choose a file"
          accept=".txt"
          onFiles={() => {}}
          fileHint={fileHint}
          pasteLabel="…or paste its text here"
          pasteValue={text}
          onPasteChange={setText}
          pasteHelp="Ctrl + Enter reads it too."
          onSubmit={() => {}}
          submitLabel="Read the text"
          disabled={disabled}
          busy={busy}
          problem={problem}
          testId="gallery-upload"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<PatternSectionId> = {
  section: "forms",
  title: "UploadPanel",
  demos: [
    { name: "A file, or a paste — the submit off until there is text", render: () => demo() },
    { name: "With a line beside the file button", render: () => demo({ fileHint: "…or drop a file anywhere here" }) },
    { name: "Reading", render: () => demo({ busy: "Reading…", disabled: true }) },
    { name: "A problem, with machine words under it", render: () => demo({ problem: { message: "No line in it could be read.", detail: "line 3: unexpected token '9.'" } }) },
  ],
};

export default gallery;
