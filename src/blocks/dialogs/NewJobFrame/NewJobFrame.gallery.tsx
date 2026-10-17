import TextField from "@mui/material/TextField";

import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { CASE_KINDS, COLLECTION_KINDS, HEBREW_KINDS, REPERTOIRE_KINDS } from "./fixtures";
import NewJobFrame, { type NewJobFrameProps, type NewJobKindOption } from "./NewJobFrame";

const noop = () => {};

/** The frame, its choice held by the demo; the chosen kind's form a stand-in field. */
const framed = (
  kinds: readonly NewJobKindOption[],
  initial: string | undefined,
  extra: Partial<Omit<NewJobFrameProps, "open" | "kinds" | "kindId" | "onKindChange" | "testId">> = {},
) => (
  <WithState<string | undefined> initial={initial}>
    {(kindId, setKindId) => (
      <DialogFrame height={560}>
        {(dialogProps) => (
          <NewJobFrame
            open
            onClose={noop}
            onStart={noop}
            kinds={kinds}
            kindId={kindId}
            onKindChange={setKindId}
            subjectLabel="My Caro-Kann"
            testId="gallery-new-job-frame"
            dialogProps={dialogProps}
            {...extra}
          >
            <TextField label="Output name (the kind's form)" size="small" defaultValue="My Caro-Kann — evaluated" fullWidth />
          </NewJobFrame>
        )}
      </DialogFrame>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "NewJobFrame",
  demos: [
    { name: "No kind chosen yet — Start says why it is off", render: () => framed(REPERTOIRE_KINDS, undefined) },
    { name: "A kind chosen — its form under the kinds; one kind that cannot start here says why", render: () => framed(REPERTOIRE_KINDS, "repertoire.evaluation") },
    { name: "One kind — a Case's computer analysis", render: () => framed(CASE_KINDS, "analysis.computer-analysis", { subjectLabel: "Carlsen – Nepomniachtchi" }) },
    {
      name: "The form blocks Start (startBlockedNote)",
      render: () => framed(COLLECTION_KINDS, "library.opening-report", { subjectLabel: "Tata Steel 2026", startBlockedNote: "Choose an engine first." }),
    },
    { name: "Being queued (busy)", render: () => framed(REPERTOIRE_KINDS, "repertoire.evaluation", { busy: true }) },
    { name: "Refused", render: () => framed(REPERTOIRE_KINDS, "repertoire.evaluation", { problem: "The job could not be queued — the browser refused the write." }) },
    { name: "No kind applies", render: () => framed([], undefined) },
    { name: "Hebrew words (switch the direction to RTL)", render: () => framed(HEBREW_KINDS, "repertoire.evaluation", { subjectLabel: "הקארו-קאן שלי" }) },
  ],
};

export default gallery;
