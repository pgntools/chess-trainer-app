import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import { computerAnalysisOptionsFrom, type ComputerAnalysisOptions } from "../../../lib/computerAnalysis";
import type { BlockFamilyId } from "../../families";
import NewJobDialog, { type NewJobDialogProps } from "./NewJobDialog";
import { BEFORE_HANDSHAKE, GAME, HEBREW_GAME, NONE_TICKED, OPTIONS, SINGLE_THREAD } from "./fixtures";

const noop = () => {};

const framed = (
  initial: ComputerAnalysisOptions,
  extra: Partial<Omit<NewJobDialogProps, "open" | "options" | "onChange" | "onClose" | "onStart" | "testId">> = {},
) => (
  <WithState<ComputerAnalysisOptions> initial={initial}>
    {(options, set) => (
      <DialogFrame height={640}>
        {(dialogProps) => (
          <NewJobDialog
            open
            onClose={noop}
            gameName={GAME}
            options={options}
            onChange={(patch) => set((before) => computerAnalysisOptionsFrom({ ...before, ...patch }))}
            engineOptions={SINGLE_THREAD}
            engineName="Stockfish 19 Lite"
            lastMove={42}
            onStart={noop}
            testId="gallery-new-job"
            dialogProps={dialogProps}
            {...extra}
          />
        )}
      </DialogFrame>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "NewJobDialog",
  demos: [
    { name: "The form, seeded from the board's Engine tab", render: () => framed(OPTIONS) },
    {
      name: "From the saved list — no engine started, the single-thread build's Threads pinned",
      render: () => framed(OPTIONS, { engineOptions: BEFORE_HANDSHAKE, multiThread: false }),
    },
    { name: "No variant ticked — Start off, saying why", render: () => framed(NONE_TICKED) },
    { name: "A game with no moves", render: () => framed(OPTIONS, { blocked: "noMoves", lastMove: undefined }) },
    { name: "The job being queued", render: () => framed(OPTIONS, { busy: true }) },
    { name: "Refused — too many jobs waiting", render: () => framed(OPTIONS, { problem: "too-many" }) },
    { name: "The game has a running job — the choice first", render: () => framed(OPTIONS, { existing: { status: "running", onCheck: noop } }) },
    { name: "The game has a finished job — the choice first", render: () => framed(OPTIONS, { existing: { status: "done", onCheck: noop } }) },
    { name: "A Hebrew game name (switch to RTL)", render: () => framed(OPTIONS, { gameName: HEBREW_GAME }) },
  ],
};

export default gallery;
