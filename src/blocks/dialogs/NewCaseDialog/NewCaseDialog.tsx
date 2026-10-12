import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { CheckboxField, RadioGroupField, SelectField, TextInputField } from "../../../design-system/components/forms";
import type { UploadProblem } from "../../../design-system/patterns/forms";
import { FenParseError, parseFen } from "../../../lib/fen";
import { mainline, plyLabel, type GameTree } from "../../../lib/gameTree";
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
  /** Create — one spec, or one per game when the reader asked for a Case per game. */
  onCreate: (specs: NewCaseSpec[]) => void;
  /** The Cases are being written: the buttons off. */
  busy?: boolean;
  /** A write that was refused, worded by the screen — an alert in the dialog. */
  problem?: string | null;
  /**
   * The prefix of its ids: the dialog `<testId>` (its parts FormDialog's
   * `-submit`, `-cancel`), the type `<testId>-type`, the source
   * `<testId>-from`, the PGN `<testId>-pgn` (PgnInput's parts), the FEN
   * `<testId>-fen`, a Case per game `<testId>-per-game`, the ply
   * `<testId>-ply`, the name `<testId>-name`, the problem `<testId>-problem`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

type CaseType = "game" | "position";
type PositionSource = "fen" | "pgn";

/** "1. e4", "1… e5" — a move as a ply picker lists it. */
const moveLabel = (startFen: string, ply: number, san: string): string => {
  const { number, isWhiteMove } = plyLabel(startFen, ply);
  return `${number}${isWhiteMove ? "." : "…"} ${san}`;
};

/**
 * **A new Case** (CTA-186) — lichess's new-chapter dialog for Analysis V2:
 * **Game** or **Position**, and a Position **from a FEN** (checked as it is
 * typed) or **from a PGN** at a move the reader picks, the moves before it
 * kept. A PGN is pasted or a file picked (`PgnInput`); several games ask
 * which one — or, for a Game, offer **one Case per game**. The name is
 * optional: left empty, the Case is named from its game or position.
 *
 * Presentational: it reads the text with `src/lib/`'s pure parsers and hands
 * back what the reader asked for ({@link NewCaseSpec}); making and writing
 * the Cases is the screen's. Its words are the app's (`analysisV2.newCase.*`).
 */
function NewCaseDialog({ open, onClose, onCreate, busy = false, problem = null, testId, dialogProps }: NewCaseDialogProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<CaseType>("game");
  const [from, setFrom] = useState<PositionSource>("fen");
  const [pasted, setPasted] = useState("");
  const [games, setGames] = useState<readonly GameTree[]>([]);
  const [readProblem, setReadProblem] = useState<UploadProblem | null>(null);
  const [selectedGame, setSelectedGame] = useState(0);
  const [perGame, setPerGame] = useState(false);
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
      setPasted("");
      setGames([]);
      setReadProblem(null);
      setSelectedGame(0);
      setPerGame(false);
      setPly(0);
      setFen("");
      setName("");
    }
  }

  const read = (text: string) => {
    try {
      const trees = parsePgnTrees(text);
      if (trees.length === 0) {
        setGames([]);
        setReadProblem({ message: t("analysisV2.newCase.problem.empty") });
        return;
      }
      setGames(trees);
      setReadProblem(null);
      setSelectedGame(0);
      setPly(0);
    } catch (error) {
      setGames([]);
      setReadProblem({
        message: t("analysisV2.newCase.problem.unreadable"),
        detail: error instanceof PgnParseError || error instanceof Error ? error.message : undefined,
      });
    }
  };

  const readFiles = async (files: File[]) => {
    const file = files[0];
    if (file === undefined) return;
    const text = await file.text();
    setPasted(text);
    read(text);
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
  const manyAtOnce = type === "game" && perGame && games.length > 1;

  const ready = usesPgn ? game !== undefined : fen.trim() !== "" && fenProblem === null;

  const submit = () => {
    if (!ready || busy) return;
    if (manyAtOnce) {
      onCreate(games.map((tree) => ({ type: "game", tree, name: "" })));
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
              games: {
                title: t("analysisV2.newCase.games"),
                versus: t("analysisV2.newCase.versus"),
                fallback: (index) => t("analysisV2.newCase.gameNumber", { number: index + 1 }),
              },
            }}
            onFiles={(files) => void readFiles(files)}
            pasted={pasted}
            onPastedChange={setPasted}
            onSubmit={() => read(pasted)}
            submitVariant="outlined"
            fileVariant="outlined"
            disabled={busy}
            busy={games.length > 0 ? t("analysisV2.newCase.read", { count: games.length }) : undefined}
            problem={readProblem}
            games={games}
            selectedGame={selectedGame}
            onSelectGame={(index) => {
              setSelectedGame(index);
              setPly(0);
            }}
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
        {type === "game" && games.length > 1 && (
          <CheckboxField
            label={t("analysisV2.newCase.perGame", { count: games.length })}
            checked={perGame}
            onChange={setPerGame}
            disabled={busy}
            testId={`${testId}-per-game`}
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
