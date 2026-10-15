import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { SelectAutocomplete, type AutocompleteOption } from "../../../design-system/components/autocompletes";
import { FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { CheckboxField, FieldLabel, RadioGroupField, SelectField, TextInputField } from "../../../design-system/components/forms";
import type { UploadProblem } from "../../../design-system/patterns/forms";
import { isZipFile, readZipGameTrees, type ZipGamesProblem } from "../../../lib/collectionZip";
import { FenParseError, parseFen } from "../../../lib/fen";
import { gameTag } from "../../../lib/gameModel";
import { mainline, mergeTrees, plyLabel, type GameTree } from "../../../lib/gameTree";
import { PgnParseError, parsePgnTrees } from "../../../lib/pgn";
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
  /** Create — one spec (a game picked, or the games merged), or one per game when the reader asked for a Case per game. */
  onCreate: (specs: NewCaseSpec[]) => void;
  /** The Cases are being written: the buttons off. */
  busy?: boolean;
  /** A write that was refused, worded by the screen — an alert in the dialog. */
  problem?: string | null;
  /** A PGN already read as the dialog opens — the gallery's samples. Absent: it opens empty. */
  initialPgn?: string;
  /**
   * The prefix of its ids: the dialog `<testId>` (its parts FormDialog's
   * `-submit`, `-cancel`), the type `<testId>-type`, the source
   * `<testId>-from`, the PGN `<testId>-pgn` (PgnInput's parts), the FEN
   * `<testId>-fen`; a PGN of several games — the note `<testId>-many-note`,
   * the choice `<testId>-many` (its radios `-many-merge`, `-many-select`,
   * `-many-perGame`), the merge's tags `<testId>-tag-games` and
   * `<testId>-tag-prc`, the game `<testId>-game` (its input
   * `<testId>-game-input`); the ply `<testId>-ply`, the name `<testId>-name`,
   * the problem `<testId>-problem`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

type CaseType = "game" | "position";
type PositionSource = "fen" | "pgn";
/** What a PGN of several games makes: one tree of them all, the one game picked, or a Case each. */
type ManyChoice = "merge" | "select" | "perGame";

/** At most this many games listed at once — typing narrows thousands (the Case picker's, CTA-199). */
const GAMES_SHOWN = 50;

/** A zip's refusal as the catalog words it. */
const ZIP_PROBLEMS: Record<ZipGamesProblem, string> = {
  zip: "zip",
  "zip-empty": "zipEmpty",
  "too-large": "tooLarge",
  empty: "empty",
  unreadable: "unreadable",
};

/** The games of a PGN the dialog opens on, or none where it does not read. */
const initialGamesOf = (text: string | undefined): GameTree[] => {
  if (text === undefined) return [];
  try {
    return parsePgnTrees(text);
  } catch {
    return [];
  }
};

/** A game as the picker lists it: "White – Black, Event, Date", or its number before its event and date. */
const gameLabel = (game: GameTree, index: number, numbered: (index: number) => string): string => {
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
 * (`readZipGameTrees`, CTA-208). **Several games** — a Case being a single
 * PGN, the dialog says so and asks what to make of them: for a Game,
 * **merge** them into one tree (`mergeTrees`, offered only where they share
 * a start, else off and saying why; optionally tagging each move where the
 * games part with `[%games N]` and / or `[%prc P]`), **select one**, or
 * **one Case per game**; a Position selects one, then its move. The game is
 * picked in an autocomplete built for thousands — at most
 * {@link GAMES_SHOWN} listed, typing narrows. The name is optional: left
 * empty, the Case is named from its game or position — a merge from the
 * file picked, else from the first game's event.
 *
 * Presentational: it reads the text with `src/lib/`'s pure parsers and hands
 * back what the reader asked for ({@link NewCaseSpec}); making and writing
 * the Cases is the screen's. Its words are the app's (`analysisV2.newCase.*`).
 */
function NewCaseDialog({ open, onClose, onCreate, busy = false, problem = null, initialPgn, testId, dialogProps }: NewCaseDialogProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<CaseType>("game");
  const [from, setFrom] = useState<PositionSource>("fen");
  const [pasted, setPasted] = useState(initialPgn ?? "");
  const [games, setGames] = useState<readonly GameTree[]>(() => initialGamesOf(initialPgn));
  const [readProblem, setReadProblem] = useState<UploadProblem | null>(null);
  const [selectedGame, setSelectedGame] = useState(0);
  const [many, setMany] = useState<ManyChoice>("select");
  const [tagGames, setTagGames] = useState(false);
  const [tagPrc, setTagPrc] = useState(false);
  /** The file the games came from, without its extension — a merge's name when none is typed. */
  const [fileStem, setFileStem] = useState<string | null>(null);
  const [ply, setPly] = useState(0);
  const [fen, setFen] = useState("");
  const [name, setName] = useState("");

  // A dialog opened afresh starts empty — adjusted during render, as the screens' strips are.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setType("game");
      setFrom("fen");
      setPasted(initialPgn ?? "");
      setGames(initialGamesOf(initialPgn));
      setReadProblem(null);
      setSelectedGame(0);
      setMany("select");
      setTagGames(false);
      setTagPrc(false);
      setFileStem(null);
      setPly(0);
      setFen("");
      setName("");
    }
  }

  /** Games read: the first picked, the choice back to Select one. */
  const accept = (trees: GameTree[]) => {
    setGames(trees);
    setReadProblem(null);
    setSelectedGame(0);
    setMany("select");
    setPly(0);
  };

  const refuse = (problem: UploadProblem) => {
    setGames([]);
    setReadProblem(problem);
  };

  const read = (text: string) => {
    try {
      const trees = parsePgnTrees(text);
      if (trees.length === 0) {
        refuse({ message: t("analysisV2.newCase.problem.empty") });
        return;
      }
      accept(trees);
    } catch (error) {
      refuse({
        message: t("analysisV2.newCase.problem.unreadable"),
        detail: error instanceof PgnParseError || error instanceof Error ? error.message : undefined,
      });
    }
  };

  const readFiles = async (files: File[]) => {
    const file = files[0];
    if (file === undefined) return;
    setFileStem(file.name.replace(/\.(pgn|zip)$/i, ""));
    try {
      if (isZipFile(file)) {
        // A zip's texts are not put in the paste box — there may be many, and large.
        setPasted("");
        const reading = readZipGameTrees(new Uint8Array(await file.arrayBuffer()));
        if (reading.ok) accept(reading.games);
        else refuse({ message: t(`analysisV2.newCase.problem.${ZIP_PROBLEMS[reading.problem]}`), detail: reading.detail });
        return;
      }
      const text = await file.text();
      setPasted(text);
      read(text);
    } catch {
      refuse({ message: t("analysisV2.newCase.problem.file") });
    }
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

  const game: GameTree | undefined = games[selectedGame];
  const line = useMemo(() => (game === undefined ? [] : mainline(game)), [game]);
  const usesPgn = type === "game" || from === "pgn";
  const several = usesPgn && games.length > 1;
  const mergeable = useMemo(() => games.length > 1 && games.every((tree) => tree.startFen === games[0].startFen), [games]);
  // A Position is one game's; a merge the games cannot make is no choice.
  const choice: ManyChoice = !several || type === "position" || (many === "merge" && !mergeable) ? "select" : many;
  const manyAtOnce = choice === "perGame";

  const gameOptions = useMemo((): AutocompleteOption[] => {
    if (!several) return [];
    const numbered = (index: number) => t("analysisV2.newCase.gameNumber", { number: index + 1 });
    return games.map((tree, index) => ({ value: String(index), label: gameLabel(tree, index, numbered) }));
  }, [games, several, t]);

  const ready = usesPgn ? game !== undefined : fen.trim() !== "" && fenProblem === null;

  const submit = () => {
    if (!ready || busy) return;
    if (manyAtOnce) {
      onCreate(games.map((tree) => ({ type: "game", tree, name: "" })));
    } else if (choice === "merge") {
      const named = name.trim() !== "" ? name : (fileStem ?? "");
      // A tree of many games: the name (or the first game's event) its Event, no result of its own.
      const event = named.trim() !== "" ? named : gameTag(games[0].headers, "Event");
      const tree = mergeTrees(
        games,
        games[0].startFen,
        { ...(event !== undefined && event !== "" ? { Event: event } : {}), Result: "*" },
        { countGames: tagGames, playChances: tagPrc },
      );
      onCreate([{ type: "game", tree, name: named }]);
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
      onClose={onClose}
      onSubmit={submit}
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
        {usesPgn ? (
          <PgnInput
            labels={{
              file: t("analysisV2.newCase.pgnFile"),
              paste: t("analysisV2.newCase.pgnPaste"),
              submit: t("analysisV2.newCase.pgnRead"),
            }}
            onFiles={(files) => void readFiles(files)}
            zip
            pasted={pasted}
            onPastedChange={(text) => {
              setPasted(text);
              // Typed over, the text is no longer the file's.
              setFileStem(null);
            }}
            onSubmit={() => read(pasted)}
            submitVariant="outlined"
            fileVariant="outlined"
            disabled={busy}
            busy={games.length > 0 ? t("analysisV2.newCase.read", { count: games.length }) : undefined}
            problem={readProblem}
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
            disabled={busy}
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
            label={t("analysisV2.newCase.many.label", { number: games.length })}
            options={[
              { value: "merge", label: t("analysisV2.newCase.many.merge"), disabled: !mergeable },
              { value: "select", label: t("analysisV2.newCase.many.select") },
              { value: "perGame", label: t("analysisV2.newCase.many.perGame", { number: games.length }) },
            ]}
            value={choice}
            onChange={setMany}
            help={[
              t(`analysisV2.newCase.many.${choice}Help`),
              ...(mergeable ? [] : [t("analysisV2.newCase.many.mergeUnavailable")]),
            ].join(" ")}
            disabled={busy}
            testId={`${testId}-many`}
          />
        )}
        {choice === "merge" && (
          <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0, display: "grid", gap: 1 }}>
            <FieldLabel component="legend">{t("analysisV2.newCase.tags.label")}</FieldLabel>
            <CheckboxField
              label={t("analysisV2.newCase.tags.games")}
              help={t("analysisV2.newCase.tags.gamesHelp")}
              checked={tagGames}
              onChange={setTagGames}
              disabled={busy}
              testId={`${testId}-tag-games`}
            />
            <CheckboxField
              label={t("analysisV2.newCase.tags.prc")}
              help={t("analysisV2.newCase.tags.prcHelp")}
              checked={tagPrc}
              onChange={setTagPrc}
              disabled={busy}
              testId={`${testId}-tag-prc`}
            />
          </Box>
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
            disabled={busy}
            testId={`${testId}-game`}
          />
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
            disabled={busy}
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
            disabled={busy}
            testId={`${testId}-name`}
          />
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
