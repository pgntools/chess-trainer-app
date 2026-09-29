import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { PgnInput } from "../../blocks/forms";
import {
  newSavedRepertoireId,
  readRepertoireText,
  savedRepertoireOf,
  type RepertoireProblem,
  type RepertoireReading,
} from "../../lib/savedRepertoires";
import { saveRepertoire } from "../../lib/savedRepertoireStore";
import { useOwnPageHeading } from "../main/pageTitle";
import { RightPanel } from "../main/rightPanel";
import RepertoireMergeSplit from "./RepertoireMergeSplit";

/**
 * **Add a repertoire** (`/repertoires/new`) — a `.pgn` file picked, or PGN
 * pasted, and the reader taken straight to the board it opens on (CTA-61).
 *
 * ## One way in, whichever door
 *
 * The file's text and the pasted text go through **the same function**,
 * {@link bringIn}: the same reading (`readRepertoireText` — the uploads' size and
 * emptiness rules, then every game parsed as the board will parse it), the same
 * constructors (which never read a file name) and the same
 * write. So a file and its pasted text are the same record, and
 * `RepertoireUpload.test.tsx` asserts it through this screen, not only below it.
 *
 * ## A repertoire is one game
 *
 * A text of one game is stored as it is and opens on its board. A text of
 * several — a Chessable export, a lichess study of many chapters — is not a
 * repertoire as it stands (`lib/savedRepertoires.ts`), so the screen asks
 * what to do with it: merge the games into one tree, or split them into one
 * repertoire each (`RepertoireMergeSplit`).
 *
 * ## The read waits for a paint
 *
 * Checking the shipped one-tree example (7,859 nodes) parses every move of it —
 * most of a second of main thread. The work is put behind a `setTimeout(0)` so the
 * "Reading…" state is on screen first, rather than the button appearing to
 * have done nothing while the tab stalls.
 */

type Problem = RepertoireProblem | "storage";

function RepertoireUpload() {
  // The visible title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ kind: Problem; detail?: string } | null>(
    null,
  );

  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (pending.current !== null) clearTimeout(pending.current);
    },
    [],
  );

  /** The one route in, for a file and a paste alike. */
  /** A text of several games, waiting for the reader to merge or split it. */
  const [choice, setChoice] = useState<Extract<RepertoireReading, { ok: true }> | null>(
    null,
  );

  /** The one route in, for a file and a paste alike. */
  const bringIn = (text: string) => {
    setBusy(true);
    setProblem(null);
    setChoice(null);
    pending.current = setTimeout(async () => {
      pending.current = null;
      const reading = readRepertoireText(text);
      if (!reading.ok) {
        setBusy(false);
        setProblem({ kind: reading.problem, detail: reading.detail });
        return;
      }

      if (reading.games.length > 1) {
        // Not a repertoire as it stands: the reader chooses merge or split.
        setBusy(false);
        setChoice(reading);
        return;
      }

      const record = savedRepertoireOf(
        newSavedRepertoireId(),
        reading.games[0],
        name,
        reading.name,
      );
      if ((await saveRepertoire(record)) !== undefined) {
        setBusy(false);
        setProblem({ kind: "storage" });
        return;
      }
      navigate(`/repertoires/${encodeURIComponent(record.id)}`);
    }, 0);
  };

  const onPicked = async (files: readonly File[]) => {
    const file = files[0];
    if (file === undefined) return;
    bringIn(await file.text());
  };

  return (
    <>
      <Box
        data-testid="repertoire-upload-screen"
        sx={{
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
        }}
      >
        <Box>
          <Typography variant="subtitle1" component="h1" sx={{ fontWeight: 700 }} data-testid="repertoire-upload-title">
            {t("repertoires.upload.title")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("repertoires.upload.intro")}
          </Typography>
        </Box>

        <TextField
          size="small"
          label={t("repertoires.upload.name")}
          helperText={t("repertoires.upload.nameHelp")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          slotProps={{ htmlInput: { "data-testid": "repertoire-upload-name", dir: "auto" } }}
        />

        <PgnInput
          labels={{
            file: t("repertoires.upload.pick"),
            paste: t("repertoires.upload.paste"),
            submit: t("repertoires.upload.save"),
          }}
          onFiles={(files) => void onPicked(files)}
          pasted={pasted}
          onPastedChange={setPasted}
          onSubmit={() => bringIn(pasted)}
          disabled={busy}
          busy={busy ? t("repertoires.upload.reading") : undefined}
          problem={
            problem === null ? null : { message: t(`repertoires.upload.problem.${problem.kind}`), detail: problem.detail }
          }
          testId="repertoire-upload"
          testIds={{ submit: "repertoire-upload-save" }}
        />

        {choice !== null && (
          <RepertoireMergeSplit reading={choice} typedName={name} onDone={(path) => navigate(path)} />
        )}
      </Box>

      <RightPanel>
        <Box component="section" aria-labelledby="repertoire-upload-panel-title" sx={{ color: "text.secondary" }}>
          <Typography id="repertoire-upload-panel-title" variant="subtitle2" component="h2" sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}>
            {t("repertoires.panelTitle")}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t("repertoires.storage")}
          </Typography>
          <Button component={RouterLink} to="/repertoires" size="small">
            {t("repertoires.detail.back")}
          </Button>
        </Box>
      </RightPanel>
    </>
  );
}

export default RepertoireUpload;
