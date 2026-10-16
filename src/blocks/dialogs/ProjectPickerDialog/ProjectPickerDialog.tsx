import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Radio from "@mui/material/Radio";
import Typography from "@mui/material/Typography";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { BaseDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { SearchField, TextInputField } from "../../../design-system/components/forms";
import { DEFAULT_TABLE_PAGE_SIZE, tableDate } from "../../../design-system/components/tables";
import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import {
  filteredProjectPickerRows,
  PROJECT_PICKER_COLUMNS,
  projectPickerFirstDirection,
  sortedProjectPickerRows,
  type ProjectPickerColumn,
  type ProjectPickerRow,
  type ShownProjectPickerRow,
} from "../../../lib/analysisProjectPickerRows";

export type ProjectPickerDialogProps = {
  open: boolean;
  /** "Move 3 cases to another project", "Duplicate case". */
  title: string;
  /** "Move", "Duplicate". */
  submitLabel: string;
  /** Every Project, with its folder path and its count of Cases (`projectPickerRowsOf`). */
  projects: readonly ProjectPickerRow[];
  /** The Project the thing is in now — chosen at first, or left out (`excludeCurrent`). */
  current: string;
  /** A move: the Project it is in is not offered. */
  excludeCurrent?: boolean;
  /** A name to give the result — a duplicate's, seeded with this; absent, no name field. */
  initialName?: string;
  /** The chosen Project (and the name, when asked); the dialog does not close itself. */
  onSubmit: (projectId: string, name: string) => void;
  /**
   * **A new Project offered too** (CTA-192 — a game handed to Analysis from
   * another screen): a choice of its own above the table, "New project", its
   * name asked under it, seeded with `initialName`; chosen at first when
   * `current` names no Project. Picking it submits through `onSubmit` here
   * (the new Project's name, and the result's name when asked). Absent, only
   * the Projects held.
   */
  newProject?: { initialName: string; onSubmit: (projectName: string, name: string) => void };
  onClose: () => void;
  busy?: boolean;
  /** Why the last submit was refused, in words — under the table, the dialog left open (`<testId>-problem`). */
  problem?: string | null;
  /**
   * The prefix of its ids: the dialog `<testId>` (`-submit`, `-cancel`), the
   * words `<testId>-filter`, the table `<testId>-projects` (`DataTable`'s
   * parts; each Project's row `<testId>-projects-<id>`, its radio
   * `<testId>-projects-<id>-radio`), the New project choice
   * `<testId>-projects-new`, the name `<testId>-name`, a new Project's name
   * `<testId>-project-name`, the choice said `<testId>-into`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

/** The choice of "New project" — never a record's id (`newRecordId`'s start with `g`). */
const NEW_PROJECT = "new";

type Column = ProjectPickerColumn | "choose";
type Sort = { column: ProjectPickerColumn; direction: "asc" | "desc" };
const DEFAULT_SORT: Sort = { column: "name", direction: "asc" };

/**
 * **A Project to put Cases in** (CTA-186; a table since CTA-226) — Cases
 * moved to another Project (the Project view's picks), a Case duplicated
 * into one (its own or another) under a name, or games handed over from
 * another screen (`newProject`, CTA-192). Built for thousands of Projects: a
 * wide popup over a **sortable, paged table** — Name, Folder (its path in the
 * folder tree), Cases and Updated, Name A to Z at first — under a **words
 * box** (every word in the name or the folder path). **One Project is
 * chosen** — its radio, a click on its row or Enter / Space on it — and
 * stays chosen as the words, the sort or the page change, named under the
 * table ("Into: Openings / Najdorf") so it is never lost off-page; it opens
 * on the page holding the Project chosen at first. Then the name, when asked.
 *
 * Presentational: the rows are the caller's (`projectPickerRowsOf` over the
 * stores); the words, sort, page and choice its own state, reset each time it
 * opens. The filter and the sort are memoised, and only a page is drawn. Its
 * words are the app's (`analysisV2.projectPicker.*`, `analysisV2.case.*`).
 */
function ProjectPickerDialog({
  open,
  title,
  submitLabel,
  projects,
  current,
  excludeCurrent = false,
  initialName,
  onSubmit,
  newProject,
  onClose,
  busy = false,
  problem = null,
  testId,
  dialogProps,
}: ProjectPickerDialogProps) {
  const { t, i18n } = useTranslation();
  const formId = useId();
  const radioName = useId();

  // Every Project offered, named as the reader reads it — once per change of the rows or the language.
  const offered = useMemo<readonly ShownProjectPickerRow[]>(
    () =>
      projects
        .filter((row) => !(excludeCurrent && row.id === current))
        .map((row) => ({
          row,
          name: row.name || t("analysisV2.project.untitled"),
          path: row.folders.map((folder) => folder || t("analysisV2.folder.untitled")).join(" / "),
        })),
    [projects, excludeCurrent, current, t],
  );

  const firstChoice = (): string | undefined => {
    if (!excludeCurrent && projects.some((row) => row.id === current)) return current;
    return newProject === undefined ? undefined : NEW_PROJECT;
  };
  /** The page holding `chosen` under the first sort and no words — where the table opens. */
  const pageOf = (chosen: string | undefined): number => {
    if (chosen === undefined || chosen === NEW_PROJECT) return 0;
    const index = sortedProjectPickerRows(offered, DEFAULT_SORT.column, DEFAULT_SORT.direction).findIndex((shown) => shown.row.id === chosen);
    return index < 0 ? 0 : Math.floor(index / DEFAULT_TABLE_PAGE_SIZE);
  };

  const [chosen, setChosen] = useState<string | undefined>(firstChoice);
  const [name, setName] = useState(initialName ?? "");
  const [projectName, setProjectName] = useState(newProject?.initialName ?? "");
  const [words, setWords] = useState("");
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const [page, setPage] = useState(() => pageOf(chosen));
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_TABLE_PAGE_SIZE);

  // Opened afresh, it starts from the thing's own place and name — adjusted during render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const first = firstChoice();
      setChosen(first);
      setName(initialName ?? "");
      setProjectName(newProject?.initialName ?? "");
      setWords("");
      setSort(DEFAULT_SORT);
      setPage(pageOf(first));
      setRowsPerPage(DEFAULT_TABLE_PAGE_SIZE);
    }
  }

  const filtered = useMemo(() => filteredProjectPickerRows(offered, words), [offered, words]);
  const ordered = useMemo(() => sortedProjectPickerRows(filtered, sort.column, sort.direction), [filtered, sort.column, sort.direction]);

  const creating = newProject !== undefined && chosen === NEW_PROJECT;
  const chosenRow = chosen === undefined || creating ? undefined : offered.find((shown) => shown.row.id === chosen);
  const blocked = busy || (creating ? projectName.trim() === "" : chosenRow === undefined);

  const submit = () => {
    if (blocked) return;
    if (creating) newProject.onSubmit(projectName.trim(), name);
    else if (chosenRow !== undefined) onSubmit(chosenRow.row.id, name);
  };
  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };
  // Enter in a one-line name submits, as a form dialog's does; the words box and the table keep their own Enter.
  const onFormKey = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === "text") {
      event.preventDefault();
      submit();
    }
  };

  const language = i18n.language;
  const columns = useMemo<DataTableColumn<ShownProjectPickerRow, Column>[]>(() => {
    const number = (value: number) => value.toLocaleString(language);
    const labelOf = (shown: ShownProjectPickerRow) =>
      shown.path === ""
        ? t("analysisV2.projectPicker.choose", { name: shown.name })
        : t("analysisV2.projectPicker.chooseIn", { name: shown.name, folder: shown.path });
    return [
      {
        id: "choose",
        header: <Box component="span" sx={visuallyHidden}>{t("analysisV2.projectPicker.columns.choose")}</Box>,
        width: 48,
        render: (shown) => (
          <Radio
            size="small"
            checked={chosen === shown.row.id}
            onChange={() => setChosen(shown.row.id)}
            name={radioName}
            value={shown.row.id}
            disabled={busy}
            slotProps={{ input: { "aria-label": labelOf(shown), "data-testid": `${testId}-projects-${shown.row.id}-radio` } as object }}
            sx={{ my: -0.5 }}
          />
        ),
      },
      ...PROJECT_PICKER_COLUMNS.map((id): DataTableColumn<ShownProjectPickerRow, Column> => ({
        id,
        header: t(`analysisV2.projectPicker.columns.${id}`),
        sortable: true,
        firstDirection: projectPickerFirstDirection(id),
        ...(id === "cases" && { align: "end" as const }),
        ...(id === "name" || id === "folder" ? { dir: "auto" as const, width: id === "name" ? 280 : 240 } : { dir: "ltr" as const }),
        render:
          id === "name"
            ? (shown) => <OneLine value={shown.name} />
            : id === "folder"
              ? (shown) => <OneLine value={shown.path} />
              : id === "cases"
                ? (shown) => number(shown.row.cases)
                : (shown) => {
                    const date = tableDate(shown.row.updated);
                    return date === undefined ? "" : <time dateTime={date.dateTime}>{date.text}</time>;
                  },
      })),
    ];
  }, [t, language, chosen, radioName, busy, testId]);

  const into = creating
    ? t("analysisV2.projectPicker.intoNew", { name: projectName.trim() || t("analysisV2.project.untitled") })
    : chosenRow === undefined
      ? t("analysisV2.projectPicker.intoNone")
      : t("analysisV2.projectPicker.into", { target: chosenRow.path === "" ? chosenRow.name : `${chosenRow.path} / ${chosenRow.name}` });

  return (
    <BaseDialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      width="full"
      dividers
      testId={testId}
      dialogProps={dialogProps}
      actions={
        <>
          <Typography variant="body2" dir="auto" role="status" data-testid={`${testId}-into`} sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            {into}
          </Typography>
          <Button onClick={onClose} disabled={busy} data-testid={`${testId}-cancel`}>
            {t("analysisV2.cancel")}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="contained"
            disabled={blocked}
            aria-busy={busy || undefined}
            startIcon={busy ? <CircularProgress aria-hidden size={16} color="inherit" /> : undefined}
            data-testid={`${testId}-submit`}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <Box
        component="form"
        id={formId}
        noValidate
        onSubmit={onFormSubmit}
        onKeyDown={onFormKey}
        sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", minHeight: 0 }}
      >
        {initialName !== undefined && (
          <Box sx={{ flexShrink: 0 }}>
            <TextInputField
              label={t("analysisV2.case.name")}
              value={name}
              onChange={setName}
              dir="auto"
              helperText={t("analysisV2.case.nameHelp")}
              testId={`${testId}-name`}
            />
          </Box>
        )}
        {newProject !== undefined && (
          <Box sx={{ flexShrink: 0, display: "grid", gap: 1 }}>
            <Box
              component="label"
              data-testid={`${testId}-projects-new`}
              sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", width: "fit-content" }}
            >
              <Radio
                size="small"
                checked={creating}
                onChange={() => setChosen(NEW_PROJECT)}
                name={radioName}
                value={NEW_PROJECT}
                disabled={busy}
                slotProps={{ input: { "data-testid": `${testId}-projects-new-radio` } as object }}
              />
              <CreateNewFolderOutlinedIcon fontSize="small" aria-hidden sx={{ color: "text.secondary" }} />
              <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                {t("analysisV2.case.newProject")}
              </Typography>
            </Box>
            {creating && (
              <TextInputField
                label={t("analysisV2.case.newProjectName")}
                value={projectName}
                onChange={setProjectName}
                dir="auto"
                error={projectName.trim() === ""}
                helperText={t("analysisV2.case.newProjectNameHelp")}
                testId={`${testId}-project-name`}
              />
            )}
          </Box>
        )}
        <Box sx={{ flex: 1, minHeight: 280, display: "flex", flexDirection: "column" }}>
          <DataTable<ShownProjectPickerRow, Column>
            columns={columns}
            rows={ordered}
            rowId={(shown) => shown.row.id}
            sorted
            sort={sort}
            onSort={(column, direction) => {
              if (column === "choose") return;
              setSort({ column, direction });
              setPage(0);
            }}
            paging={{
              page,
              rowsPerPage,
              onPageChange: setPage,
              onRowsPerPageChange: (next) => {
                setRowsPerPage(next);
                setPage(0);
              },
              labelRowsPerPage: t("analysisV2.projectPicker.rowsPerPage"),
            }}
            onRowClick={(shown) => {
              if (!busy) setChosen(shown.row.id);
            }}
            rowTestId={(shown) => `${testId}-projects-${shown.row.id}`}
            filters={
              <SearchField
                label={t("analysisV2.projectPicker.filter")}
                value={words}
                onChange={(value) => {
                  setWords(value);
                  setPage(0);
                }}
                clearLabel={t("analysisV2.projectPicker.filterClear")}
                testId={`${testId}-filter`}
              />
            }
            filtered={words.trim() !== ""}
            noMatchLabel={t("analysisV2.projectPicker.noMatch")}
            emptyLabel={t("analysisV2.projectPicker.empty")}
            density="dense"
            ariaLabel={t("analysisV2.projectPicker.label")}
            hint={t("analysisV2.projectPicker.hint")}
            testId={`${testId}-projects`}
          />
        </Box>
        {problem !== null && (
          <Box sx={{ flexShrink: 0 }}>
            <InlineAlert severity="error" testId={`${testId}-problem`}>
              {problem}
            </InlineAlert>
          </Box>
        )}
      </Box>
    </BaseDialog>
  );
}

/** A reader's words on one line, cut with an ellipsis — the whole of it on hover. */
function OneLine({ value }: { value: string }) {
  return (
    <Box component="span" dir="auto" title={value} sx={{ display: "block", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
      {value}
    </Box>
  );
}

export default ProjectPickerDialog;
