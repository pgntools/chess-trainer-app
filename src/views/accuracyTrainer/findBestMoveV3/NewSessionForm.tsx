import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { InlineAlert } from "../../../design-system/components/feedback";
import { SliderField, SwitchField, type SideValue } from "../../../design-system/components/forms";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { terminalResultOf } from "../../../lib/computerAnalysis";
import { parseFen } from "../../../lib/fen";
import { START_POSITION } from "../../../lib/positionEditor";
import PositionEditor from "../../shared/positionEditor/PositionEditor";
import { usePositionEditor } from "../../shared/positionEditor/usePositionEditor";
import { sessionPath } from "./paths";
import { createSessionCase, positionSessionTreeOf, sessionStartTreeOf, type NewSessionSettings } from "./sessionCase";
import SessionSetup from "./SessionSetup";
import { setupReadingOf, type SessionSource } from "./sessionSetup";

const FORM_TABS = ["game", "editor", "settings"] as const;
type FormTab = (typeof FORM_TABS)[number];

/** How many best moves may be asked for — the Engine menu's own range of lines. */
const MOVES_BOUNDS = { min: 1, max: 10 } as const;

const DEFAULT_SETTINGS: NewSessionSettings = { moves: 3, engine: false, showArrows: true };

/** The widest the editor's board grows in the panel — a small board, as on Play with Engine's form. */
const EDITOR_BOARD_MAX_PX = 360;

/**
 * **A new Find Best Move session** (CTA-239) — the sessions lobby's
 * right-hand panel, as the Lobby's new-game form is Play with Engine's: two
 * tabs — **Game** (`SessionSetup`: a PGN uploaded or pasted, or a Case
 * picked, and the side; a session's own PGN known by its tags), **Board
 * editor** (the shared `PositionEditor`: a position other than the standard
 * start is the session's — one position, the side to move's, its lines the
 * engine's; the Game tab says so, with *Edit* and *Use a game instead*) and
 * **Settings** (*Moves to find*, *Use the engine* — which decides whether a
 * plain game trains —, *Show next-move arrows*) — and a full-width **Start**
 * under all three (**Resume** for a session's PGN), off while nothing is
 * there to ask, or the position cannot be answered (said, with why). Start
 * makes the session's Case, its PGN the whole session
 * (`sessionStartTreeOf` / `positionSessionTreeOf`, `createSessionCase`), and
 * opens it at its address; a refused write is said above it.
 */
function NewSessionForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<FormTab>("game");
  const [source, setSource] = useState<SessionSource | null>(null);
  const [side, setSide] = useState<SideValue>("all");
  const [settings, setSettings] = useState<NewSessionSettings>(DEFAULT_SETTINGS);
  const [starting, setStarting] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);

  const setup = useMemo(() => setupReadingOf(source, settings.engine, side), [source, settings.engine, side]);

  // The Board editor: a position other than the standard start is the session's, over any game loaded.
  const editor = usePositionEditor();
  const customFen = editor.fen === START_POSITION ? undefined : editor.fen;
  /** Why the position cannot be answered — `undefined` when it can (or none is set). */
  const positionProblem = useMemo((): "illegal" | "over" | undefined => {
    if (customFen === undefined) return undefined;
    if (!editor.isValid) return "illegal";
    try {
      parseFen(customFen);
    } catch {
      return "illegal";
    }
    return terminalResultOf(customFen) === undefined ? undefined : "over";
  }, [customFen, editor.isValid]);
  const startable = customFen === undefined ? setup.startable : positionProblem === undefined;

  const start = async () => {
    if (starting || !startable) return;
    let tree;
    let name;
    if (customFen !== undefined) {
      name = t("accuracyTrainer.sessions.form.positionName", {
        side: t(customFen.split(" ")[1] === "b" ? "accuracyTrainer.position.black" : "accuracyTrainer.position.white"),
      });
      tree = positionSessionTreeOf(customFen, name, settings);
    } else if (source !== null) {
      name = source.name;
      tree = sessionStartTreeOf(source, side, settings);
    }
    if (tree === undefined || name === undefined) return;
    setStarting(true);
    setProblem(undefined);
    const made = await createSessionCase({
      tree,
      projectName: t("accuracyTrainer.session.projectName"),
      caseName: t("accuracyTrainer.session.caseName", { name }),
    });
    setStarting(false);
    if (made === undefined) setProblem(t("accuracyTrainer.session.caseProblem"));
    else navigate(sessionPath(made.caseId));
  };

  return (
    <Box data-testid="new-session-form" sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, lineHeight: 1.3, flexShrink: 0 }}>
        {t("accuracyTrainer.sessions.newSession")}
      </Typography>

      <PanelTabs
        tabs={FORM_TABS.map((id) => ({ id, label: t(`accuracyTrainer.sessions.form.${id}`) }))}
        value={tab}
        onChange={(next) => setTab(next as FormTab)}
        ariaLabel={t("accuracyTrainer.sessions.newSession")}
        idPrefix="new-session"
        testId="new-session"
      />

      {/* The panel's one scrolling region: the aside scrolls nothing itself. */}
      <Box
        {...tabPanelProps("new-session", tab)}
        data-testid={`new-session-tab-content-${tab}`}
        sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", pr: 0.5 }}
      >
        {tab === "game" && (
          <>
            {customFen !== undefined && (
              <Box sx={{ mb: 2 }}>
                {/* The position in the detail block: machine words, pinned left to right. */}
                <InlineAlert severity="info" detail={customFen} testId="new-session-custom-position">
                  {t("accuracyTrainer.sessions.form.position")}
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
                    <Button size="small" data-testid="new-session-custom-position-edit" onClick={() => setTab("editor")}>
                      {t("accuracyTrainer.sessions.form.positionEdit")}
                    </Button>
                    <Button size="small" data-testid="new-session-custom-position-reset" onClick={editor.setStartingPosition}>
                      {t("accuracyTrainer.sessions.form.positionReset")}
                    </Button>
                  </Box>
                </InlineAlert>
              </Box>
            )}
            <SessionSetup source={source} onSource={setSource} setup={setup} engine={settings.engine} side={side} onSide={setSide} />
          </>
        )}
        {tab === "editor" && <PositionEditor editor={editor} testId="new-session-editor" boardMaxWidth={EDITOR_BOARD_MAX_PX} />}
        {tab === "settings" && (
          <Box sx={{ display: "grid", gap: 2 }}>
            <SliderField
              label={t("accuracyTrainer.details.moves")}
              value={settings.moves}
              onChange={(moves) => setSettings((current) => ({ ...current, moves }))}
              min={MOVES_BOUNDS.min}
              max={MOVES_BOUNDS.max}
              help={t("accuracyTrainer.details.movesHelp")}
              testId="new-session-moves"
            />
            <SwitchField
              size="small"
              testIdOn="control"
              testId="new-session-engine"
              checked={settings.engine}
              onChange={(engine) => setSettings((current) => ({ ...current, engine }))}
              label={t("accuracyTrainer.details.engine")}
              help={t("accuracyTrainer.details.engineHelp")}
            />
            <SwitchField
              size="small"
              testIdOn="control"
              testId="new-session-arrows"
              checked={settings.showArrows}
              onChange={(showArrows) => setSettings((current) => ({ ...current, showArrows }))}
              label={t("accuracyTrainer.details.arrows")}
              help={t("accuracyTrainer.details.arrowsHelp")}
            />
          </Box>
        )}
      </Box>

      <Box sx={{ flexShrink: 0, display: "grid", gap: 1 }}>
        {positionProblem !== undefined && (
          <InlineAlert severity="warning" dense testId="new-session-illegal">
            {t(positionProblem === "over" ? "accuracyTrainer.sessions.form.positionOver" : "accuracyTrainer.sessions.form.positionIllegal")}
            {positionProblem === "illegal" && editor.problems.length > 0 && (
              <Box component="ul" sx={{ m: 0, paddingInlineStart: 2 }}>
                {editor.problems.map((each) => (
                  <li key={each}>{t(`positionEditor.problems.${each}`)}</li>
                ))}
              </Box>
            )}
          </InlineAlert>
        )}
        {problem !== undefined && (
          <InlineAlert severity="error" dense testId="new-session-problem">
            {problem}
          </InlineAlert>
        )}
        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<PlayArrowRoundedIcon />}
          onClick={() => void start()}
          disabled={!startable || starting}
          data-testid="new-session-start"
          sx={{ py: 1.25, fontWeight: 700 }}
        >
          {t(customFen === undefined && setup.session !== undefined ? "accuracyTrainer.setup.resume" : "accuracyTrainer.setup.start")}
        </Button>
      </Box>
    </Box>
  );
}

export default NewSessionForm;
