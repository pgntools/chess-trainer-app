import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import type { ChessboardOptions } from "react-chessboard";
import { useTranslation } from "react-i18next";

import { SuggestionList } from "../../../blocks/lists";
import { AccuracySessionReport, GradedLines, type AccuracyReportRow } from "../../../blocks/panels";
import type { SideValue } from "../../../design-system/components/forms";
import { LabelChip } from "../../../design-system/components/tables";
import { useChessTokens } from "../../../design-system/theme";
import {
  bareSan,
  gradePosition,
  moveSquaresOf,
  sanOfMove,
  sessionPositionsOf,
  sessionSummaryOf,
  type PositionGrade,
  type SuggestionGrade,
  type TrainingPosition,
} from "../../../lib/accuracyTrainer";
import type { BoardPanelTab } from "../../board/core/BoardPanel";
import BoardShell from "../../board/core/BoardShell";
import { useBoardCore } from "../../board/core/useBoardCore";
import { usePageTitle } from "../../main/pageTitle";
import AccuracySetup, { type AccuracySource } from "./AccuracySetup";

/** A session: the positions it asks, where the reader is, and what they answered (`null` not yet). */
type Session = {
  positions: readonly TrainingPosition[];
  index: number;
  answers: readonly (readonly string[] | null)[];
};

type Tab = "train" | "summary";

const ID = "accuracy-trainer";

/**
 * **The Accuracy Trainer** (CTA-238) — experimental, and **dev-only**: its
 * route and sidebar entry exist under `import.meta.env.DEV` alone
 * (`routes.tsx`'s `devRoutes`, `navItems.ts`). The reference is
 * `.claude/rules/accuracy-trainer.md`.
 *
 * A fully analysed game is loaded (`AccuracySetup`), a side picked, and the
 * session walks that side's analysed positions in game order. At each one
 * **the reader plays the moves they think best on the board** — each joins
 * the list (`SuggestionList`) and the board comes back to the position —
 * then Submits (or Passes); **the engine's lines are revealed**, the
 * suggestions graded (`GradedLines`, `lib/accuracyTrainer.ts`), then Next.
 * The Summary tab is the session's report (`AccuracySessionReport`), each
 * position a way back to it.
 *
 * Composed from the board core (`chessboard.md` §9): `useBoardCore` holds the
 * position (`loadFen` — a position turns the board to the side to move), and
 * the reader's drops go through this screen's wrappers, as the repertoire
 * trainer's do: a legal move is **read** (`sanOfMove`), never played, so the
 * tree never grows and the board snaps back; a promotion goes through the
 * core's picker, its answer read the same way. **No engine runs here**: the
 * evaluations are the tree's. Nothing is kept — leaving ends the session.
 */
function AccuracyTrainer() {
  const { t } = useTranslation();
  const { drawing } = useChessTokens();
  const core = useBoardCore();

  const [source, setSource] = useState<AccuracySource | null>(null);
  const [side, setSide] = useState<SideValue>("all");
  const [session, setSession] = useState<Session | null>(null);
  const [draft, setDraft] = useState<readonly string[]>([]);
  const [tab, setTab] = useState<Tab>("train");

  usePageTitle(source?.name);

  const position = session === null ? undefined : session.positions[session.index];
  const answer = session === null ? null : session.answers[session.index];
  const answering = position !== undefined && answer === null;

  const grades = useMemo(
    () => (session === null ? [] : session.positions.map((each, index) => {
      const given = session.answers[index];
      return given === null ? null : gradePosition(each, given);
    })),
    [session],
  );
  const grade: PositionGrade | null = session === null ? null : grades[session.index];

  /** Show a position of the session. */
  const goTo = (index: number, current: Session) => {
    const next = current.positions[index];
    if (next === undefined) return;
    setSession({ ...current, index });
    setDraft([]);
    core.loadFen(next.fen);
  };

  const start = () => {
    if (source === null) return;
    const positions = sessionPositionsOf(source.positions, side === "all" ? "both" : side === "white" ? "w" : "b");
    if (positions.length === 0) return;
    setTab("train");
    goTo(0, { positions, index: 0, answers: positions.map(() => null) });
  };

  const newSession = () => {
    setSession(null);
    setDraft([]);
    setTab("train");
    core.reset();
  };

  const suggest = (san: string) => setDraft((moves) => (moves.some((move) => bareSan(move) === bareSan(san)) ? moves : [...moves, san]));

  /** Grade the position on screen: its suggestions, or none — a pass. */
  const submit = (moves: readonly string[]) => {
    if (session === null) return;
    setSession({ ...session, answers: session.answers.map((given, index) => (index === session.index ? [...moves] : given)) });
    setDraft([]);
  };

  const next = () => {
    if (session === null) return;
    // The next position still to answer, else the summary.
    const later = session.answers.findIndex((given, index) => index > session.index && given === null);
    if (later >= 0) goTo(later, session);
    else setTab("summary");
  };

  // A drop is read, never played: a legal move joins the list and the piece snaps back.
  const onPieceDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }): boolean => {
    if (!answering || position === undefined || targetSquare === null) return false;
    const san = sanOfMove(position.fen, sourceSquare, targetSquare);
    if (san !== undefined) suggest(san);
    // No plain move there: a promotion opens the core's picker (anything else it refuses).
    else core.onPieceDrop({ sourceSquare, targetSquare });
    return false;
  };
  const resolvePromotion = (piece: "q" | "r" | "b" | "n" | null) => {
    const pending = core.promotion;
    core.resolvePromotion(null);
    if (pending === null || piece === null || position === undefined) return;
    const san = sanOfMove(position.fen, pending.from, pending.to, piece);
    if (san !== undefined) suggest(san);
  };

  // The suggestions as arrows while answering; once graded, line 1 in green and each suggestion in its verdict's colour.
  const arrows = useMemo(() => {
    if (position === undefined) return [];
    const arrowOf = (san: string, color: string) => {
      const squares = moveSquaresOf(position.fen, san);
      return squares === undefined ? [] : [{ startSquare: squares.from, endSquare: squares.to, color }];
    };
    if (grade === null) return draft.flatMap((san) => arrowOf(san, drawing.blue));
    const best = position.lines[0];
    const colourOf = (each: SuggestionGrade) =>
      each.kind === "outside" || each.verdict === "blunder" ? drawing.red : each.verdict === null ? drawing.blue : drawing.yellow;
    return [
      ...arrowOf(best.san, drawing.green),
      ...grade.suggestions.filter((each) => bareSan(each.san) !== bareSan(best.san)).flatMap((each) => arrowOf(each.san, colourOf(each))),
    ];
  }, [position, grade, draft, drawing]);
  const boardOptions = useMemo<ChessboardOptions>(() => ({ arrows }), [arrows]);

  const reportRows = useMemo<AccuracyReportRow[]>(
    () =>
      session === null
        ? []
        : session.positions.map((each, index) => ({
            index,
            moveNumber: each.moveNumber,
            turn: each.turn,
            playedSan: each.playedSan,
            bestSan: each.lines[0].san,
            suggestions: session.answers[index] ?? [],
            grade: grades[index],
          })),
    [session, grades],
  );
  const summary = useMemo(() => sessionSummaryOf(grades.flatMap((each) => (each === null ? [] : [each]))), [grades]);

  const trainContent =
    session === null || position === undefined ? (
      <AccuracySetup source={source} onSource={setSource} side={side} onSide={setSide} onStart={start} />
    ) : (
      <Box data-testid={`${ID}-position`} sx={{ display: "grid", gap: 1.5, p: 1 }}>
        {answering && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("accuracyTrainer.position.instructions")}
          </Typography>
        )}
        <SuggestionList
          moves={answering ? draft : (answer ?? [])}
          onRemove={answering ? (san) => setDraft((moves) => moves.filter((move) => move !== san)) : undefined}
          testId={`${ID}-suggestions`}
        />
        {grade !== null && <GradedLines position={position} grade={grade} testId={`${ID}-graded`} />}
      </Box>
    );

  const tabs: BoardPanelTab[] = [
    { id: "train", label: t("accuracyTrainer.position.train"), content: trainContent },
    {
      id: "summary",
      label: t("accuracyTrainer.position.summary"),
      disabled: session === null,
      content: (
        <Box sx={{ p: 1 }}>
          <AccuracySessionReport
            summary={summary}
            rows={reportRows}
            onOpen={(index) => {
              if (session === null) return;
              setTab("train");
              goTo(index, session);
            }}
            testId={`${ID}-report`}
          />
        </Box>
      ),
    },
  ];

  const header = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flexWrap: "wrap" }}>
      <Box title={t("accuracyTrainer.experimentalHint")}>
        <LabelChip label={t("accuracyTrainer.experimental")} tone="info" testId={`${ID}-experimental`} />
      </Box>
      {position !== undefined && session !== null && (
        <Typography variant="body2" data-testid={`${ID}-progress`} sx={{ fontWeight: 600, minWidth: 0 }}>
          {t("accuracyTrainer.position.progress", { at: session.index + 1, count: session.positions.length })}
          {" · "}
          <Box component="span" dir="ltr">{`${position.moveNumber}${position.turn === "w" ? "." : "…"}`}</Box>{" "}
          {t(position.turn === "w" ? "accuracyTrainer.position.white" : "accuracyTrainer.position.black")}
        </Typography>
      )}
    </Box>
  );

  const footer = session !== null && (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, flexWrap: "wrap" }}>
      <Button size="small" onClick={newSession} data-testid={`${ID}-new-session`}>
        {t("accuracyTrainer.position.newSession")}
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      {tab === "train" && answering && (
        <>
          <Button variant="outlined" onClick={() => submit([])} data-testid={`${ID}-pass`}>
            {t("accuracyTrainer.position.pass")}
          </Button>
          <Button variant="contained" onClick={() => submit(draft)} disabled={draft.length === 0} data-testid={`${ID}-submit`}>
            {t("accuracyTrainer.position.submit")}
          </Button>
        </>
      )}
      {tab === "train" && !answering && (
        <Button variant="contained" onClick={next} data-testid={`${ID}-next`}>
          {session.answers.some((given, index) => index > session.index && given === null)
            ? t("accuracyTrainer.position.next")
            : t("accuracyTrainer.position.summary")}
        </Button>
      )}
    </Box>
  );

  return (
    <BoardShell
      id={ID}
      core={{ ...core, onPieceDrop, resolvePromotion }}
      showEvalBar={false}
      allowDragging={answering}
      boardOptions={boardOptions}
      panel={{
        testId: `${ID}-panel`,
        header,
        tabs,
        activeTab: tab,
        onTabChange: (id) => setTab(id as Tab),
        footer,
      }}
    />
  );
}

export default AccuracyTrainer;
