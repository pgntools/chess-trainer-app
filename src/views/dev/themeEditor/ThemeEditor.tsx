import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import type { Theme } from "@mui/material/styles";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { InlineAlert } from "../../../design-system/components/feedback";
import { FileInputButton, SelectField, SettingsSection, TextInputField } from "../../../design-system/components/forms";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { buildTheme } from "../../../design-system/theme";
import {
  contrastReport,
  exportNameOf,
  hasHandOverrides,
  isValidThemeId,
  themeById,
  themeFileNameOf,
  themes,
  themeSource,
  type ContrastCheck,
  type ThemeDefinition,
} from "../../../design-system/themes";
import { downloadTextFile } from "../../../lib/pgnExport";
import { ContrastSummary, ContrastTable } from "./ContrastReport";
import { decodeDraft, draftOf, encodeDraft, themeDataOf, tokenAt, withId, withToken, type ThemeDraft } from "./draft";
import SaveDialog from "./SaveDialog";
import { fieldIdOf, FIELDS, SECTIONS, sectionOfToken, type SectionSpec } from "./sections";
import ThemePreview from "./ThemePreview";
import TokenField from "./TokenField";
import { useUnsavedWorkGuard } from "../../main/unsavedWork";

type ThemeEditorProps = {
  /** The registered theme it opens on. */
  initialThemeId: string;
  /** A registered theme's English and Hebrew names — the catalogs' words. */
  namesOf: (definition: ThemeDefinition) => { name: string; nameHe: string };
};

/** One step the reader can undo: the draft before it, and the token it changed (typing into one field is one step). */
type Step = { draft: ThemeDraft; path: string };

const HISTORY_LIMIT = 200;
const PANEL_ID = "theme-editor-section";

/** The theme's file comment, as the editor writes it. */
const commentOf = (draft: ThemeDraft) => {
  const file = themeFileNameOf(draft.theme.id);
  return [
    `**${draft.name || draft.theme.id}** — made in the theme editor (\`/dev/theme-editor\`), starting from the "${draft.from}" theme.`,
    "",
    `To change it, open \`/dev/theme-editor?theme=${draft.theme.id}\` in \`yarn dev\`, tune the tokens against the live`,
    `preview and the contrast report, download \`${file}\` and replace this file with it; then run the contrast test`,
    "(`npx vitest run src/design-system/themes/contrast.test.ts`) and `yarn test:run` (CONTRIBUTING.md).",
  ].join("\n");
};

/** The two schemes as MUI builds them — what an optional colour shows while the theme leaves it to MUI. */
const builtSchemes = (theme: ThemeDefinition): Record<"light" | "dark", Theme> | undefined => {
  try {
    return { light: buildTheme(theme, "light", "ltr"), dark: buildTheme(theme, "dark", "ltr") };
  } catch {
    return undefined;
  }
};

/** What MUI draws for a palette token the theme leaves out (`light.success.main`, `dark.text.disabled`). */
const fallbackOf = (built: Record<"light" | "dark", Theme> | undefined, path: string): string | undefined => {
  const [scheme, ...rest] = path.split(".");
  if (built === undefined || (scheme !== "light" && scheme !== "dark")) return undefined;
  const value = rest.reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], built[scheme].palette);
  return typeof value === "string" ? value : undefined;
};

/**
 * **The theme editor** (CTA-115, `/dev/theme-editor`, dev-only) — every
 * token of a theme, edited visually: the sections down the left (vertical
 * tabs, each badged while it has a contrast failure), the section's fields
 * in the middle, a live preview on the right, and the contrast report always
 * in view. It opens any registered theme or a draft file, and saves by
 * download only — the theme's source file, from the same generator as
 * `yarn theme:bootstrap`, or a draft file. Nothing is written anywhere: the
 * draft lives in memory, and leaving with unsaved changes asks first.
 *
 * Its words are English and not in the catalogs, like the gallery's: it
 * never ships.
 */
function ThemeEditor({ initialThemeId, namesOf }: ThemeEditorProps) {
  const opened = (definition: ThemeDefinition) => {
    const { name, nameHe } = namesOf(definition);
    return draftOf(definition, name, nameHe);
  };
  const [initial] = useState(() => opened(themeById(initialThemeId)));
  const [draft, setDraft] = useState(initial);
  const [start, setStart] = useState(initial);
  const [history, setHistory] = useState<Step[]>([]);
  const [saved, setSaved] = useState(() => encodeDraft(initial));
  const [handOverrides, setHandOverrides] = useState(() => hasHandOverrides(themeById(initialThemeId)));
  const [sectionId, setSectionId] = useState(SECTIONS[0].id);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();

  const section = SECTIONS.find((candidate) => candidate.id === sectionId) ?? SECTIONS[0];
  const dirty = encodeDraft(draft) !== saved;
  const idValid = isValidThemeId(draft.theme.id);
  const registered = themes.some((theme) => theme.id === draft.theme.id);

  const report = useMemo(() => {
    try {
      return contrastReport(draft.theme);
    } catch {
      return [];
    }
  }, [draft.theme]);
  const built = useMemo(() => builtSchemes(draft.theme), [draft.theme]);
  const source = useMemo(
    () => (idValid ? themeSource(draft.theme, { exportName: exportNameOf(draft.theme.id), comment: commentOf(draft) }) : ""),
    [draft, idValid],
  );

  // Leaving with unsaved changes asks first — the draft lives nowhere else.
  useUnsavedWorkGuard(dirty);

  /** A new draft, undoable — a run of changes to one token is one step. */
  const change = (next: ThemeDraft, path: string) => {
    if (next === draft) return;
    setHistory((before) => (before.at(-1)?.path === path && path !== "" ? before : [...before.slice(-HISTORY_LIMIT + 1), { draft, path }]));
    setDraft(next);
    setNotice(undefined);
  };
  const setToken = (path: string, value: unknown) => {
    const theme = withToken(draft.theme, path, value);
    if (theme !== draft.theme) change({ ...draft, theme }, path);
  };
  const undo = () => {
    const last = history.at(-1);
    if (last === undefined) return;
    setHistory(history.slice(0, -1));
    setDraft(last.draft);
  };
  /** A whole draft opened — a registered theme or a file — as the new start, undoably. */
  const open = (next: ThemeDraft, overrides: boolean, what: string) => {
    change(next, "");
    setStart(next);
    setSaved(encodeDraft(next));
    setHandOverrides(overrides);
    setProblem(undefined);
    setNotice(`${what} is open. Undo brings back what was open before.`);
  };
  const openTheme = (id: string) => {
    const definition = themeById(id);
    open(opened(definition), hasHandOverrides(definition), `The "${id}" theme`);
  };
  const importDraft = async (files: File[]) => {
    const decoded = decodeDraft(await files[0].text());
    if ("problem" in decoded) setProblem(`${files[0].name}: ${decoded.problem}`);
    else open(decoded.draft, false, `The draft "${files[0].name}"`);
  };
  const startFrom = (id: string) => {
    const from = themeById(id);
    change({ ...draft, from: id, theme: { ...themeDataOf(from), id: draft.theme.id, labelKey: draft.theme.labelKey } }, "from");
  };
  const resetSection = (spec: SectionSpec) => {
    if (spec.id === "theme") {
      change({ ...withId(draft, start.theme.id), name: start.name, nameHe: start.nameHe, from: start.from }, "reset");
      return;
    }
    const paths = FIELDS.filter((field) => field.section === spec.id).map((field) => field.path);
    // A toggled knob's own fields follow it, so reset the knob before them.
    const theme = paths.reduce((next, path) => withToken(next, path, tokenAt(start.theme, path)), draft.theme);
    change({ ...draft, theme }, "reset");
  };
  const jump = (check: ContrastCheck) => {
    const target = sectionOfToken(check.token);
    if (target === undefined) return;
    // Its section on screen first, then the token's field takes the focus.
    flushSync(() => setSectionId(target));
    const field = document.getElementById(fieldIdOf(check.token));
    field?.focus();
    field?.scrollIntoView?.({ block: "center" });
  };
  const openSection = (id: string) => {
    setSectionId(id);
    const scheme = SECTIONS.find((candidate) => candidate.id === id)?.scheme;
    if (scheme !== undefined) setMode(scheme);
  };
  const markSaved = () => {
    setSaved(encodeDraft(draft));
    setNotice(undefined);
  };
  const download = () => {
    if (downloadTextFile(themeFileNameOf(draft.theme.id), source, "text/typescript")) markSaved();
    else setProblem("The browser refused the download — copy the source instead.");
  };
  const exportDraft = () => {
    if (downloadTextFile(`${draft.theme.id || "theme"}.theme-draft.json`, encodeDraft(draft), "application/json")) markSaved();
    else setProblem("The browser refused the download.");
  };

  const failuresIn = (id: string) => report.filter((check) => !check.pass && sectionOfToken(check.token) === id);
  const tabs = SECTIONS.map((spec) => {
    const failures = failuresIn(spec.id);
    const required = failures.some((check) => check.level === "required");
    return {
      id: spec.id,
      label: (
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          <span>
            {spec.title}
            {failures.length > 0 && (
              <Box component="span" sx={visuallyHidden}>
                {`, ${failures.length} contrast ${failures.length === 1 ? "failure" : "failures"}`}
              </Box>
            )}
          </span>
          {failures.length > 0 && (
            <Box
              component="span"
              aria-hidden="true"
              data-testid={`theme-editor-badge-${spec.id}`}
              sx={{
                minWidth: 20,
                height: 20,
                px: 0.5,
                borderRadius: 10,
                display: "inline-grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 700,
                bgcolor: required ? "error.main" : "warning.main",
                color: required ? "error.contrastText" : "warning.contrastText",
              }}
            >
              {failures.length}
            </Box>
          )}
        </Box>
      ),
    };
  });

  const fieldsOf = (spec: SectionSpec) =>
    spec.groups
      .filter((group) => group.when === undefined || (tokenAt(draft.theme, group.when) ?? null) !== null)
      .map((group) => (
        <SettingsSection key={group.title} title={group.title} description={group.description} testId={`theme-editor-group-${spec.id}-${group.title.replace(/\W+/g, "-").toLowerCase()}`}>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" } }}>
            {group.fields.map((field) => (
              <TokenField
                key={field.path}
                field={field}
                value={tokenAt(draft.theme, field.path)}
                fallback={fallbackOf(built, field.path)}
                checks={report.filter((check) => check.token === field.path)}
                onChange={setToken}
              />
            ))}
          </Box>
        </SettingsSection>
      ));

  return (
    <Box data-testid="theme-editor" sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
        <Box sx={{ flexGrow: 1, minWidth: 200 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            Theme editor
          </Typography>
          <Typography variant="body2" color="text.secondary" data-testid="theme-editor-editing">
            {`Editing ${draft.name || draft.theme.id} (${draft.theme.id})${dirty ? " — unsaved changes" : ""}`}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 200 }}>
          <SelectField
            label="Open a registered theme"
            value=""
            emptyOption="Choose a theme…"
            onChange={(id) => id !== "" && openTheme(id)}
            options={themes.map((theme) => ({ value: theme.id, label: `${namesOf(theme).name} (${theme.id})` }))}
            testId="theme-editor-open"
          />
        </Box>
        <FileInputButton
          label="Import draft (JSON)"
          accept=".json"
          onFiles={(files) => void importDraft(files)}
          variant="outlined"
          size="small"
          startIcon={<UploadFileRoundedIcon />}
          testId="theme-editor-import"
        />
        <Button size="small" startIcon={<UndoRoundedIcon />} onClick={undo} disabled={history.length === 0} data-testid="theme-editor-undo">
          Undo
        </Button>
        <Button size="small" startIcon={<RestartAltRoundedIcon />} onClick={() => change(start, "reset")} disabled={draft === start} data-testid="theme-editor-reset">
          Reset theme
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<SaveRoundedIcon />}
          onClick={() => setSaving(true)}
          disabled={!idValid}
          data-testid="theme-editor-save-open"
        >
          Save…
        </Button>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, flexShrink: 0 }}>
        <ContrastSummary checks={report} onJump={jump} />
        {notice !== undefined && (
          <Typography variant="body2" color="text.secondary" role="status" data-testid="theme-editor-notice">
            {notice}
          </Typography>
        )}
      </Box>
      {problem !== undefined && (
        <InlineAlert severity="error" onClose={() => setProblem(undefined)} testId="theme-editor-problem">
          {problem}
        </InlineAlert>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "200px minmax(0, 1fr)", lg: "200px minmax(0, 1fr) minmax(360px, 1fr)" },
          gridTemplateRows: { xs: "auto", lg: "minmax(0, 1fr)" },
          overflowY: { xs: "auto", lg: "hidden" },
        }}
      >
        <Box sx={{ overflowY: { lg: "auto" } }}>
          <PanelTabs
            tabs={tabs}
            value={section.id}
            onChange={openSection}
            orientation="vertical"
            ariaLabel="Sections"
            idPrefix={PANEL_ID}
            testId="theme-editor-sections"
          />
        </Box>

        <Box {...tabPanelProps(PANEL_ID, section.id)} data-testid={`theme-editor-panel-${section.id}`} sx={{ minWidth: 0, overflowY: { lg: "auto" }, display: "grid", gap: 3, alignContent: "start", paddingInlineEnd: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
              {section.title}
            </Typography>
            <Button size="small" onClick={() => resetSection(section)} data-testid="theme-editor-reset-section">
              Reset section
            </Button>
          </Box>

          {section.id === "theme" ? (
            <SettingsSection title="Identity" description="Its id names its file, its export and its catalog key; the names go in the catalogs." testId="theme-editor-group-theme-identity">
              <Box sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
                <TextInputField
                  label="Id"
                  value={draft.theme.id}
                  onChange={(id) => change(withId(draft, id), "id")}
                  error={!idValid}
                  helperText={
                    idValid
                      ? registered
                        ? `The registered "${draft.theme.id}" theme — the download replaces ${themeFileNameOf(draft.theme.id)}.`
                        : `A new theme — ${themeFileNameOf(draft.theme.id)}, exported as ${exportNameOf(draft.theme.id)}.`
                      : "Lower-case letters and digits, words joined by single dashes, starting with a letter (ocean, deep-sea)."
                  }
                  dir="ltr"
                  testId="theme-editor-id"
                />
                <TextInputField label="Name (English)" value={draft.name} onChange={(name) => change({ ...draft, name }, "name")} dir="auto" testId="theme-editor-name" />
                <TextInputField
                  label="Name (Hebrew)"
                  value={draft.nameHe}
                  onChange={(nameHe) => change({ ...draft, nameHe }, "nameHe")}
                  helperText="Empty: the English name, marked for translation."
                  dir="auto"
                  testId="theme-editor-name-he"
                />
                <SelectField
                  label="Starts from"
                  value={draft.from}
                  onChange={startFrom}
                  options={themes.map((theme) => ({ value: theme.id, label: `${namesOf(theme).name} (${theme.id})` }))}
                  helperText="Picking another copies all of its tokens over this draft's — Undo takes it back."
                  testId="theme-editor-from"
                />
              </Box>
            </SettingsSection>
          ) : (
            fieldsOf(section)
          )}

          {section.id === "accessibility" && (
            <SettingsSection
              title="The contrast report"
              description="Every check — the required ones are what the contrast test holds a registered theme to. A row goes to its token."
              testId="theme-editor-group-accessibility-report"
            >
              <ContrastTable checks={report} onJump={jump} />
            </SettingsSection>
          )}
        </Box>

        <Box sx={{ gridColumn: { md: "2", lg: "3" }, minHeight: { xs: 480, lg: 0 } }}>
          <ThemePreview theme={draft.theme} kind={section.preview} mode={mode} onModeChange={setMode} direction={direction} onDirectionChange={setDirection} />
        </Box>
      </Box>

      <SaveDialog
        open={saving}
        onClose={() => setSaving(false)}
        fileName={idValid ? themeFileNameOf(draft.theme.id) : ""}
        source={source}
        id={draft.theme.id}
        name={draft.name}
        nameHe={draft.nameHe}
        registered={registered}
        handOverrides={handOverrides}
        onDownload={download}
        onExportDraft={exportDraft}
      />
    </Box>
  );
}

export default ThemeEditor;
