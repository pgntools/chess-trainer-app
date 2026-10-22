import { useMemo, useState, useSyncExternalStore } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import FolderSpecialRoundedIcon from "@mui/icons-material/FolderSpecialRounded";
import { useTranslation } from "react-i18next";

import { CasePickerDialog, GamesPickerDialog } from "../../../blocks/dialogs";
import { PgnInput } from "../../../blocks/forms";
import { caseDisplayName } from "../../../blocks/tables";
import { InlineAlert, StatusText } from "../../../design-system/components/feedback";
import { FieldLabel, SideToggle, type SideValue } from "../../../design-system/components/forms";
import { analysisCasesSnapshot, subscribeAnalysisCases } from "../../../lib/analysisCaseStore";
import { analysisProjectsSnapshot, subscribeAnalysisProjects } from "../../../lib/analysisProjectStore";
import { progressOf } from "../../../lib/findBestMove/selectors";
import { gameTag, type GameHeaders } from "../../../lib/gameModel";
import type { GameTree } from "../../../lib/gameTree";
import { collectionRowOf, type CollectionRow } from "../../../lib/libraryCollections";
import { PgnParseError, parsePgnTree } from "../../../lib/pgn";
import { indexPgnGames, type PgnGameEntry } from "../../../lib/pgnGames";
import { normaliseRepertoireText, readRepertoireText } from "../../../lib/savedRepertoires";
import type { SessionSource, SetupReading } from "./sessionSetup";

type SessionSetupProps = {
  source: SessionSource | null;
  onSource: (source: SessionSource | null) => void;
  /**
   * What the source reads as (`setupReadingOf`) — a computer analysis's
   * output, or a game with no engine lines, every position trained, the
   * engine offered at each (CTA-246).
   */
  setup: SetupReading;
  side: SideValue;
  onSide: (side: SideValue) => void;
};

const unsubscribed = () => () => {};

/** A game's name from its tags: the players, else the event. */
const gameNameOf = (headers: GameHeaders, untitled: string): string => {
  const { White: white, Black: black, Event: event } = headers;
  if (white !== undefined && black !== undefined && white !== "?" && black !== "?") return `${white} – ${black}`;
  return event !== undefined && event !== "?" && event !== "" ? event : untitled;
};

/** A game of several as the form names the one chosen: "White – Black, Event, Date" — its players "?" where a tag is missing. */
const gameLabelOf = (headers: GameHeaders): string => {
  const white = gameTag(headers, "White");
  const black = gameTag(headers, "Black");
  const players = white !== undefined || black !== undefined ? `${white ?? "?"} – ${black ?? "?"}` : undefined;
  return [players, gameTag(headers, "Event"), gameTag(headers, "Date")]
    .filter((part): part is string => part !== undefined && part !== "")
    .join(", ");
};

/** A chosen game that will not read: the parse's words, for the alert's detail. */
type GameProblem = { detail?: string };

/**
 * **A Find Best Move session's setup** (CTA-238): the game and the side.
 *
 * - **A game** — a PGN uploaded or pasted, or **an Analysis Case** picked (`CasePickerDialog`;
 *   the Projects and Cases stores are read only while it is open). It is
 *   kept as loaded, and what it trains read from it as it stands: a game
 *   with no engine lines is taken too (CTA-246), said as one — training it
 *   needs the engine, which each position offers.
 * - **A text of several games** (CTA-259 — New case's way, CTA-208): only
 *   **indexed** (`indexPgnGames`, tags and text, no move read), the first
 *   game taken and only the chosen game parsed; the form names it ("Game 3
 *   of 15,905: …") with *Choose another game…*, which opens the games
 *   picker (`GamesPickerDialog`, `one` mode — its rows built the first time
 *   it opens). A chosen game that will not read is said, and no source.
 * - **The side** — White, Black or both (`SideToggle`, its *all* button
 *   "Both"); the form's **Start** is off while that side has no position.
 * - **A session's own PGN** (CTA-239 — a downloaded session, or a session
 *   Case picked), known by its tags: said as one, how far it got, the side
 *   its own (the toggle off) — and the form's **Resume** in Start's place,
 *   which keeps it as a new session Case and goes on where it was left.
 *
 * The lobby's New session form's Game tab (CTA-239, `NewSessionForm`): Start
 * is the form's.
 */
function SessionSetup({ source, onSource, setup, side, onSide }: SessionSetupProps) {
  const { t, i18n } = useTranslation();
  const untitled = t("accuracyTrainer.setup.untitled");
  const [pasted, setPasted] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  /** A text of several games, indexed — none for one game. */
  const [entries, setEntries] = useState<readonly PgnGameEntry[]>([]);
  /** The game of `entries` chosen, by its place. */
  const [selectedGame, setSelectedGame] = useState(0);
  const [gameProblem, setGameProblem] = useState<GameProblem | null>(null);
  const [choosingGame, setChoosingGame] = useState(false);
  /** The games picker has been opened on these games — its rows are built then, and kept. */
  const [rowsBuilt, setRowsBuilt] = useState(false);
  const [picking, setPicking] = useState(false);

  // The Analysis stores, subscribed to — and so read — only while the picker is open.
  const projects = useSyncExternalStore(picking ? subscribeAnalysisProjects : unsubscribed, analysisProjectsSnapshot, analysisProjectsSnapshot);
  const cases = useSyncExternalStore(picking ? subscribeAnalysisCases : unsubscribed, analysisCasesSnapshot, analysisCasesSnapshot);

  /** One game onto the trainer — what it trains is read from it as it stands (`setup`). */
  const take = (tree: GameTree, name: string) => {
    setProblem(null);
    onSource({ name, tree });
  };

  /** No text of several games any more. */
  const forgetGames = () => {
    setEntries([]);
    setSelectedGame(0);
    setGameProblem(null);
    setRowsBuilt(false);
  };

  /** One game of several chosen: only it is parsed — one that will not read is said, and no source. */
  const chooseGame = (games: readonly PgnGameEntry[], index: number) => {
    const entry = games[index];
    if (entry === undefined) return;
    setSelectedGame(index);
    let tree: GameTree | undefined;
    let detail: string | undefined;
    try {
      tree = parsePgnTree(entry.text, entry.number);
    } catch (error) {
      detail = error instanceof PgnParseError || error instanceof Error ? error.message : undefined;
    }
    if (tree === undefined || tree.moves.length === 0) {
      onSource(null);
      setGameProblem(detail === undefined ? {} : { detail });
      return;
    }
    setGameProblem(null);
    take(tree, gameNameOf(tree.headers, untitled));
  };

  /** A file and a paste alike. */
  const bringIn = (text: string) => {
    setProblem(null);
    forgetGames();
    onSource(null);
    // Several games are only indexed (CTA-259): a file of thousands reads in milliseconds.
    const indexed = indexPgnGames([normaliseRepertoireText(text)]);
    if (indexed.length > 1) {
      setEntries(indexed);
      chooseGame(indexed, 0);
      return;
    }
    const reading = readRepertoireText(text);
    if (!reading.ok) {
      setProblem([t(`analysis.load.problem.${reading.problem}`), reading.detail].filter(Boolean).join(" "));
      return;
    }
    const { tree } = reading.games[0];
    take(tree, gameNameOf(tree.headers, untitled));
  };

  // The picker's rows — every game's tags and move count — built the first time it opens.
  const rows = useMemo((): CollectionRow[] => (rowsBuilt ? entries.map((entry) => collectionRowOf(entry.text, entry.number)) : []), [entries, rowsBuilt]);
  const several = entries.length > 1;
  const chosenEntry = entries[selectedGame];

  const { session, count, white, black, forSide, noLines } = setup;
  const shownProblem = problem ?? (session === null ? t("accuracyTrainer.setup.sessionProblem") : null);

  return (
    <Box data-testid="accuracy-setup" sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
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
        testId="accuracy-setup-pgn"
      />
      {several && chosenEntry !== undefined && (
        <Box data-testid="accuracy-setup-chosen" sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="body2" dir="auto" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            {t("accuracyTrainer.setup.games.chosen", {
              number: chosenEntry.number.toLocaleString(i18n.language),
              total: entries.length.toLocaleString(i18n.language),
              game: gameLabelOf(chosenEntry.headers) || untitled,
            })}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setRowsBuilt(true);
              setChoosingGame(true);
            }}
            aria-haspopup="dialog"
            data-testid="accuracy-setup-choose-game"
          >
            {t("accuracyTrainer.setup.games.chooseOther")}
          </Button>
        </Box>
      )}
      {several && gameProblem !== null && (
        <InlineAlert severity="error" detail={gameProblem.detail} testId="accuracy-setup-game-problem">
          {t("accuracyTrainer.setup.games.unreadable")}
        </InlineAlert>
      )}
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
      {source !== null && session !== undefined && session !== null && (
        <StatusText tone="success" testId="accuracy-setup-loaded">
          {t("accuracyTrainer.setup.loadedSession", {
            name: source.name,
            count: session.keys.length,
            done: progressOf(session).answered + progressOf(session).passed,
          })}
        </StatusText>
      )}
      {source !== null && session === undefined && count > 0 && (
        <StatusText tone="success" testId="accuracy-setup-loaded">
          {t("accuracyTrainer.setup.loaded", { name: source.name, count, white, black })}
        </StatusText>
      )}
      {source !== null && session === undefined && noLines && (
        <StatusText tone="info" testId="accuracy-setup-no-lines">
          {t("accuracyTrainer.setup.noLines")}
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
          disabled={session !== undefined}
          testId="accuracy-setup-side"
        />
        {session !== undefined && session !== null && (
          <StatusText tone="neutral" testId="accuracy-setup-session-side">
            {t("accuracyTrainer.setup.sessionSide")}
          </StatusText>
        )}
        {source !== null && session === undefined && forSide === 0 && (
          <StatusText tone="warning" testId="accuracy-setup-none">
            {t("accuracyTrainer.setup.noneForSide")}
          </StatusText>
        )}
      </Box>
      <CasePickerDialog
        open={picking}
        projects={projects ?? []}
        cases={(cases ?? []).map((record) => ({ id: record.id, projectId: record.projectId, name: caseDisplayName(record, t), type: record.type }))}
        initialProjectId=""
        onSubmit={(caseId) => {
          const record = cases?.find((each) => each.id === caseId);
          setPicking(false);
          forgetGames();
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
      <GamesPickerDialog
        open={choosingGame}
        rows={rows}
        mode="one"
        onSubmit={(numbers) => {
          setChoosingGame(false);
          chooseGame(entries, numbers[0] - 1);
        }}
        onClose={() => setChoosingGame(false)}
        testId="accuracy-setup-games-picker"
      />
    </Box>
  );
}

export default SessionSetup;
