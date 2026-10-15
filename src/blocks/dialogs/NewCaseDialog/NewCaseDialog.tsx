import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { useTranslation } from "react-i18next";

import { SelectAutocomplete, type AutocompleteOption } from "../../../design-system/components/autocompletes";
import { FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { ProgressLine } from "../../../design-system/components/states";
import { IconAction } from "../../../design-system/components/toolbars";
import { RadioGroupField, SelectField, TextInputField } from "../../../design-system/components/forms";
import type { UploadProblem } from "../../../design-system/patterns/forms";
import { MAX_ANALYSIS_CASES } from "../../../lib/analysisProjects";
import { isZipFile, readCollectionZip, type CollectionZipProblem } from "../../../lib/collectionZip";
import { FenParseError, parseFen } from "../../../lib/fen";
import { formatBytes } from "../../../lib/formatBytes";
import { gameTag } from "../../../lib/gameModel";
import { mainline, plyLabel, type GameTree } from "../../../lib/gameTree";
import { PgnParseError, parsePgnTree } from "../../../lib/pgn";
import { indexPgnGames, parsePgnGameEntries, type PgnGameEntry } from "../../../lib/pgnGames";
import { PgnInput } from "../../forms/PgnInput";

/**
 * What the reader asked for — the screen makes the Case(s) of it (an id, its
 * Project, the moment): a Game of a parsed game, a Position of a FEN, or a
 * Position of a parsed game at a node (`null`: its start), its moves before
 * it kept.
 */
export type NewCaseSpec =
  | { type: "game"; tree: GameTree; name: string }
  | { type: "position"; fen: string; name: string }
  | { type: "position"; tree: GameTree; nodeId: string | null; name: string };

export type NewCaseDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Create — one spec (the game picked), or one per game when the reader asked for a Case per game. */
  onCreate: (specs: NewCaseSpec[]) => void;
  /** The Cases are being written: the buttons off. */
  busy?: boolean;
  /** A write that was refused, worded by the screen — an alert in the dialog. */
  problem?: string | null;
  /** A PGN already read as the dialog opens — the gallery's samples. Absent: it opens empty. */
  initialPgn?: string;
  /** The file `initialPgn` came from: the dialog opens on its plate (the gallery's). Absent: as pasted. */
  initialFileName?: string;
  /**
   * The prefix of its ids: the dialog `<testId>` (its parts FormDialog's
   * `-submit`, `-cancel`), the type `<testId>-type`, the source
   * `<testId>-from`, the PGN `<testId>-pgn` (PgnInput's parts) — once a file
   * is read, its plate `<testId>-file` in its place (`-file-remove`, and a
   * one-game file's problem `-file-problem`) — the FEN `<testId>-fen`; a PGN of several games — the note `<testId>-many-note`,
   * the choice `<testId>-many` (its radios `-many-select`, `-many-perGame`),
   * the game `<testId>-game` (its input `<testId>-game-input`) and its
   * problem `<testId>-game-problem`; the progress `<testId>-progress`, a
   * Case-each parse's problem `<testId>-parse-problem`; the ply
   * `<testId>-ply`, the name `<testId>-name`, the problem `<testId>-problem`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

type CaseType = "game" | "position";
type PositionSource = "fen" | "pgn";
/** What a PGN of several games makes: the one game picked, or a Case each. */
type ManyChoice = "select" | "perGame";

/** At most this many games listed at once — typing narrows thousands (the Case picker's, CTA-199). */
const GAMES_SHOWN = 50;

/** A zip's refusal as the catalog words it. */
const ZIP_PROBLEMS: Record<CollectionZipProblem, string> = {
  zip: "zip",
  "zip-empty": "zipEmpty",
  "too-large": "tooLarge",
};

/** What is being worked on: the file read, or the games parsed — so many of so many. */
type Work = { kind: "file" } | { kind: "parse"; done: number; total: number };

/** Let the page paint the progress before a stretch of work. */
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** A parse error's words, for an alert's detail. */
const detailOf = (error: unknown): string | undefined =>
  error instanceof PgnParseError || error instanceof Error ? error.message : undefined;

/** A game as the picker lists it: "White – Black, Event, Date", or its number before its event and date. */
const gameLabel = (game: Pick<GameTree, "headers">, index: number, numbered: (index: number) => string): string => {
  const white = gameTag(game.headers, "White");
  const black = gameTag(game.headers, "Black");
  const players = white !== undefined || black !== undefined ? `${white ?? "?"} – ${black ?? "?"}` : numbered(index);
  return [players, gameTag(game.headers, "Event"), gameTag(game.headers, "Date")]
    .filter((part): part is string => part !== undefined && part !== "")
    .join(", ");
};

/** "1. e4", "1… e5" — a move as a ply picker lists it. */
const moveLabel = (startFen: string, ply: number, san: string): string => {
  const { number, isWhiteMove } = plyLabel(startFen, ply);
  return `${number}${isWhiteMove ? "." : "…"} ${san}`;
};

/**
 * **A new Case** (CTA-186) — lichess's new-chapter dialog for Analysis V2:
 * **Game** or **Position**, and a Position **from a FEN** (checked as it is
 * typed) or **from a PGN** at a move the reader picks, the moves before it
 * kept. A PGN is pasted or a `.pgn` or a `.zip` picked (`PgnInput`) — a
 * zip's `.pgn` files read together as one list of games, in its order
 * (CTA-208). **A file read takes the input's place** as a plate — its name,
 * size and games, and × to remove it, which brings the file button and the
 * paste box back; its text never goes into the paste box (a large one there
 * froze the page). A file refused leaves the input, its problem under it. **Several games** — a Case being a single
 * PGN, the dialog says so and asks what to make of them: for a Game,
 * **select one** or **one Case per game** (off, saying why, past the app's
 * cap of Cases); a Position selects one, then its move. The game is
 * picked in an autocomplete built for thousands — at most
 * {@link GAMES_SHOWN} listed, typing narrows.
 *
 * **Built for files of thousands of games** (CTA-208): a PGN read is only
 * indexed — each game's tags and start (`indexPgnGames`), milliseconds for
 * 15,000 games — and only the game picked is parsed; a Case per game parses
 * them all on Create (`parsePgnGameEntries`), in slices that give
 * the page back, a progress bar counting the games, Cancel stopping it. A
 * game that will not read is said when it is picked, or when a Case each
 * reaches it. The name is optional: left empty, the Case is named from its
 * game or position.
 *
 * Presentational: it reads the text with `src/lib/`'s pure parsers and hands
 * back what the reader asked for ({@link NewCaseSpec}); making and writing
 * the Cases is the screen's. Its words are the app's (`analysisV2.newCase.*`).
 */
function NewCaseDialog({
  open,
  onClose,
  onCreate,
  busy = false,
  problem = null,
  initialPgn,
  initialFileName,
  testId,
  dialogProps,
}: NewCaseDialogProps) {
  const { t, i18n } = useTranslation();
  const [type, setType] = useState<CaseType>("game");
  const [from, setFrom] = useState<PositionSource>("fen");
  const [pasted, setPasted] = useState(initialFileName === undefined ? (initialPgn ?? "") : "");
  const [entries, setEntries] = useState<readonly PgnGameEntry[]>(() => (initialPgn === undefined ? [] : indexPgnGames([initialPgn])));
  const [readProblem, setReadProblem] = useState<UploadProblem | null>(null);
  const [selectedGame, setSelectedGame] = useState(0);
  const [many, setMany] = useState<ManyChoice>("select");
  /** The file the games were read from — shown as a plate in the input's place. */
  const initialFile = initialPgn !== undefined && initialFileName !== undefined ? { name: initialFileName, size: initialPgn.length } : null;
  const [file, setFile] = useState<{ name: string; size: number } | null>(initialFile);
  const [ply, setPly] = useState(0);
  const [fen, setFen] = useState("");
  const [name, setName] = useState("");
  const [work, setWork] = useState<Work | null>(null);
  /** A Case-each's parse that met a game it could not read. */
  const [parseProblem, setParseProblem] = useState<UploadProblem | null>(null);
  /** The parse under way — Cancel, or the dialog going, stops it. */
  const running = useRef<AbortController | null>(null);
  useEffect(() => () => running.current?.abort(), []);

  // A dialog opened afresh starts empty — adjusted during render, as the screens' strips are.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setType("game");
      setFrom("fen");
      setPasted(initialFileName === undefined ? (initialPgn ?? "") : "");
      setEntries(initialPgn === undefined ? [] : indexPgnGames([initialPgn]));
      setReadProblem(null);
      setParseProblem(null);
      setWork(null);
      setSelectedGame(0);
      setMany("select");
      setFile(initialFile);
      setPly(0);
      setFen("");
      setName("");
    }
  }

  const refuse = (problem: UploadProblem) => {
    setEntries([]);
    setReadProblem(problem);
  };

  /** The games of the texts, indexed: the first picked, the choice back to Select one; none, the file is forgotten. Answers how many. */
  const read = (texts: readonly string[]): number => {
    const indexed = indexPgnGames(texts);
    setParseProblem(null);
    if (indexed.length === 0) {
      setFile(null);
      refuse({ message: t("analysisV2.newCase.problem.empty") });
      return 0;
    }
    setEntries(indexed);
    setReadProblem(null);
    setSelectedGame(0);
    setMany("select");
    setPly(0);
    return indexed.length;
  };

  const readFiles = async (files: File[]) => {
    const file = files[0];
    if (file === undefined) return;
    setWork({ kind: "file" });
    try {
      if (isZipFile(file)) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        await nextTask();
        const zipped = readCollectionZip(bytes);
        if (!zipped.ok) {
          setFile(null);
          refuse({ message: t(`analysisV2.newCase.problem.${ZIP_PROBLEMS[zipped.problem]}`) });
          return;
        }
        if (read(zipped.entries.map((entry) => entry.text)) > 0) setFile({ name: file.name, size: file.size });
        return;
      }
      // Never into the paste box: a large text there froze the page.
      if (read([await file.text()]) > 0) setFile({ name: file.name, size: file.size });
    } catch {
      setFile(null);
      refuse({ message: t("analysisV2.newCase.problem.file") });
    } finally {
      setWork(null);
    }
  };

  /** Every game parsed, in slices, the bar counting them — `undefined` when stopped, or a game would not read (said). */
  const parseAll = async (): Promise<GameTree[] | undefined> => {
    const controller = new AbortController();
    running.current = controller;
    setParseProblem(null);
    setWork({ kind: "parse", done: 0, total: entries.length });
    try {
      await nextTask();
      return await parsePgnGameEntries(entries, {
        signal: controller.signal,
        onProgress: (done, total) => setWork({ kind: "parse", done, total }),
      });
    } catch (error) {
      if (!controller.signal.aborted) setParseProblem({ message: t("analysisV2.newCase.problem.unreadable"), detail: detailOf(error) });
      return undefined;
    } finally {
      if (running.current === controller) running.current = null;
      if (!controller.signal.aborted) setWork(null);
    }
  };

  /** × on the plate: the file and its games gone, the input back. */
  const removeFile = () => {
    setFile(null);
    setEntries([]);
    setReadProblem(null);
    setParseProblem(null);
    setSelectedGame(0);
    setMany("select");
    setPly(0);
  };

  const close = () => {
    running.current?.abort();
    setWork(null);
    onClose();
  };

  const fenProblem = useMemo(() => {
    if (fen.trim() === "") return null;
    try {
      parseFen(fen);
      return null;
    } catch (error) {
      return error instanceof FenParseError ? error.detail : String(error);
    }
  }, [fen]);

  // Only the game picked is parsed — one game, a few milliseconds.
  const picked = useMemo((): { tree: GameTree } | { problem: UploadProblem } | undefined => {
    const entry = entries[selectedGame];
    if (entry === undefined) return undefined;
    try {
      return { tree: parsePgnTree(entry.text, entries.length > 1 ? selectedGame + 1 : undefined) };
    } catch (error) {
      return { problem: { message: t("analysisV2.newCase.problem.unreadable"), detail: detailOf(error) } };
    }
  }, [entries, selectedGame, t]);
  const game: GameTree | undefined = picked !== undefined && "tree" in picked ? picked.tree : undefined;
  const pickedProblem = picked !== undefined && "problem" in picked ? picked.problem : null;
  const line = useMemo(() => (game === undefined ? [] : mainline(game)), [game]);
  const usesPgn = type === "game" || from === "pgn";
  const several = usesPgn && entries.length > 1;
  // More games than the app keeps Cases: a Case each would be refused once every game was parsed.
  const perGameFits = entries.length <= MAX_ANALYSIS_CASES;
  // A Position is one game's; a choice the games cannot make is no choice.
  const choice: ManyChoice =
    !several || type === "position" || (many === "perGame" && !perGameFits) ? "select" : many;
  const manyAtOnce = choice === "perGame";

  const gameOptions = useMemo((): AutocompleteOption[] => {
    if (!several) return [];
    const numbered = (index: number) => t("analysisV2.newCase.gameNumber", { number: index + 1 });
    return entries.map((entry, index) => ({ value: String(index), label: gameLabel(entry, index, numbered) }));
  }, [entries, several, t]);

  const working = work !== null;
  // A Case each needs every game, parsed on Create; the others the one picked.
  const ready =
    !working && (usesPgn ? (choice === "select" ? game !== undefined : entries.length > 1) : fen.trim() !== "" && fenProblem === null);

  const submit = async () => {
    if (!ready || busy) return;
    if (manyAtOnce) {
      const games = await parseAll();
      if (games !== undefined) onCreate(games.map((tree) => ({ type: "game", tree, name: "" })));
    } else if (type === "game" && game !== undefined) {
      onCreate([{ type: "game", tree: game, name }]);
    } else if (from === "pgn" && game !== undefined) {
      onCreate([{ type: "position", tree: game, nodeId: ply === 0 ? null : (line[ply - 1]?.id ?? null), name }]);
    } else {
      onCreate([{ type: "position", fen: parseFen(fen), name }]);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={close}
      onSubmit={() => void submit()}
      title={t("analysisV2.newCase.title")}
      submitLabel={t("analysisV2.newCase.create")}
      cancelLabel={t("analysisV2.newCase.cancel")}
      submitDisabled={!ready}
      busy={busy}
      width="sm"
      testId={testId}
      dialogProps={dialogProps}
    >
      <Box sx={{ display: "grid", gap: 2 }}>
        <RadioGroupField<CaseType>
          label={t("analysisV2.newCase.type")}
          options={[
            { value: "game", label: t("analysisV2.case.typeGame") },
            { value: "position", label: t("analysisV2.case.typePosition") },
          ]}
          value={type}
          onChange={setType}
          row
          testId={`${testId}-type`}
        />
        {type === "position" && (
          <RadioGroupField<PositionSource>
            label={t("analysisV2.newCase.from")}
            options={[
              { value: "fen", label: t("analysisV2.newCase.fromFen") },
              { value: "pgn", label: t("analysisV2.newCase.fromPgn") },
            ]}
            value={from}
            onChange={setFrom}
            row
            help={t(from === "fen" ? "analysisV2.newCase.fromFenHelp" : "analysisV2.newCase.fromPgnHelp")}
            testId={`${testId}-from`}
          />
        )}
        {usesPgn && file !== null ? (
          <Box sx={{ display: "grid", gap: 1 }}>
            <Box
              data-testid={`${testId}-file`}
              sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}
            >
              <InsertDriveFileOutlinedIcon aria-hidden sx={{ color: "text.secondary" }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" dir="auto" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {`${formatBytes(file.size)} · ${t("analysisV2.newCase.read", { count: entries.length })}`}
                </Typography>
              </Box>
              <IconAction
                label={t("analysisV2.newCase.removeFile", { name: file.name })}
                onClick={removeFile}
                disabled={busy || working}
                testId={`${testId}-file-remove`}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconAction>
            </Box>
            {entries.length === 1 && pickedProblem !== null && (
              <InlineAlert severity="error" detail={pickedProblem.detail} testId={`${testId}-file-problem`}>
                {pickedProblem.message}
              </InlineAlert>
            )}
          </Box>
        ) : usesPgn ? (
          <PgnInput
            labels={{
              file: t("analysisV2.newCase.pgnFile"),
              paste: t("analysisV2.newCase.pgnPaste"),
              submit: t("analysisV2.newCase.pgnRead"),
            }}
            onFiles={(files) => void readFiles(files)}
            zip
            pasted={pasted}
            onPastedChange={setPasted}
            onSubmit={() => {
              read([pasted]);
            }}
            submitVariant="outlined"
            fileVariant="outlined"
            disabled={busy || working}
            busy={entries.length > 0 ? t("analysisV2.newCase.read", { count: entries.length }) : undefined}
            // One game that will not read is the text's problem; one of several is said where it is picked.
            problem={readProblem ?? (entries.length === 1 ? pickedProblem : null)}
            testId={`${testId}-pgn`}
          />
        ) : (
          <TextInputField
            label={t("analysisV2.newCase.fen")}
            value={fen}
            onChange={setFen}
            dir="ltr"
            error={fenProblem !== null}
            helperText={
              fenProblem === null ? t("analysisV2.newCase.fenHelp") : t("analysisV2.newCase.fenProblem", { detail: fenProblem })
            }
            disabled={busy || working}
            testId={`${testId}-fen`}
          />
        )}
        {several && (
          <Typography variant="body2" data-testid={`${testId}-many-note`}>
            {t("analysisV2.newCase.many.single")}
          </Typography>
        )}
        {several && type === "game" && (
          <RadioGroupField<ManyChoice>
            label={t("analysisV2.newCase.many.label", { number: entries.length })}
            options={[
              { value: "select", label: t("analysisV2.newCase.many.select") },
              { value: "perGame", label: t("analysisV2.newCase.many.perGame", { number: entries.length }), disabled: !perGameFits },
            ]}
            value={choice}
            onChange={setMany}
            help={[
              t(`analysisV2.newCase.many.${choice}Help`),
              ...(perGameFits ? [] : [t("analysisV2.newCase.many.perGameUnavailable", { max: MAX_ANALYSIS_CASES.toLocaleString(i18n.language) })]),
            ].join(" ")}
            disabled={busy || working}
            testId={`${testId}-many`}
          />
        )}
        {choice === "select" && several && (
          <SelectAutocomplete
            label={t("analysisV2.newCase.game")}
            placeholder={t("analysisV2.newCase.gamePlaceholder")}
            value={String(selectedGame)}
            onChange={(next) => {
              if (next === null) return;
              setSelectedGame(Number(next));
              setPly(0);
            }}
            options={gameOptions}
            clearable={false}
            maxShown={GAMES_SHOWN}
            disabled={busy || working}
            testId={`${testId}-game`}
          />
        )}
        {choice === "select" && several && pickedProblem !== null && (
          <InlineAlert severity="error" detail={pickedProblem.detail} testId={`${testId}-game-problem`}>
            {t("analysisV2.newCase.problem.gameUnreadable")}
          </InlineAlert>
        )}
        {type === "position" && from === "pgn" && game !== undefined && (
          <SelectField
            label={t("analysisV2.newCase.ply")}
            value={String(ply)}
            onChange={(value) => setPly(Number(value))}
            options={[
              { value: "0", label: t("analysisV2.newCase.start") },
              ...line.map((node, index) => ({
                value: String(index + 1),
                label: moveLabel(game.startFen, node.ply, node.san),
              })),
            ]}
            optionDir="ltr"
            helperText={t("analysisV2.newCase.plyHelp")}
            disabled={busy || working}
            fullWidth
            testId={`${testId}-ply`}
          />
        )}
        {!manyAtOnce && (
          <TextInputField
            label={t("analysisV2.newCase.name")}
            value={name}
            onChange={setName}
            dir="auto"
            helperText={t("analysisV2.case.nameHelp")}
            disabled={busy || working}
            testId={`${testId}-name`}
          />
        )}
        {work !== null && (
          <ProgressLine
            label={t("analysisV2.newCase.progress.label")}
            value={work.kind === "parse" && work.total > 0 ? (work.done / work.total) * 100 : undefined}
            caption={
              work.kind === "file"
                ? t("analysisV2.newCase.progress.file")
                : t("analysisV2.newCase.progress.parse", { done: work.done.toLocaleString(i18n.language), total: work.total.toLocaleString(i18n.language) })
            }
            announce
            testId={`${testId}-progress`}
          />
        )}
        {parseProblem !== null && (
          <InlineAlert severity="error" detail={parseProblem.detail} testId={`${testId}-parse-problem`}>
            {parseProblem.message}
          </InlineAlert>
        )}
        {problem !== null && (
          <InlineAlert severity="error" testId={`${testId}-problem`}>
            {problem}
          </InlineAlert>
        )}
      </Box>
    </FormDialog>
  );
}

export default NewCaseDialog;
