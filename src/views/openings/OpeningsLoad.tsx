import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { FenInput, MergeSplitChoice, PgnInput } from "../../blocks/forms";
import { StatusText } from "../../design-system/components/feedback";
import { FieldLabel } from "../../design-system/components/forms";
import { mergeTrees, type GameTree } from "../../lib/gameTree";
import { parsePgnTree } from "../../lib/pgn";
import { normaliseRepertoireText, readRepertoireText, type RepertoireReading } from "../../lib/savedRepertoires";

type OpeningsLoadProps = {
  onLoadTree: (tree: GameTree) => void;
  /** Throws on a FEN that will not parse — the error line says why. */
  onLoadFen: (fen: string) => void;
};

/**
 * **The Openings explorer's Load tab** (CTA-73, CTA-78 — the Analysis Board's
 * Load tab until CTA-192) — a game or a position onto the board.
 *
 * A PGN — picked as a file or pasted, one route for both — is read the way a
 * repertoire is (`readRepertoireText`: the uploads' size and emptiness rules,
 * every game parsed as a tree, side lines and comments kept). **One game**
 * goes onto the board. **Several** can only be merged into one tree (the
 * explorer keeps nothing): the inline `MergeSplitChoice`, merge only. A PGN of
 * a position and no moves loads as that position. A **FEN** is a position:
 * it turns the board to the side to move, where a game does not.
 */
function OpeningsLoad({ onLoadTree, onLoadFen }: OpeningsLoadProps) {
  const { t } = useTranslation();
  const [pasted, setPasted] = useState("");
  const [fenText, setFenText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [fenProblem, setFenProblem] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [choice, setChoice] = useState<Extract<RepertoireReading, { ok: true }> | null>(null);

  const load = (tree: GameTree) => {
    onLoadTree(tree);
    setLoaded(true);
    setChoice(null);
  };

  /** The one route in, for a file and a paste alike. */
  const bringIn = (text: string) => {
    setProblem(null);
    setChoice(null);
    setLoaded(false);
    const reading = readRepertoireText(text);
    if (!reading.ok) {
      // A PGN of a position alone has no moves, which a repertoire refuses and a board does not.
      if (reading.problem === "unreadable") {
        try {
          return load(parsePgnTree(normaliseRepertoireText(text)));
        } catch {
          // The reading's own problem stands.
        }
      }
      setProblem([t(`analysis.load.problem.${reading.problem}`), reading.detail].filter(Boolean).join(" "));
      return;
    }
    if (reading.games.length === 1) return load(reading.games[0].tree);
    setChoice(reading);
  };

  /** Merge the choice's games onto the board. */
  const merge = () => {
    if (choice === null || !choice.mergeable) return;
    load(
      mergeTrees(
        choice.games.map((game) => game.tree),
        choice.games[0].tree.startFen,
        { ...(choice.name !== undefined ? { Event: choice.name } : {}), Result: "*" },
        { countGames: false },
      ),
    );
  };

  const applyFen = () => {
    try {
      onLoadFen(fenText);
      setFenProblem(null);
      setFenText("");
    } catch (cause) {
      setFenProblem(t("analysis.position.errors.fen", { detail: cause instanceof Error ? cause.message : String(cause) }));
    }
  };

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
        onFiles={(files) => {
          const file = files?.[0];
          if (file !== undefined) void file.text().then(bringIn);
        }}
        pasted={pasted}
        onPastedChange={setPasted}
        onSubmit={() => bringIn(pasted)}
        submitVariant="contained"
        fileVariant="outlined"
        problem={problem === null ? null : { message: problem }}
        testId="analysis-load"
        testIds={{ submit: "analysis-load-text" }}
      />
      {loaded && (
        <StatusText tone="success" testId="analysis-load-done">
          {t("analysis.load.loaded")}
        </StatusText>
      )}
      {choice !== null && (
        <MergeSplitChoice
          labelKey="openings.load.choice"
          testId="analysis-choice"
          count={choice.games.length}
          skipped={choice.skipped}
          mergeable={choice.mergeable}
          onMerge={merge}
          problem={null}
        />
      )}
      <Box sx={{ mt: 1 }}>
        <FieldLabel component="span">{t("analysis.position.fenTitle")}</FieldLabel>
        <FenInput
          label={t("analysis.position.fenLabel")}
          submitLabel={t("analysis.position.loadFen")}
          value={fenText}
          onChange={setFenText}
          onSubmit={applyFen}
          error={fenProblem}
          testId="analysis-load"
          submitTestId="analysis-load-fen"
          errorTestId="analysis-load-fen-problem"
        />
      </Box>
    </Box>
  );
}

export default OpeningsLoad;
