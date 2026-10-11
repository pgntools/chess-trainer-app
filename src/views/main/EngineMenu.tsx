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
import { selectEnginePreset } from "../../lib/enginePresetStore";
import { searchSettingLimitsOf } from "../../lib/engineSearchSettings";
import { describeEngines, resolveEngine } from "../../lib/engines";
import { useEngineChoice } from "../shared/useEngineChoice";
import { useEngineSearchSettings } from "../shared/useEngineSearchSettings";
import { useEngineServer } from "../shared/useEngineServer";
import { useSelectedEnginePreset } from "../shared/useSelectedEnginePreset";
import { useBoardEngineState } from "./boardEngineState";

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
 * and a "Settings" link to Settings → Engine at the title row's other end. Until CTA-181 each board had the search
 * settings on its own Engine tab.
 *
 * **The button is the board on screen's engine** (`useBoardEngineState`,
 * which the boards' sessions publish): neutral while it is off — and on a
 * screen with no board — the theme's primary while on, and its robot
 * **breathing** while a search runs: an opacity cycle timed by the theme's
 * `transitions.duration.complex`, which the theme makes 0 under
 * `prefers-reduced-motion` — then it stays still. Its name says the same
 * ("Engine settings — engine searching").
 *
 * A popover of controls, so the button is `aria-haspopup="dialog"` and the
 * popover a `dialog` named by its heading; it closes on Escape, a click
 * outside, or leaving the page (the link to Settings).
 */
export function EngineMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const state = useBoardEngineState();
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

  const searching = state === "searching";
  const lit = state === "on" || searching;
  const breath = theme.transitions.duration.complex * 6;
  const breathing = searching && breath > 0;
  // The popover places by the page's sides, so its inline end is picked here.
  const end = theme.direction === "rtl" ? "left" : "right";

  return (
    <>
      <Button
        variant="outlined"
        color={lit ? "primary" : "inherit"}
        aria-label={t(`engineMenu.label.${state ?? "off"}`)}
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
          {/* The title, and at the row's other end the way to Settings → Engine (CTA-185). */}
          <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2 }}>
            <Typography id={titleId} variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              {t("engineMenu.title")}
            </Typography>
            <Link component={RouterLink} to="/settings/engine" variant="body2" data-testid="engine-menu-settings-link">
              {t("engineMenu.settingsLink")}
            </Link>
          </Box>
          <EngineSearchSettingsForm
            settings={settings}
            onChange={setSettings}
            limits={searchSettingLimitsOf(descriptor)}
            engines={describeEngines()}
            engineId={descriptor.id}
            onEngineChange={setEngineId}
            presets={preset.presets}
            presetId={preset.id}
            onPresetChange={(presetId) => void selectEnginePreset(descriptor.id, presetId)}
            testId="engine-menu"
          />
        </Box>
      </Popover>
    </>
  );
}
