import { useMemo, useState, useSyncExternalStore } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import FolderSpecialRoundedIcon from "@mui/icons-material/FolderSpecialRounded";
import { useTranslation } from "react-i18next";

import { CasePickerDialog } from "../../blocks/dialogs";
import { PgnInput } from "../../blocks/forms";
import { caseDisplayName } from "../../blocks/tables";
import { StatusText } from "../../design-system/components/feedback";
import { FieldLabel, SideToggle, type SideValue } from "../../design-system/components/forms";
import { trainingPositionsOf } from "../../lib/accuracyTrainer";
import { analysisCasesSnapshot, subscribeAnalysisCases } from "../../lib/analysisCaseStore";
import { analysisProjectsSnapshot, subscribeAnalysisProjects } from "../../lib/analysisProjectStore";
import type { GameTree } from "../../lib/gameTree";
import { parsePgnTree } from "../../lib/pgn";
import { readRepertoireText } from "../../lib/savedRepertoires";

/** A game loaded: its name and its tree — the screen reads the positions it trains (`trainingPositionsOf`). */
export type AccuracySource = { name: string; tree: GameTree };

type AccuracySetupProps = {
  source: AccuracySource | null;
  onSource: (source: AccuracySource | null) => void;
  /**
   * Accept a game with no engine lines — every analysed position trained,
   * the engine finding their lines (CTA-238, Find Best Move v2 with the
   * engine on). Absent, a full analysis alone, as v1 takes.
   */
  unevaluated?: boolean;
  /**
   * The screen has an engine to turn on (Find Best Move v2): a game with no
   * engine lines says so as the way out. Absent, it says to run a computer
   * analysis alone.
   */
  engineOffered?: boolean;
  side: SideValue;
  onSide: (side: SideValue) => void;
  onStart: () => void;
};

const unsubscribed = () => () => {};

/** A game's name from its tags: the players, else the event. */
const gameNameOf = (tree: GameTree, untitled: string): string => {
  const { White: white, Black: black, Event: event } = tree.headers;
  if (white !== undefined && black !== undefined && white !== "?" && black !== "?") return `${white} – ${black}`;
  return event !== undefined && event !== "?" && event !== "" ? event : untitled;
};

/**
 * **The Accuracy Trainer's setup** (CTA-238): the game and the side.
 *
 * - **A fully analysed game** — a PGN uploaded or pasted (a file of several
 *   picks one, `PgnInput`'s games), or **an Analysis Case** picked
 *   (`CasePickerDialog`; the Projects and Cases stores are read only while it
 *   is open). A game whose tree carries no engine lines is refused, plainly
 *   (`trainingPositionsOf` finds nothing).
 * - **The side** — White, Black or both (`SideToggle`, its *all* button
 *   "Both"); **Start** is off while that side has no position.
 */
function AccuracySetup({ source, onSource, unevaluated = false, engineOffered = false, side, onSide, onStart }: AccuracySetupProps) {
  const { t } = useTranslation();
  const untitled = t("accuracyTrainer.setup.untitled");
  const [pasted, setPasted] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [games, setGames] = useState<readonly GameTree[]>([]);
  const [selectedGame, setSelectedGame] = useState(0);
  const [picking, setPicking] = useState(false);

  // The Analysis stores, subscribed to — and so read — only while the picker is open.
  const projects = useSyncExternalStore(picking ? subscribeAnalysisProjects : unsubscribed, analysisProjectsSnapshot, analysisProjectsSnapshot);
  const cases = useSyncExternalStore(picking ? subscribeAnalysisCases : unsubscribed, analysisCasesSnapshot, analysisCasesSnapshot);

  /**
   * One game onto the trainer. It is kept even with nothing to train — no
   * engine lines while the engine is off: whether it trains is read from it
   * as it stands (below), so turning the engine on afterwards takes it.
   */
  const take = (tree: GameTree, name: string) => {
    setProblem(null);
    onSource({ name, tree });
  };

  /** A file and a paste alike. */
  const bringIn = (text: string) => {
    setProblem(null);
    setGames([]);
    onSource(null);
    const reading = readRepertoireText(text);
    if (!reading.ok) {
      setProblem([t(`analysis.load.problem.${reading.problem}`), reading.detail].filter(Boolean).join(" "));
      return;
    }
    const trees = reading.games.map((game) => game.tree);
    if (trees.length > 1) setGames(trees);
    setSelectedGame(0);
    take(trees[0], gameNameOf(trees[0], untitled));
  };

  const positions = useMemo(() => (source === null ? [] : trainingPositionsOf(source.tree, { unevaluated })), [source, unevaluated]);
  const white = positions.filter((position) => position.turn === "w").length;
  const black = positions.length - white;
  const forSide = side === "white" ? white : side === "black" ? black : white + black;
  // A game loaded with nothing to train: refused in words, until the engine is turned on (v2).
  const refused = source !== null && positions.length === 0;
  const shownProblem = problem ?? (refused ? t(engineOffered ? "accuracyTrainer.setup.noLinesEngine" : "accuracyTrainer.setup.noLines") : null);

  return (
    <Box data-testid="accuracy-setup" sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 1 }}>
      <Box>
        <FieldLabel component="span">{t("accuracyTrainer.setup.title")}</FieldLabel>
        <Typography variant="caption" component="p" sx={{ color: "text.secondary", m: 0 }}>
          {t("accuracyTrainer.setup.help")}
        </Typography>
      </Box>
      <PgnInput
        labels={{
          file: t("accuracyTrainer.setup.chooseFile"),
          paste: t("accuracyTrainer.setup.paste"),
          submit: t("accuracyTrainer.setup.load"),
          games: {
            title: t("accuracyTrainer.setup.games.title"),
            versus: t("accuracyTrainer.setup.games.versus"),
            fallback: (index) => t("accuracyTrainer.setup.games.fallback", { n: index + 1 }),
          },
        }}
        onFiles={(files) => {
          const file = files[0];
          if (file !== undefined) void file.text().then(bringIn);
        }}
        pasted={pasted}
        onPastedChange={setPasted}
        onSubmit={() => bringIn(pasted)}
        submitVariant="outlined"
        fileVariant="outlined"
        problem={shownProblem === null ? null : { message: shownProblem }}
        games={games}
        selectedGame={selectedGame}
        onSelectGame={(index) => {
          setSelectedGame(index);
          const tree = games[index];
          if (tree !== undefined) take(tree, gameNameOf(tree, untitled));
        }}
        testId="accuracy-setup-pgn"
      />
      <Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<FolderSpecialRoundedIcon />}
          onClick={() => setPicking(true)}
          aria-haspopup="dialog"
          data-testid="accuracy-setup-pick-case"
        >
          {t("accuracyTrainer.setup.pickCase")}
        </Button>
      </Box>
      {source !== null && !refused && (
        <StatusText tone="success" testId="accuracy-setup-loaded">
          {t(unevaluated ? "accuracyTrainer.setup.loadedEngine" : "accuracyTrainer.setup.loaded", { name: source.name, count: positions.length, white, black })}
        </StatusText>
      )}
      <Box sx={{ display: "grid", gap: 0.75 }}>
        <FieldLabel component="span">{t("accuracyTrainer.setup.side")}</FieldLabel>
        <SideToggle<SideValue>
          value={side}
          onChange={onSide}
          withAll
          labels={{
            white: t("accuracyTrainer.setup.sides.white"),
            black: t("accuracyTrainer.setup.sides.black"),
            all: t("accuracyTrainer.setup.sides.both"),
          }}
          ariaLabel={t("accuracyTrainer.setup.side")}
          testId="accuracy-setup-side"
        />
        {source !== null && !refused && forSide === 0 && (
          <StatusText tone="warning" testId="accuracy-setup-none">
            {t("accuracyTrainer.setup.noneForSide")}
          </StatusText>
        )}
      </Box>
      <Box>
        <Button variant="contained" onClick={onStart} disabled={source === null || forSide === 0} data-testid="accuracy-setup-start">
          {t("accuracyTrainer.setup.start")}
        </Button>
      </Box>
      <CasePickerDialog
        open={picking}
        projects={projects ?? []}
        cases={(cases ?? []).map((record) => ({ id: record.id, projectId: record.projectId, name: caseDisplayName(record, t), type: record.type }))}
        initialProjectId=""
        onSubmit={(caseId) => {
          const record = cases?.find((each) => each.id === caseId);
          setPicking(false);
          setGames([]);
          if (record === undefined) return;
          let tree: GameTree;
          try {
            tree = parsePgnTree(record.pgn);
          } catch {
            onSource(null);
            setProblem(t("accuracyTrainer.setup.caseProblem"));
            return;
          }
          take(tree, caseDisplayName(record, t));
        }}
        onClose={() => setPicking(false)}
        title={t("accuracyTrainer.casePicker.title")}
        submitLabel={t("accuracyTrainer.casePicker.submit")}
        emptyText={t("accuracyTrainer.casePicker.none")}
        testId="accuracy-case-picker"
      />
    </Box>
  );
}

export default AccuracySetup;
