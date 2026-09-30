import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

/*
  The MUI lock (CTA-116): a screen (`src/views/`) or a block (`src/blocks/`)
  builds from the design system, not from the MUI atoms the design system
  wraps — its own dialog stack, table, tabs, tooltip. `yarn lint` fails an
  import of one, with a message naming what to use instead. The rule is
  `MUI_LOCK` in `eslint.config.js`; this file holds it to its promises,
  linted through the project's own config exactly as `yarn lint` does. The
  blocks' case (which also keeps the presentational rules, in the one entry
  that replaces this one) is `src/blocks/boundary.test.ts`.
*/

const lint = async (code: string, filePath = "src/views/probe/Probe.tsx") => {
  const [result] = await new ESLint().lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === "no-restricted-imports");
};

/** Each locked atom, and the words of the replacement its message must name. */
const LOCKED: readonly (readonly [atom: string, use: string])[] = [
  ["Dialog", "BaseDialog"],
  ["DialogTitle", "BaseDialog"],
  ["DialogContent", "BaseDialog"],
  ["DialogActions", "BaseDialog"],
  ["Table", "DataTable"],
  ["TableHead", "DataTable"],
  ["TableBody", "DataTable"],
  ["TableRow", "DataTable"],
  ["TableCell", "DataTable"],
  ["TableContainer", "DataTable"],
  ["TableFooter", "DataTable"],
  ["TableSortLabel", "DataTable"],
  ["TablePagination", "DataTable"],
  ["Tabs", "PanelTabs"],
  ["Tab", "PanelTabs"],
  ["Switch", "SwitchField"],
  ["Snackbar", "useSnackbar"],
  ["SnackbarContent", "useSnackbar"],
  ["Alert", "InlineAlert"],
  ["AlertTitle", "InlineAlert"],
  ["Tooltip", "HintButton"],
  ["ToggleButtonGroup", "SideToggle"],
  ["ToggleButton", "SideToggle"],
  ["Breadcrumbs", "Breadcrumbs"],
  ["Menu", "AnchoredMenu"],
  ["MenuItem", "AnchoredMenu"],
  ["Pagination", "TablePager"],
  ["Slider", "SliderField"],
  ["Autocomplete", "SelectAutocomplete"],
];

describe("the MUI lock on screens", () => {
  it.each(LOCKED)("rejects %s from its own module, naming %s", async (atom, use) => {
    const messages = await lint(`import ${atom} from "@mui/material/${atom}";\nexport const used = ${atom};`);
    expect(messages.map((message) => message.line)).toEqual([1]);
    expect(messages[0].message).toContain(use);
    expect(messages[0].message).toContain("docs/design/hierarchy.md");
  });

  it("rejects the locked atoms from the barrel too, each named", async () => {
    const messages = await lint(
      ['import { Box, Dialog, Tooltip, Typography } from "@mui/material";', "export const used = [Box, Dialog, Tooltip, Typography];"].join("\n"),
    );
    // One report for each locked name, none for Box or Typography.
    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message.message).join("\n")).toMatch(/Dialog[\s\S]*BaseDialog[\s\S]*HintButton/);
  });

  it("points the tooltip at the two components that wrap it", async () => {
    const [message] = await lint('import Tooltip from "@mui/material/Tooltip";\nexport const used = Tooltip;');
    expect(message.message).toContain("IconAction");
    expect(message.message).toContain("HintButton");
  });

  it("allows the atoms the design system does not wrap, and the design system itself", async () => {
    const messages = await lint(
      [
        'import Box from "@mui/material/Box";',
        'import Button from "@mui/material/Button";',
        'import Typography from "@mui/material/Typography";',
        'import DialogContentText from "@mui/material/DialogContentText";',
        'import CloseIcon from "@mui/icons-material/CloseRounded";',
        'import { ConfirmDialog } from "../../design-system/components/dialogs";',
        "export const used = [Box, Button, Typography, DialogContentText, CloseIcon, ConfirmDialog];",
      ].join("\n"),
    );
    expect(messages).toEqual([]);
  });

  it("does not reach the design system, which wraps the atoms", async () => {
    for (const path of [
      "src/design-system/components/dialogs/Probe.tsx",
      "src/design-system/patterns/tables/Probe.tsx",
    ]) {
      const messages = await lint('import Dialog from "@mui/material/Dialog";\nexport const used = Dialog;', path);
      expect(messages, path).toEqual([]);
    }
  });

  it("lets a deliberate exception through, on its own line with its reason", async () => {
    const messages = await lint(
      [
        "// eslint-disable-next-line no-restricted-imports -- migration.md §4.4: two thumbs on one span",
        'import Slider from "@mui/material/Slider";',
        'import Switch from "@mui/material/Switch";',
        "export const used = [Slider, Switch];",
      ].join("\n"),
    );
    // The disable covers the next line only.
    expect(messages.map((message) => message.line)).toEqual([3]);
  });
});

/*
  The exceptions are counted (docs/design/migration.md §4.4, "The MUI lock's
  exceptions"): this is that list. Adding a disable means adding it there and
  here — with the reason on the line itself.
*/
const EXCEPTIONS: Record<string, number> = {
  "src/blocks/dialogs/CollectionImportDialog/CollectionImportDialog.tsx": 1, // Slider — the Elo range
  "src/blocks/forms/CollectionFilters/CollectionFilters.tsx": 1, // Autocomplete — the opening box
  "src/blocks/forms/MaskEditor/MaskEditor.tsx": 2, // ToggleButtonGroup + ToggleButton — the presets
  "src/views/explorer/NagDialog.tsx": 1, // ToggleButton — the glyph toggles
};

// Vitest runs from the repository root (as `ESLint()` above finds its config from it).
const root = `${process.cwd()}/`;

/** Every source file of `src/views/` and `src/blocks/` that is not a test. */
const sources = ["src/views", "src/blocks"].flatMap((dir) =>
  (readdirSync(`${root}${dir}`, { recursive: true }) as string[])
    .filter((path) => /\.(ts|tsx)$/.test(path) && !/\.test\.tsx?$/.test(path))
    .map((path) => `${dir}/${path}`),
);

describe("the MUI lock's exceptions", () => {
  const disables = sources.flatMap((path) =>
    readFileSync(`${root}${path}`, "utf8")
      .split("\n")
      .filter((line) => line.includes("eslint-disable") && line.includes("no-restricted-imports"))
      .map((line) => ({ path, line })),
  );

  it("are the ones migration.md lists — no others, none fewer", () => {
    const counted: Record<string, number> = {};
    for (const { path } of disables) counted[path] = (counted[path] ?? 0) + 1;
    expect(counted).toEqual(EXCEPTIONS);
  });

  it("each carry their reason on the line", () => {
    expect(disables.length).toBeGreaterThan(0);
    for (const { path, line } of disables) {
      expect(line, path).toMatch(/eslint-disable-next-line no-restricted-imports -- migration\.md §4\.4: \S.{15,}/);
    }
  });
});
