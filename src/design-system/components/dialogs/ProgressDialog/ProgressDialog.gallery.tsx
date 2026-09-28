import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import DialogFrame from "../../../gallery/DialogFrame";
import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import ProgressDialog, { type ProgressDialogProps } from "./ProgressDialog";

const noop = () => {};

const framed = (props: Partial<ProgressDialogProps>) => (
  <DialogFrame height={240}>
    {(dialogProps) => (
      <ProgressDialog
        open
        title="Importing"
        cancelLabel="Cancel"
        onCancel={noop}
        testId="gallery-progress"
        dialogProps={dialogProps}
        {...props}
      />
    )}
  </DialogFrame>
);

/** A job of 40 steps, 60 ms each, then a 1.5 s write that cannot be cancelled. */
const runJob = (set: (next: { done: number; phase: "idle" | "working" | "writing" }) => void) => {
  let done = 0;
  set({ done, phase: "working" });
  const timer = window.setInterval(() => {
    done += 1;
    if (done < 40) {
      set({ done, phase: "working" });
      return;
    }
    window.clearInterval(timer);
    set({ done, phase: "writing" });
    window.setTimeout(() => set({ done: 0, phase: "idle" }), 1500);
  }, 60);
  return timer;
};

const gallery: GalleryModule = {
  section: "dialogs",
  title: "ProgressDialog",
  demos: [
    { name: "Indeterminate — before the first report", render: () => framed({ caption: "Reading the file…" }) },
    {
      name: "Determinate, cancellable",
      render: () => framed({ progress: { done: 120, total: 800 }, caption: "Indexing 120 of 800 games…" }),
    },
    {
      name: "Writing — Cancel off",
      render: () => framed({ progress: { done: 800, total: 800 }, caption: "Saving…", cancelDisabled: true }),
    },
    {
      name: "Live: a job that runs, then writes",
      render: () => (
        <WithState initial={{ done: 0, phase: "idle" as "idle" | "working" | "writing", timer: 0 }}>
          {(state, set) => (
            <>
              <Button
                variant="outlined"
                size="small"
                sx={{ justifySelf: "start" }}
                disabled={state.phase !== "idle"}
                onClick={() => {
                  const timer = runJob((next) => set((before) => ({ ...before, ...next })));
                  set((before) => ({ ...before, timer }));
                }}
              >
                Start
              </Button>
              {state.phase === "idle" ? (
                <Typography variant="caption" color="text.secondary">
                  Start opens the dialog in the frame below.
                </Typography>
              ) : (
                framed({
                  progress: { done: state.done, total: 40 },
                  caption: state.phase === "writing" ? "Saving…" : `Step ${state.done} of 40`,
                  cancelDisabled: state.phase === "writing",
                  onCancel: () => {
                    window.clearInterval(state.timer);
                    set({ done: 0, phase: "idle", timer: 0 });
                  },
                })
              )}
            </>
          )}
        </WithState>
      ),
    },
  ],
};

export default gallery;
