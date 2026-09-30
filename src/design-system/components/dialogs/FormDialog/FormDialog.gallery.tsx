import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import DialogFrame from "../../../gallery/DialogFrame";
import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import FormDialog from "./FormDialog";

const noop = () => {};

/** A name field: Enter saves, Save is off while the name is empty. */
const nameDemo = (busy: boolean) => (
  <WithState initial={{ name: "Openings", saved: null as string | null }}>
    {(state, set) => (
      <DialogFrame height={260}>
        {(dialogProps) => (
          <FormDialog
            open
            onClose={noop}
            onSubmit={() => set((before) => ({ ...before, saved: before.name }))}
            title="New folder"
            submitLabel="Save"
            cancelLabel="Cancel"
            submitDisabled={state.name.trim() === ""}
            busy={busy}
            testId="gallery-form-name"
            dialogProps={dialogProps}
          >
            <TextField
              label="Name"
              size="small"
              value={state.name}
              onChange={(event) => set((before) => ({ ...before, name: event.target.value }))}
              fullWidth
            />
            {state.saved !== null && (
              <Typography variant="caption" color="text.secondary">
                Submitted: {state.saved}
              </Typography>
            )}
          </FormDialog>
        )}
      </DialogFrame>
    )}
  </WithState>
);

const gallery: GalleryModule = {
  section: "dialogs",
  title: "FormDialog",
  demos: [
    { name: "One-line field — Enter submits", render: () => nameDemo(false) },
    {
      name: "Multiline, width sm — Ctrl / ⌘ + Enter submits",
      render: () => (
        <WithState initial={{ text: "", saved: 0 }}>
          {(state, set) => (
            <DialogFrame height={340}>
              {(dialogProps) => (
                <FormDialog
                  open
                  onClose={noop}
                  onSubmit={() => set((before) => ({ ...before, saved: before.saved + 1 }))}
                  title="Comment on 12…Nf6"
                  submitLabel="Save"
                  cancelLabel="Cancel"
                  width="sm"
                  testId="gallery-form-comment"
                  dialogProps={dialogProps}
                >
                  <TextField
                    label="Comment"
                    multiline
                    minRows={3}
                    maxRows={8}
                    value={state.text}
                    onChange={(event) => set((before) => ({ ...before, text: event.target.value }))}
                    helperText={`Ctrl / ⌘ + Enter saves — saved ${state.saved} time(s)`}
                    fullWidth
                  />
                </FormDialog>
              )}
            </DialogFrame>
          )}
        </WithState>
      ),
    },
    { name: "Busy", render: () => nameDemo(true) },
  ],
};

export default gallery;
