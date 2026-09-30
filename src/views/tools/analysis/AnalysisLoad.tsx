import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { FenInput, MergeSplitChoice, PgnInput } from "../../../blocks/forms";
import { StatusText } from "../../../design-system/components/feedback";
import { FieldLabel } from "../../../design-system/components/forms";
import MultiGameDialog from "./MultiGameDialog";
import { useAnalysisLoad, type AnalysisLoadConfig } from "./useAnalysisLoad";

/**
 * **The Load tab** (CTA-73) — a game or a position onto the board, as a new
 * analysis not yet saved. The state is [`useAnalysisLoad`](./useAnalysisLoad.ts)
 * — the pipeline on its own — and this is the Analysis Board's and the Openings
 * explorer's arrangement of it; the analyses Lobby's form (CTA-96) places the
 * pieces itself over the same hook.
 *
 * A PGN — picked as a file or pasted, one route for both — is read the way a
 * repertoire is (`readRepertoireText`: the uploads' size and emptiness rules,
 * every game parsed as a tree, side lines and comments kept). **One game**
 * goes onto the board. **Several**, on the Analysis Board (`onCollectionSaved`),
 * open the popup (`MultiGameDialog`, CTA-101): **merge** them into one tree,
 * which goes onto the board unsaved like one game, with `[%games N]` at its
 * branches; or **save them as a games collection** in the Library, where the
 * reader is taken. Without `onCollectionSaved` — the Openings explorer — the
 * choice is inline and merge-only (`MergeSplitChoice` with no split), and
 * counts nothing. A PGN of a position and no moves loads as that position. A
 * **FEN** is a position: it turns the board to the side to move, where a game
 * does not.
 */
function AnalysisLoad({
  onLoadTree,
  onLoadFen,
  onLoadPosition,
  onCollectionSaved,
  choiceLabelKey = "openings.load.choice",
}: AnalysisLoadConfig & {
  /** The inline merge-only choice's locale block — a board with no popup. */
  choiceLabelKey?: string;
}) {
  const { t } = useTranslation();
  const load = useAnalysisLoad({ onLoadTree, onLoadFen, onLoadPosition, onCollectionSaved });

  return (
    <Box data-testid="analysis-load" sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 1 }}>
      <Box>
        <FieldLabel component="span">{t("analysis.load.pgnTitle")}</FieldLabel>
        <Typography variant="caption" component="p" sx={{ color: "text.secondary", m: 0 }}>
          {t("analysis.load.pgnHelp")}
        </Typography>
      </Box>
      <PgnInput
        labels={{
          file: t("analysis.position.chooseFile"),
          paste: t("analysis.position.pasteLabel"),
          submit: t("analysis.position.loadText"),
        }}
        onFiles={(files) => void load.onPicked(files)}
        pasted={load.pasted}
        onPastedChange={load.setPasted}
        onSubmit={() => load.bringIn(load.pasted)}
        submitVariant="contained"
        fileVariant="outlined"
        problem={load.problem === null ? null : { message: load.problem }}
        testId="analysis-load"
        testIds={{ submit: "analysis-load-text" }}
      />
      {load.loaded && (
        <StatusText tone="success" testId="analysis-load-done">
          {t("analysis.load.loaded")}
        </StatusText>
      )}
      {load.choice !== null &&
        (onCollectionSaved === undefined ? (
          <MergeSplitChoice
            labelKey={choiceLabelKey}
            testId="analysis-choice"
            count={load.choice.reading.games.length}
            skipped={load.choice.reading.skipped}
            mergeable={load.choice.reading.mergeable}
            onMerge={load.merge}
            problem={null}
          />
        ) : (
          <MultiGameDialog
            testIdPrefix="analysis-choice"
            choice={load.choice}
            onMerge={load.merge}
            onClose={load.dismiss}
            onSaved={load.collectionSaved}
          />
        ))}

      {onLoadFen !== undefined && (
        <Box sx={{ mt: 1 }}>
          <FieldLabel component="span">{t("analysis.position.fenTitle")}</FieldLabel>
          <FenInput
            label={t("analysis.position.fenLabel")}
            submitLabel={t("analysis.position.loadFen")}
            value={load.fenText}
            onChange={load.setFenText}
            onSubmit={load.applyFen}
            error={load.fenProblem}
            testId="analysis-load"
            submitTestId="analysis-load-fen"
            errorTestId="analysis-load-fen-problem"
          />
        </Box>
      )}
    </Box>
  );
}

export default AnalysisLoad;
