# Tabs — `src/design-system/components/tabs/`

Tab strips (CTA-108), from [Shared.md → Tabs](../Shared.md#tabs). Import from
`components/tabs`.

Gallery: `/dev/design/tabs`.

## PanelTabs

- **Purpose** — the board panel's strip: words as written (`textTransform:
  none`), no minimum tab width, `px: 1`, a divider under it.
- **Props** — `tabs: { id, label, disabled?, link? }[]`, `value: string |
  false`, `onChange?(id)`, `size?: "compact" | "tall"` (36 / 48 px),
  `fullWidth?` (default true; false sizes each tab to its words and scrolls),
  `ariaLabel`, `idPrefix?` (CTA-112: each tab takes the id
  `<idPrefix>-tab-<id>` and the selected one `aria-controls` its panel; the
  host spreads `tabPanelProps(idPrefix, id)` — `role="tabpanel"`, its id,
  `aria-labelledby` its tab — on the panel it renders, so a screen reader
  names the panel by its tab; absent, the tabs carry no ids), `testId` (each
  tab `<testId>-tab-<id>`, `BoardPanel`'s own ids).
- **Variations** — compact full width (the board panel); each tab naming its
  panel (`idPrefix`); a disabled tab; tall (a dialog's strip); link tabs sized
  to their words (a routed strip).
- **Replaces** — the strip `sx` copied into `BoardPanel`, `NewGameForm` and
  `PositionEditor`, `SettingsScreen`'s near-copy with router-link tabs, and
  `NagDialog`'s taller strip.
