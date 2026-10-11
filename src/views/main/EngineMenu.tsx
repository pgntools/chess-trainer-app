import { useId, useState } from "react";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { keyframes, useTheme } from "@mui/material/styles";
import MemoryRoundedIcon from "@mui/icons-material/MemoryRounded";
import { Link as RouterLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";

import { EngineSearchSettingsForm } from "../../blocks/forms";
import { IconAction } from "../../design-system/components/toolbars";
import { searchSettingLimitsOf } from "../../lib/engineSearchSettings";
import { resolveEngine } from "../../lib/engines";
import { useEngineChoice } from "../shared/useEngineChoice";
import { useEngineSearchSettings } from "../shared/useEngineSearchSettings";
import { useSelectedEnginePreset } from "../shared/useSelectedEnginePreset";
import { useBoardEngineState } from "./boardEngineState";

/** The icon's breath while a search runs — its opacity, nothing that moves. */
const breathe = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

/**
 * **The top bar's Engine menu** (CTA-181) — beside the language button: an
 * icon that opens the search settings every board uses (lines, depth, move
 * time, infinite analysis, Threads and Hash — the `EngineSearchSettingsForm`
 * block over `lib/engineSearchSettings.ts`), under the engine running and the
 * preset it runs, with a link to Settings → Engine to change either. Until
 * CTA-181 each board had these on its own Engine tab.
 *
 * **The icon is the board on screen's engine** (`useBoardEngineState`, which
 * the boards' sessions publish): neutral while it is off — and on a screen
 * with no board — the theme's primary while on, and **breathing** while a
 * search runs: an opacity cycle timed by the theme's
 * `transitions.duration.complex`, which the theme makes 0 under
 * `prefers-reduced-motion` — then it stays still. Its name says the same
 * ("Engine settings — engine searching").
 *
 * A popover of controls, so the button is `aria-haspopup="dialog"` and the
 * popover a `dialog` named by its heading; it closes on Escape, a click
 * outside, or leaving the page (the link to Settings).
 */
export function EngineMenu() {
  const { t } = useTranslation();
  const theme = useTheme();
  const state = useBoardEngineState();
  const { engineId } = useEngineChoice();
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
      <IconAction
        label={t(`engineMenu.label.${state ?? "off"}`)}
        onClick={(event) => setAnchor(event.currentTarget)}
        popupOpen={anchor !== null}
        popupKind="dialog"
        color={lit ? "primary" : undefined}
        testId="header-engine"
      >
        <Box
          component="span"
          data-testid="header-engine-icon"
          data-state={state ?? "none"}
          data-breathing={breathing}
          sx={{
            display: "inline-flex",
            // Under reduced motion the theme's durations are 0: no animation, the icon stays lit.
            animation: breathing ? `${breathe} ${breath}ms ease-in-out infinite` : "none",
          }}
        >
          <MemoryRoundedIcon fontSize="small" />
        </Box>
      </IconAction>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: end }}
        transformOrigin={{ vertical: "top", horizontal: end }}
        dir={theme.direction}
        slotProps={{ paper: { role: "dialog", "aria-labelledby": titleId, "data-testid": "header-engine-menu" } as object }}
      >
        <Box sx={{ p: 2, width: 320, maxWidth: "calc(100vw - 32px)", display: "grid", gap: 1.5 }}>
          <Typography id={titleId} variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            {t("engineMenu.title")}
          </Typography>
          <EngineSearchSettingsForm
            settings={settings}
            onChange={setSettings}
            limits={searchSettingLimitsOf(descriptor)}
            engine={{ name: descriptor.name, version: descriptor.version }}
            presetName={preset.name}
            settingsLink={{ component: RouterLink, to: "/settings/engine" }}
            testId="engine-menu"
          />
        </Box>
      </Popover>
    </>
  );
}
