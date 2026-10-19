import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useTranslation } from "react-i18next";

import { SliderField, SwitchField } from "../../../design-system/components/forms";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { StatusText } from "../../../design-system/components/feedback";
import { LabelChip, type LabelChipTone } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import type { PositionGrade, SuggestionGrade, TrainingPosition } from "../../../lib/accuracyTrainer";
import { formatScore } from "../../../lib/engineAnalysis";
import { gradeHeadlineOf } from "../GradedLines";

/** The panel's tabs. */
export type AccuracyTrainerDetailsTab = "moves" | "settings";

/**
 * **The position the board stands at, as Your moves shows it** — the trained
 * position on screen or the last one before it: being answered (the
 * reader's moves, to reorder and delete), checked and waiting for the
 * engine's search, or graded (every line, the reader's moves marked).
 */
export type AccuracyTrainerMoves = { label: string } & (
  | {
      kind: "answering";
      /** In SAN, their best first. */
      list: readonly string[];
      /** One moved a place up or down their order. */
      onMove: (index: number, move: "up" | "down") => void;
      /** One deleted — its whole line. */
      onRemove: (index: number) => void;
    }
  | { kind: "waiting"; list: readonly string[] }
  /** An earlier position not answered yet — the reader skipped on from the summary. */
  | { kind: "unanswered" }
  | { kind: "graded"; position: TrainingPosition; grade: PositionGrade }
);

export type AccuracyTrainerDetailsProps = {
  /** The panel's heading: the game loaded, else the exercise's name. */
  title: string;
  /** The open tab — the screen's. */
  tab: AccuracyTrainerDetailsTab;
  onTabChange: (tab: AccuracyTrainerDetailsTab) => void;
  /** The next-move arrows over the reader's own analysis. */
  showArrows: boolean;
  onShowArrowsChange: (on: boolean) => void;
  /** How many best moves to find at each position, in order — and how many lines the engine is asked for. */
  movesToFind: number;
  onMovesToFindChange: (count: number) => void;
  /** A session runs: its moves to find are fixed — the slider off, saying so. */
  movesLocked?: boolean;
  /**
   * The engine (CTA-238): on, a position with fewer of its top lines than
   * the moves to find is searched — an Evaluate Position job — once the
   * reader starts on it.
   */
  engine: boolean;
  onEngineChange: (on: boolean) => void;
  /** The session's Case in Analysis — absent before a session starts. */
  caseLink?: LinkTarget;
  /** The position the board stands at — absent before a session starts. */
  moves?: AccuracyTrainerMoves;
  /**
   * The root; its parts `-title`, `-case` (the Case's link), `-tabs` (each tab
   * `<testId>-tab-<id>`), `-moves-tab` (its position `-moves-label`; being
   * answered a move `-move-<index>`, its actions `-move-<index>-up`, `-down`,
   * `-remove`, none `-moves-empty`; waiting `-moves-waiting`; graded the
   * headline `-moves-headline`, a line `-line-<rank>`, a move of the reader's
   * outside them `-outside-<order>`), `-settings` (`-moves`, `-arrows`,
   * `-engine`).
   */
  testId: string;
};

/** How many best moves may be asked for — the Engine menu's own range of lines. */
const MOVES_BOUNDS = { min: 1, max: 10 } as const;

/**
 * **An Accuracy Trainer exercise's own panel** (CTA-238) — beside its board,
 * in the main menu's place, as a Case's or a Library game's (`BoardLeftPanel`,
 * `keepShell`): the game loaded as its heading — and, once a session runs,
 * a link to its Case — then tabs — **Your moves**: the trained position the
 * board stands at (or the last one before it): being answered, the reader's
 * moves in their order, each moved up or down or deleted (their line with
 * it); checked and graded, **every one of the engine's lines with the
 * reader's moves marked** in it (their rank, *In place*, the verdict), a
 * divider closing the top N, and the reader's moves outside the lines after
 * it — and **Settings**:
 * *Moves to find* (how many
 * best moves, in order, at each position), *Show next-move arrows* (the
 * reader's analysis's continuations, on by default) and *Use the engine*
 * (CTA-238's Evaluate Position). A tab more is a field of
 * {@link AccuracyTrainerDetailsTab} and its content here.
 *
 * Presentational: the settings and the tab are props; the screen holds them
 * for the session. Its words are `accuracyTrainer.details.*`.
 */
function AccuracyTrainerDetails({
  title,
  tab,
  onTabChange,
  showArrows,
  onShowArrowsChange,
  movesToFind,
  onMovesToFindChange,
  movesLocked = false,
  engine,
  onEngineChange,
  caseLink,
  moves,
  testId,
}: AccuracyTrainerDetailsProps) {
  const { t } = useTranslation();
  return (
    <Box
      component="section"
      aria-label={t("accuracyTrainer.details.label", { name: title })}
      data-testid={testId}
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0 }}
    >
      <Typography
        component="h2"
        variant="subtitle2"
        dir="auto"
        data-testid={`${testId}-title`}
        sx={{ flexShrink: 0, fontWeight: 700, lineHeight: 1.3, overflowWrap: "anywhere", pb: 1 }}
      >
        {title}
      </Typography>
      {caseLink !== undefined && (
        <Box sx={{ flexShrink: 0, pb: 1 }}>
          <Link {...(linkProps(caseLink) as Record<string, unknown>)} variant="body2" underline="hover" data-testid={`${testId}-case`}>
            {t("accuracyTrainer.details.openCase")}
          </Link>
        </Box>
      )}
      <Box sx={{ flexShrink: 0, pb: 1 }}>
        <PanelTabs
          tabs={[
            { id: "moves", label: t("accuracyTrainer.details.tabs.moves") },
            { id: "settings", label: t("accuracyTrainer.details.tabs.settings") },
          ]}
          value={tab}
          onChange={(id) => onTabChange(id as AccuracyTrainerDetailsTab)}
          ariaLabel={t("accuracyTrainer.details.tabs.label")}
          idPrefix={testId}
          testId={`${testId}-tabs`}
          tabTestIdPrefix={testId}
        />
      </Box>
      {/* The open tab's content scrolls; the head and the tabs stay. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {tab === "moves" && (
          <Box {...tabPanelProps(testId, "moves")} data-testid={`${testId}-moves-tab`} sx={{ display: "grid", gap: 1, p: 1 }}>
            {moves === undefined ? (
              <Typography variant="body2" data-testid={`${testId}-moves-empty`} sx={{ color: "text.secondary" }}>
                {t("accuracyTrainer.details.movesNoSession")}
              </Typography>
            ) : (
              <>
                <Typography component="h3" variant="subtitle2" data-testid={`${testId}-moves-label`} sx={{ fontWeight: 700 }}>
                  {moves.label}
                </Typography>
                {moves.kind === "answering" && <AnsweringMoves moves={moves} testId={testId} />}
                {moves.kind === "waiting" && (
                  <>
                    <MoveList list={moves.list} testId={testId} />
                    <StatusText tone="info" testId={`${testId}-moves-waiting`}>
                      {t("accuracyTrainer.details.movesWaiting")}
                    </StatusText>
                  </>
                )}
                {moves.kind === "graded" && <GradedMoves position={moves.position} grade={moves.grade} testId={testId} />}
                {moves.kind === "unanswered" && (
                  <Typography variant="body2" data-testid={`${testId}-moves-unanswered`} sx={{ color: "text.secondary" }}>
                    {t("accuracyTrainer.details.movesUnanswered")}
                  </Typography>
                )}
              </>
            )}
          </Box>
        )}
        {tab === "settings" && (
          <Box
            {...tabPanelProps(testId, "settings")}
            data-testid={`${testId}-settings`}
            sx={{ display: "flex", flexDirection: "column", gap: 2, p: 1 }}
          >
            <SliderField
              label={t("accuracyTrainer.details.moves")}
              value={movesToFind}
              onChange={onMovesToFindChange}
              min={MOVES_BOUNDS.min}
              max={MOVES_BOUNDS.max}
              help={t("accuracyTrainer.details.movesHelp")}
              disabled={movesLocked}
              {...(movesLocked ? { notice: t("accuracyTrainer.details.movesLocked") } : {})}
              testId={`${testId}-moves`}
            />
            <SwitchField
              size="small"
              testIdOn="control"
              testId={`${testId}-arrows`}
              checked={showArrows}
              onChange={onShowArrowsChange}
              label={t("accuracyTrainer.details.arrows")}
              help={t("accuracyTrainer.details.arrowsHelp")}
            />
            <SwitchField
              size="small"
              testIdOn="control"
              testId={`${testId}-engine`}
              checked={engine}
              onChange={onEngineChange}
              label={t("accuracyTrainer.details.engine")}
              help={t("accuracyTrainer.details.engineHelp")}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

/** The reader's moves as a list, read only. */
function MoveList({ list, testId }: { list: readonly string[]; testId: string }) {
  const { t } = useTranslation();
  return (
    <Box component="ol" aria-label={t("accuracyTrainer.details.movesList")} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}>
      {list.map((san, index) => (
        <Box component="li" key={`${index}-${san}`} data-testid={`${testId}-move-${index}`} sx={{ display: "flex", gap: 1, minHeight: 28, alignItems: "center" }}>
          <Typography component="span" variant="body2" sx={{ color: "text.secondary", minWidth: "2ch", textAlign: "end" }}>
            {index + 1}.
          </Typography>
          <Typography component="span" variant="body2" dir="ltr" sx={{ fontWeight: 600 }}>
            {san}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** The position being answered: the reader's moves, each moved up or down or deleted. */
function AnsweringMoves({ moves, testId }: { moves: Extract<AccuracyTrainerMoves, { kind: "answering" }>; testId: string }) {
  const { t } = useTranslation();
  if (moves.list.length === 0) {
    return (
      <Typography variant="body2" data-testid={`${testId}-moves-empty`} sx={{ color: "text.secondary" }}>
        {t("accuracyTrainer.details.movesNone")}
      </Typography>
    );
  }
  return (
    <>
      <Box component="ol" aria-label={t("accuracyTrainer.details.movesList")} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}>
        {moves.list.map((san, index) => (
          <Box
            component="li"
            key={`${index}-${san}`}
            data-testid={`${testId}-move-${index}`}
            sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 32, borderBottom: 1, borderColor: "divider" }}
          >
            <Typography component="span" variant="body2" sx={{ color: "text.secondary", minWidth: "2ch", textAlign: "end" }}>
              {index + 1}.
            </Typography>
            <Typography component="span" variant="body2" dir="ltr" sx={{ fontWeight: 600, flexGrow: 1 }}>
              {san}
            </Typography>
            <IconAction label={t("accuracyTrainer.details.moveUp", { san })} onClick={() => moves.onMove(index, "up")} disabled={index === 0} testId={`${testId}-move-${index}-up`}>
              <ArrowUpwardRoundedIcon fontSize="small" />
            </IconAction>
            <IconAction
              label={t("accuracyTrainer.details.moveDown", { san })}
              onClick={() => moves.onMove(index, "down")}
              disabled={index === moves.list.length - 1}
              testId={`${testId}-move-${index}-down`}
            >
              <ArrowDownwardRoundedIcon fontSize="small" />
            </IconAction>
            <IconAction label={t("accuracyTrainer.details.moveRemove", { san })} onClick={() => moves.onRemove(index)} color="error" testId={`${testId}-move-${index}-remove`}>
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconAction>
          </Box>
        ))}
      </Box>
      <Typography variant="caption" component="p" sx={{ color: "text.secondary", m: 0 }}>
        {t("accuracyTrainer.details.movesHint")}
      </Typography>
    </>
  );
}

/** A reader's move's verdict as a chip: its words' key and its tone. */
const verdictOf = (grade: SuggestionGrade): { key: string; tone: LabelChipTone } => {
  if (grade.kind === "outside") return { key: "accuracyTrainer.lines.outside", tone: "secondary" };
  if (grade.verdict === "blunder") return { key: "computerAnalysis.verdicts.blunder", tone: "error" };
  if (grade.verdict !== null) return { key: `computerAnalysis.verdicts.${grade.verdict}`, tone: "warning" };
  return grade.loss === 0 ? { key: "accuracyTrainer.lines.best", tone: "success" } : { key: "accuracyTrainer.lines.good", tone: "info" };
};

/** The chips a reader's move carries: their rank for it, *In place*, its verdict. */
function YourMoveChips({ grade }: { grade: SuggestionGrade }) {
  const { t } = useTranslation();
  const verdict = verdictOf(grade);
  return (
    <Box component="span" sx={{ display: "inline-flex", flexWrap: "wrap", gap: 0.5 }}>
      <LabelChip label={t("accuracyTrainer.details.yours", { order: grade.order })} tone="primary" />
      {grade.inPlace && <LabelChip label={t("accuracyTrainer.lines.inPlace")} tone="success" />}
      <LabelChip label={t(verdict.key)} tone={verdict.tone} />
    </Box>
  );
}

/**
 * A graded position: the headline, then every one of the engine's lines best
 * first — rank, move, eval, loss — the reader's marked with their chips, a
 * divider closing the top N; then the reader's moves none of the lines has.
 */
function GradedMoves({ position, grade, testId }: { position: TrainingPosition; grade: PositionGrade; testId: string }) {
  const { t } = useTranslation();
  const headline = gradeHeadlineOf(grade);
  const outside = grade.suggestions.filter((each) => each.kind === "outside");
  return (
    <>
      <StatusText tone={headline.tone} emphasis testId={`${testId}-moves-headline`}>
        {t(headline.key, headline.values)}
      </StatusText>
      <Box component="ol" aria-label={t("accuracyTrainer.details.bestList")} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}>
        {position.lines.map((line) => {
          const yours = grade.suggestions.find((each) => each.kind === "line" && each.rank === line.rank);
          return (
            <Box
              component="li"
              key={line.rank}
              data-testid={`${testId}-line-${line.rank}`}
              sx={{
                display: "grid",
                gridTemplateColumns: "3ch 1fr auto",
                columnGap: 1,
                rowGap: 0.25,
                alignItems: "center",
                py: 0.5,
                borderBottom: line.rank === grade.target ? 2 : 1,
                borderColor: "divider",
              }}
            >
              <Typography component="span" variant="body2" sx={{ color: "text.secondary", textAlign: "end" }}>
                {line.rank}.
              </Typography>
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                <Typography component="span" variant="body2" dir="ltr" sx={{ fontWeight: yours === undefined ? 400 : 700 }}>
                  {line.san}
                </Typography>
                {line.played && <LabelChip label={t("accuracyTrainer.lines.gameMove")} name={t("accuracyTrainer.lines.gameMoveName")} tone="secondary" />}
              </Box>
              <Typography component="span" variant="caption" dir="ltr" sx={{ color: "text.secondary", textAlign: "end" }}>
                {`${formatScore(line.score)} · ${t("accuracyTrainer.details.lossShort", { loss: line.loss })}`}
              </Typography>
              {yours !== undefined && (
                <Box sx={{ gridColumn: "2 / 4" }}>
                  <YourMoveChips grade={yours} />
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      {grade.target > 0 && (
        <Typography variant="caption" component="p" sx={{ color: "text.secondary", m: 0 }}>
          {t("accuracyTrainer.details.topNote", { count: grade.target })}
        </Typography>
      )}
      {outside.length > 0 && (
        <Box component="ul" aria-label={t("accuracyTrainer.details.outsideList")} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}>
          {outside.map((each) => (
            <Box component="li" key={each.order} data-testid={`${testId}-outside-${each.order}`} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
              <Typography component="span" variant="body2" dir="ltr" sx={{ fontWeight: 700 }}>
                {each.san}
              </Typography>
              <YourMoveChips grade={each} />
            </Box>
          ))}
        </Box>
      )}
    </>
  );
}

export default AccuracyTrainerDetails;
