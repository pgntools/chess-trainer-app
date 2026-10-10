import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import { useTranslation } from "react-i18next";

import { ConfirmDialog, FormDialog } from "../../../design-system/components/dialogs";
import { StatusText } from "../../../design-system/components/feedback";
import { SelectField, SwitchField, TextInputField } from "../../../design-system/components/forms";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { IconAction } from "../../../design-system/components/toolbars";
import {
  MAX_PRESET_NAME_LENGTH,
  OPTION_TABS,
  type OptionTab,
  presetNameOf,
  type EnginePresetRow,
  type PresetRowNote,
} from "../../../lib/enginePresets";
import type { UciOptionValue } from "../../../lib/engineTypes";

/** One preset of the library, as the picker lists it. */
export type EnginePresetChoice = {
  id: string;
  /** Its name, in the reader's language where it is the Default's own. */
  name: string;
  /** False for Default — it always exists. */
  deletable: boolean;
};

export type EnginePresetFormProps = {
  /** The engine whose options these are — the reader's choice. */
  engineName: string;
  /** Every preset of the library, Default first. */
  presets: readonly EnginePresetChoice[];
  /** The preset this engine runs. */
  selectedId: string;
  /** Run another preset on this engine — the others keep theirs. */
  onSelect: (presetId: string) => void;
  onCreate: (name: string) => void;
  onRename: (presetId: string, name: string) => void;
  /** A copy of `presetId` under `name`. */
  onDuplicate: (presetId: string, name: string) => void;
  onDelete: (presetId: string) => void;
  /**
   * The engine's options with the preset's values (`enginePresetRows`) —
   * `undefined` while the engine has not said what it declares.
   */
  rows: readonly EnginePresetRow[] | undefined;
  /** Set one option of the selected preset — `undefined` puts it back to the engine's default. */
  onChange: (name: string, value: UciOptionValue | undefined) => void;
  /**
   * The selected preset's option groups that are on (`OPTION_GROUPS` —
   * Syzygy): each a switch, off by default, its options shown only while on.
   */
  groups: Readonly<Record<string, boolean>>;
  /** Turn a group on or off in the selected preset. */
  onGroupChange: (group: string, on: boolean) => void;
  /**
   * The prefix of its ids: the picker `<testId>-preset`, its actions
   * `-new`, `-rename`, `-duplicate`, `-delete`; the list `<testId>-options`,
   * each option `<testId>-option-<slug>` (its control `-input`, its note
   * `-note`, its reset `-reset`), a group `<testId>-group-<id>` (its switch
   * `-switch`, its options `-options`); the name dialog `<testId>-name`, the delete
   * confirmation `<testId>-confirm-delete`.
   */
  testId: string;
};

/** An option's name as an id: lower case, every run of other characters one dash. */
const slugOf = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A value as the form writes it — a check's words, a number, words. */
const textOf = (value: UciOptionValue | undefined): string => (value === undefined ? "" : String(value));

/** The list's items: an option, or a group's switch over its options — placed where its first option is. */
type ListItem = { kind: "row"; row: EnginePresetRow } | { kind: "group"; id: string; rows: EnginePresetRow[] };

const itemsOf = (rows: readonly EnginePresetRow[]): ListItem[] => {
  const items: ListItem[] = [];
  const groups = new Map<string, EnginePresetRow[]>();
  for (const row of rows) {
    if (row.group === undefined) {
      items.push({ kind: "row", row });
      continue;
    }
    const members = groups.get(row.group);
    if (members !== undefined) {
      members.push(row);
      continue;
    }
    const fresh = [row];
    groups.set(row.group, fresh);
    items.push({ kind: "group", id: row.group, rows: fresh });
  }
  return items;
};

/** The name dialog's purpose: a new preset, a new name, a copy. */
type NameDialog = { purpose: "create" | "rename" | "duplicate"; name: string } | null;

/**
 * **A field's own text over a value that is written as it is typed.** Each
 * keystroke leaves (`commit`), and the value comes back a moment later — by
 * then the reader may have typed on, so a value that is one of the field's
 * own commits coming back never replaces the text. Any other new value (a
 * reset, another tab, another preset) does.
 */
function useDraft<T>(value: T, textOf: (value: T) => string) {
  const [draft, setDraft] = useState(() => textOf(value));
  const [seen, setSeen] = useState(value);
  const [sent, setSent] = useState<readonly T[]>([]);
  if (value !== seen) {
    setSeen(value);
    const echo = sent.indexOf(value);
    if (echo >= 0) {
      setSent(sent.slice(echo + 1));
    } else {
      setSent([]);
      setDraft(textOf(value));
    }
  }
  return { draft, setDraft, commit: (next: T) => setSent((was) => [...was, next]) };
}

/**
 * A spin as a number field: the typed text is the field's own, and a whole
 * number in the range is what leaves; anything else is marked invalid and
 * kept back. A new value from outside (a reset) replaces the text.
 */
function SpinInput({
  label,
  value,
  range,
  help,
  disabled,
  onCommit,
  testId,
}: {
  label: string;
  value: number | undefined;
  range: { min: number; max: number } | undefined;
  help: string;
  disabled: boolean;
  onCommit: (value: number) => void;
  testId: string;
}) {
  const { t } = useTranslation();
  const { draft, setDraft, commit } = useDraft(value, textOf);
  const parse = (text: string): number | undefined => {
    const number = Number(text);
    return text.trim() !== "" && Number.isInteger(number) && (range === undefined || (number >= range.min && number <= range.max))
      ? number
      : undefined;
  };
  const invalid = parse(draft) === undefined;
  return (
    <TextInputField
      label={label}
      value={draft}
      type="number"
      dir="ltr"
      disabled={disabled}
      onChange={(text) => {
        setDraft(text);
        const number = parse(text);
        if (number !== undefined && number !== value) {
          commit(number);
          onCommit(number);
        }
      }}
      error={invalid}
      helperText={
        invalid && range !== undefined ? t("enginePresets.spinInvalid", { min: range.min, max: range.max }) : help
      }
      testId={testId}
    />
  );
}

/** Words — a `string` option: each change leaves at once; a line break cannot be typed in one line. */
function WordsInput({
  label,
  value,
  help,
  disabled,
  onCommit,
  testId,
}: {
  label: string;
  value: string;
  help: string;
  disabled: boolean;
  onCommit: (value: string) => void;
  testId: string;
}) {
  const { draft, setDraft, commit } = useDraft(value, (words) => words);
  return (
    <TextInputField
      label={label}
      value={draft}
      dir="ltr"
      disabled={disabled}
      onChange={(text) => {
        setDraft(text);
        commit(text);
        onCommit(text);
      }}
      helperText={help}
      testId={testId}
    />
  );
}

/**
 * **An engine's options, kept in named presets** (CTA-179) — Settings →
 * Engine's form. Above, the library: the preset this engine runs, picked
 * from every preset (each engine has its own), and New, Rename, Duplicate
 * and Delete (Default cannot be deleted). Below, **every option the engine
 * declares** in its UCI type — a spin a number in its range, a check a
 * switch, a combo a select, a string words — with its type, default and
 * range, and a reset where the preset sets it. The boards' own options
 * (Threads, Hash, MultiPV) are shown read-only, and every limit says why
 * beside the option: a file path a browser build cannot take, Hash's ceiling
 * there, a pinned or an absent option, the Play boards' own strength.
 *
 * Presentational: the presets, the rows (`lib/enginePresets.ts`'
 * `enginePresetRows`) and every change are props; the dialogs are its own.
 */
function EnginePresetForm({
  engineName,
  presets,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  rows,
  onChange,
  groups,
  onGroupChange,
  testId,
}: EnginePresetFormProps) {
  const { t } = useTranslation();
  const [nameDialog, setNameDialog] = useState<NameDialog>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // The options' tab — the form's own: basic first, and only the tabs this engine has options on.
  const [tab, setTab] = useState<OptionTab>("basic");
  const tabs = OPTION_TABS.filter((each) => rows?.some((row) => row.tab === each));
  const shownTab = tabs.includes(tab) ? tab : (tabs[0] ?? "basic");
  const selected = presets.find((preset) => preset.id === selectedId) ?? presets[0];
  const name = presetNameOf(nameDialog?.name ?? "");

  const submitName = () => {
    if (nameDialog === null || name === "") return;
    if (nameDialog.purpose === "create") onCreate(name);
    if (nameDialog.purpose === "rename") onRename(selected.id, name);
    if (nameDialog.purpose === "duplicate") onDuplicate(selected.id, name);
    setNameDialog(null);
  };

  const noteText = (note: PresetRowNote, row: EnginePresetRow): string => {
    if (note === "clamped" && row.range !== undefined) {
      return t("enginePresets.notes.clamped", { min: row.range.min, max: row.range.max });
    }
    return t(`enginePresets.notes.${note}`, { engine: engineName });
  };

  /** "spin · default 16 · 1–1024" — what the engine declared. */
  const summaryOf = (row: EnginePresetRow): string => {
    if (row.option === undefined) return t("enginePresets.absentSummary", { value: textOf(row.value) });
    const parts = [row.option.type];
    const fallback = row.option.defaultValue;
    if (fallback !== undefined) parts.push(t("enginePresets.default", { value: fallback === "" ? "<empty>" : fallback }));
    if (row.range !== undefined) parts.push(t("enginePresets.range", { min: row.range.min, max: row.range.max }));
    if (row.option.vars !== undefined) parts.push(row.option.vars.join(" / "));
    return parts.join(" · ");
  };

  const control = (row: EnginePresetRow, id: string) => {
    const option = row.option;
    const help = summaryOf(row);
    // On, but off until the option it needs is on (UCI_Elo, the Syzygy settings).
    const disabled = row.disabled === true;
    if (!row.editable || option === undefined) {
      return (
        <Box>
          <Typography variant="body2" component="span" dir="ltr" sx={{ fontWeight: 500 }}>
            {row.name}
          </Typography>
          {row.value !== undefined && row.value !== "" && (
            <Typography variant="body2" component="span" color="text.secondary" dir="ltr" data-testid={`${id}-value`}>
              {" "}
              {textOf(row.value)}
            </Typography>
          )}
          <Typography variant="caption" component="p" color="text.secondary" dir="ltr">
            {help}
          </Typography>
        </Box>
      );
    }
    switch (option.type) {
      case "check":
        return (
          <SwitchField
            label={<span dir="ltr">{row.name}</span>}
            checked={row.value === true}
            onChange={(checked) => onChange(row.name, checked)}
            help={<span dir="ltr">{help}</span>}
            disabled={disabled}
            testId={`${id}-input`}
          />
        );
      case "combo":
        return (
          <SelectField
            label={row.name}
            value={textOf(row.value)}
            onChange={(value) => onChange(row.name, value)}
            options={(option.vars ?? []).map((choice) => ({ value: choice, label: choice }))}
            optionDir="ltr"
            helperText={<span dir="ltr">{help}</span>}
            disabled={disabled}
            fullWidth
            testId={`${id}-input`}
          />
        );
      case "spin":
        return (
          <SpinInput
            label={row.name}
            value={typeof row.value === "number" ? row.value : undefined}
            range={row.range}
            help={help}
            disabled={disabled}
            onCommit={(value) => onChange(row.name, value)}
            testId={`${id}-input`}
          />
        );
      default:
        return (
          <WordsInput
            label={row.name}
            value={textOf(row.value)}
            help={help}
            disabled={disabled}
            onCommit={(value) => onChange(row.name, value)}
            testId={`${id}-input`}
          />
        );
    }
  };

  /** One option: its control, its note, and a reset where the preset sets it. */
  const renderRow = (row: EnginePresetRow) => {
    const id = `${testId}-option-${slugOf(row.name)}`;
    return (
      <Box
        component="li"
        key={`${selected.id}:${row.name}`}
        data-testid={id}
        sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}
      >
        <Box sx={{ flex: 1, minWidth: 0, display: "grid", gap: 0.5 }}>
          {control(row, id)}
          {row.note !== undefined && (
            <Typography variant="caption" color="text.secondary" data-testid={`${id}-note`}>
              {noteText(row.note, row)}
            </Typography>
          )}
        </Box>
        {row.set && ((row.editable && row.disabled !== true) || row.note === "absent") && (
          <IconAction
            label={row.note === "absent" ? t("enginePresets.remove", { name: row.name }) : t("enginePresets.reset", { name: row.name })}
            onClick={() => onChange(row.name, undefined)}
            testId={`${id}-reset`}
          >
            {row.note === "absent" ? <DeleteOutlineRoundedIcon fontSize="small" /> : <RestartAltRoundedIcon fontSize="small" />}
          </IconAction>
        )}
      </Box>
    );
  };

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 2, minWidth: 0 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
        <SelectField
          label={t("enginePresets.preset", { engine: engineName })}
          value={selected.id}
          onChange={onSelect}
          options={presets.map((preset) => ({ value: preset.id, label: preset.name }))}
          optionDir="auto"
          testId={`${testId}-preset`}
        />
        <Box sx={{ display: "inline-flex", gap: 0.5 }} role="group" aria-label={t("enginePresets.actions")}>
          <IconAction
            label={t("enginePresets.new")}
            onClick={() => setNameDialog({ purpose: "create", name: "" })}
            testId={`${testId}-new`}
          >
            <AddRoundedIcon fontSize="small" />
          </IconAction>
          <IconAction
            label={t("enginePresets.rename", { name: selected.name })}
            onClick={() => setNameDialog({ purpose: "rename", name: selected.name })}
            testId={`${testId}-rename`}
          >
            <DriveFileRenameOutlineRoundedIcon fontSize="small" />
          </IconAction>
          <IconAction
            label={t("enginePresets.duplicate", { name: selected.name })}
            onClick={() => setNameDialog({ purpose: "duplicate", name: t("enginePresets.copyName", { name: selected.name }) })}
            testId={`${testId}-duplicate`}
          >
            <ContentCopyRoundedIcon fontSize="small" />
          </IconAction>
          <IconAction
            label={selected.deletable ? t("enginePresets.delete", { name: selected.name }) : t("enginePresets.deleteDefault")}
            onClick={() => setConfirmDelete(true)}
            disabled={!selected.deletable}
            color="error"
            testId={`${testId}-delete`}
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconAction>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {t("enginePresets.intro", { engine: engineName })}
      </Typography>

      {rows === undefined ? (
        <StatusText tone="neutral" testId={`${testId}-reading`}>
          {t("enginePresets.reading", { engine: engineName })}
        </StatusText>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" data-testid={`${testId}-empty`}>
          {t("enginePresets.empty", { engine: engineName })}
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 1.5, minWidth: 0 }}>
          <PanelTabs
            tabs={tabs.map((tab) => ({ id: tab, label: t(`enginePresets.tabs.${tab}`) }))}
            value={shownTab}
            onChange={(id) => setTab(id as OptionTab)}
            fullWidth
            ariaLabel={t("enginePresets.tabs.label")}
            idPrefix={`${testId}-tab`}
            testId={`${testId}-tabs`}
          />
          <Box {...tabPanelProps(`${testId}-tab`, shownTab)}>
            <Box
              component="ul"
              aria-label={t("enginePresets.list", { engine: engineName, preset: selected.name, tab: t(`enginePresets.tabs.${shownTab}`) })}
              data-testid={`${testId}-options`}
              sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5 }}
            >
              {itemsOf(rows.filter((row) => row.tab === shownTab)).map((item) => {
                if (item.kind === "row") return renderRow(item.row);
                const on = groups[item.id] === true;
                const groupId = `${testId}-group-${item.id}`;
                return (
                  <Box component="li" key={`${selected.id}:group:${item.id}`} data-testid={groupId} sx={{ display: "grid", gap: 1.5 }}>
                    <SwitchField
                      label={t(`enginePresets.groups.${item.id}.label`)}
                      checked={on}
                      onChange={(checked) => onGroupChange(item.id, checked)}
                      help={t(`enginePresets.groups.${item.id}.help`)}
                      testId={`${groupId}-switch`}
                    />
                    {/* Its options only while it is on — off, none of them is sent. */}
                    {on && (
                      <Box
                        component="ul"
                        aria-label={t(`enginePresets.groups.${item.id}.label`)}
                        data-testid={`${groupId}-options`}
                        sx={{ listStyle: "none", m: 0, p: 0, paddingInlineStart: 2, display: "grid", gap: 1.5 }}
                      >
                        {item.rows.map(renderRow)}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      <FormDialog
        open={nameDialog !== null}
        onClose={() => setNameDialog(null)}
        onSubmit={submitName}
        title={
          nameDialog?.purpose === "rename"
            ? t("enginePresets.renameTitle")
            : nameDialog?.purpose === "duplicate"
              ? t("enginePresets.duplicateTitle")
              : t("enginePresets.newTitle")
        }
        submitLabel={nameDialog?.purpose === "rename" ? t("enginePresets.save") : t("enginePresets.create")}
        cancelLabel={t("enginePresets.cancel")}
        submitDisabled={name === ""}
        testId={`${testId}-name`}
      >
        <TextInputField
          label={t("enginePresets.name")}
          value={nameDialog?.name ?? ""}
          onChange={(value) => setNameDialog((was) => (was === null ? was : { ...was, name: value.slice(0, MAX_PRESET_NAME_LENGTH) }))}
          dir="auto"
          testId={`${testId}-name-input`}
        />
      </FormDialog>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(selected.id);
        }}
        title={t("enginePresets.deleteTitle", { name: selected.name })}
        message={t("enginePresets.deleteMessage")}
        confirmLabel={t("enginePresets.deleteConfirm")}
        cancelLabel={t("enginePresets.cancel")}
        tone="destructive"
        testId={`${testId}-confirm-delete`}
      />
    </Box>
  );
}

export default EnginePresetForm;
