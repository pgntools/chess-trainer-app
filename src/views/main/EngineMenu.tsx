import { useId, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { keyframes, useTheme } from "@mui/material/styles";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import { Link as RouterLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";

import { EngineSearchSettingsForm } from "../../blocks/forms";
import { EnginePresetChanges } from "../../blocks/panels";
import { saveEnginePresetDraft, saveEnginePresetDraftAsNew } from "../../lib/enginePresetDraft";
import { selectEnginePreset } from "../../lib/enginePresetStore";
import { searchSettingLimitsOf, searchSettingTypedLimitsOf } from "../../lib/engineSearchSettings";
import { describeEngines, resolveEngine } from "../../lib/engines";
import { SwitchField } from "../../design-system/components/forms";
import { EVAL_SOURCES, type EvalSource } from "../../lib/evalSources";
import EvalSourceConnectionDot from "../shared/EvalSourceConnectionDot";
import { useEngineChoice } from "../shared/useEngineChoice";
import { useEngineSearchSettings } from "../shared/useEngineSearchSettings";
import { useEngineServer } from "../shared/useEngineServer";
import { useEvalSourceConnection } from "../shared/useEvalSourceConnection";
import { useSelectedEnginePreset } from "../shared/useSelectedEnginePreset";
import { useBoardEngineState } from "./boardEngineState";
import { useEngineSearching } from "./engineSearching";

/** The eval sources that tell their connection — a switch each at the popup's foot (CTA-199). */
const CONNECTED_SOURCES = EVAL_SOURCES.filter((source) => source.connection !== undefined);

/**
 * **An eval source at the popup's foot** (CTA-199): its on / off switch, named
 * by its title, and its connection — the dot Settings → Engine's tab shows and
 * its words, a status region so a change is heard. The address stays in
 * Settings → Engine.
 */
function EvalSourceSwitch({ source }: { source: EvalSource }) {
  const { t } = useTranslation();
  const connection = useEvalSourceConnection(source.connection) ?? "disabled";
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1.5 }}>
      <SwitchField
        label={t(source.titleKey)}
        checked={connection !== "disabled"}
        onChange={(enabled) => source.connection?.setEnabled(enabled)}
        size="small"
        testId={`engine-menu-eval-source-${source.id}`}
      />
      <Box
        role="status"
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
        data-testid={`engine-menu-eval-source-${source.id}-status`}
      >
        <EvalSourceConnectionDot connection={connection} testId={`engine-menu-eval-source-${source.id}-dot`} />
        <Typography variant="caption" color="text.secondary">
          {t(`engineMenu.evalSource.${connection}`)}
        </Typography>
      </Box>
    </Box>
  );
}

/** The icon's breath while a search runs — its opacity, nothing that moves. */
const breathe = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

/**
 * **The top bar's Engine menu** (CTA-181) — beside the language button: a
 * robot and "Engine" (CTA-185, drawn as the language switch is: a small
 * outlined control, a divider-coloured border, the icon at 0.56 before the
 * words; under the shell's breakpoint the robot alone, as the switch drops to
 * the language's code, so the header fits 320 px) that opens the search
 * settings every board uses (lines, depth, move time, infinite analysis,
 * Threads and Hash — the `EngineSearchSettingsForm` block over
 * `lib/engineSearchSettings.ts`), under **the engine and its preset, each a
 * select** (CTA-185): the engine stored as Settings → Engine stores it
 * (`useEngineChoice`, over `describeEngines()` — the page's builds and, while
 * it answers, the engine server's), the preset selected for that engine as
 * Settings → Engine's presets section selects it (`selectEnginePreset`) —
 * an unsaved change of the preset (its depth, move time, Threads, Hash —
 * `lib/enginePresetDraft.ts`) bringing **Save and Save as new preset to the
 * title row's inline-end corner** (CTA-189; the strip with its texts until
 * then) — and at the popup's foot each eval source's on / off switch and
 * connection (CTA-199) beside an "Advanced settings" link to Settings → Engine. Until CTA-181 each board had the search
 * settings on its own Engine tab.
 *
 * **The button's colour is the board on screen's engine** (`useBoardEngineState`,
 * which the boards' sessions publish): neutral while it is off — and on a
 * screen with no board — the theme's primary while on. **Its robot breathes
 * while an engine searches anywhere** (CTA-242, `useEngineSearching`): this
 * board, a board in another tab, or an engine job running in any tab — an
 * opacity cycle timed by the theme's `transitions.duration.complex`, which
 * the theme makes 0 under `prefers-reduced-motion` — then it stays still. Its
 * name says the same ("Engine settings — engine searching", a job named:
 * "… — engine searching: Computer analysis …").
 *
 * A popover of controls, so the button is `aria-haspopup="dialog"` and the
 * popover a `dialog` named by its heading; it closes on Escape, a click
 * outside, or leaving the page (the link to Settings).
 */
export function EngineMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const state = useBoardEngineState();
  const search = useEngineSearching();
  const { engineId, setEngineId } = useEngineChoice();
  // The engine server's status, so the engine list follows it (its engines listed while it answers).
  useEngineServer();
  const descriptor = resolveEngine(engineId);
  const preset = useSelectedEnginePreset(descriptor.id);
  const { settings, setSettings } = useEngineSearchSettings();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const titleId = useId();

  // Leaving the page closes it — the link to Settings, the browser's Back. Adjusted during render (`react-hooks/set-state-in-effect`).
  const { pathname } = useLocation();
  const [shownAt, setShownAt] = useState(pathname);
  if (shownAt !== pathname) {
    setShownAt(pathname);
    if (anchor !== null) setAnchor(null);
  }

  const lit = state === "on" || state === "searching";
  const breath = theme.transitions.duration.complex * 6;
  const breathing = search.searching && breath > 0;
  const label = !search.searching
    ? t(`engineMenu.label.${state ?? "off"}`)
    : search.source === "job"
      ? t("engineMenu.label.searchingJob", { job: search.job })
      : t("engineMenu.label.searching");
  // The popover places by the page's sides, so its inline end is picked here.
  const end = theme.direction === "rtl" ? "left" : "right";

  return (
    <>
      <Button
        variant="outlined"
        color={lit ? "primary" : "inherit"}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
        onClick={(event) => setAnchor(event.currentTarget)}
        data-testid="header-engine"
        sx={{
          // The language switch's look: as tall as its small select, its border the divider's, its words the bar's.
          minHeight: 40,
          minWidth: 0,
          // Under the breakpoint as narrow as the icon button it replaced (30 px): the bar has 288 px at 320.
          px: compact ? 0.5 : 1.5,
          gap: 1,
          flexShrink: 0,
          textTransform: "none",
          fontWeight: 400,
          borderColor: "divider",
          "&:hover": { borderColor: "text.secondary" },
        }}
      >
        <Box
          component="span"
          data-testid="header-engine-icon"
          data-state={state ?? "none"}
          data-breathing={breathing}
          data-searching={search.searching ? search.source : "none"}
          sx={{
            display: "inline-flex",
            // Lit — or alone, under the breakpoint, where it is all there is to see — the robot in full; neutral beside its words, at the language switch's 0.56.
            opacity: lit || compact ? 1 : 0.56,
            // Under reduced motion the theme's durations are 0: no animation, the icon stays lit.
            animation: breathing ? `${breathe} ${breath}ms ease-in-out infinite` : "none",
          }}
        >
          <SmartToyRoundedIcon fontSize="small" />
        </Box>
        {/* Under the shell's breakpoint the robot alone — the words stay in its name. */}
        {!compact && <span>{t("engineMenu.button")}</span>}
      </Button>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: end }}
        transformOrigin={{ vertical: "top", horizontal: end }}
        dir={theme.direction}
        slotProps={{ paper: { role: "dialog", "aria-labelledby": titleId, "data-testid": "header-engine-menu" } as object }}
      >
        <Box sx={{ p: 2, width: 640, maxWidth: "calc(100vw - 32px)", display: "grid", gap: 1.5 }}>
          {/* The title, and at the row's other end the preset's unsaved changes saved (CTA-189) — only while there are any. */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Typography id={titleId} variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              {t("engineMenu.title")}
            </Typography>
            {preset.changed && (
              <EnginePresetChanges
                variant="actions"
                presetName={preset.name}
                onSave={() => void saveEnginePresetDraft()}
                onSaveAs={(name) => void saveEnginePresetDraftAsNew(name)}
                testId="engine-menu-changes"
              />
            )}
          </Box>
          <EngineSearchSettingsForm
            settings={settings}
            onChange={setSettings}
            limits={searchSettingLimitsOf(descriptor)}
            typedLimits={searchSettingTypedLimitsOf(descriptor)}
            engines={describeEngines()}
            engineId={descriptor.id}
            onEngineChange={setEngineId}
            presets={preset.presets}
            presetId={preset.id}
            onPresetChange={(presetId) => void selectEnginePreset(descriptor.id, presetId)}
            testId="engine-menu"
          />
          {/* The foot: each eval source's switch and connection (CTA-199), then the way to Settings → Engine (CTA-189). */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              pt: 1.5,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "grid", gap: 0.5 }}>
              {CONNECTED_SOURCES.map((source) => (
                <EvalSourceSwitch key={source.id} source={source} />
              ))}
            </Box>
            <Link component={RouterLink} to="/settings/engine" variant="body2" data-testid="engine-menu-settings-link">
              {t("engineMenu.advancedSettings")}
            </Link>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
