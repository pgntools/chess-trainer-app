import { useId, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { BaseDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { CheckboxField, RadioGroupField } from "../../../design-system/components/forms";
import { ExpandToggle } from "../../../design-system/components/navigation";
import { EXPORT_CATEGORIES, type ExportCategory } from "../../../lib/dataExport";
import {
  CONFLICT_CHOICES,
  defaultImportChoices,
  importPlanOf,
  importWritesOf,
  type CategoryChoices,
  type ConflictChoice,
  type FolderConflict,
  type ImportCaps,
  type ImportChoices,
  type ImportCurrent,
  type ImportDump,
} from "../../../lib/dataImport";

export type ImportDialogProps = {
  /** The zip's own name — the title's. */
  fileName: string;
  /** The zip, read and checked (`readImport`). */
  dump: ImportDump;
  /** What the app holds now (`loadImportCurrent`, read by the screen). */
  current: ImportCurrent;
  /** The stores' caps (`IMPORT_CAPS`), handed in so the dialog reads no store. */
  caps: ImportCaps;
  onCancel: () => void;
  /** Nothing is written here: Import hands the choices back. */
  onImport: (choices: ImportChoices) => void;
  /**
   * The prefix of every id it sets: the dialog `<testId>-dialog`, a category
   * `<testId>-<category>` (its box `-tick`, `-count`, `-choice`, `-preview`,
   * `-refused`), a clash `<testId>-<category>-conflict-<i>` (`-toggle`,
   * `-effective`, `-choice`), `<testId>-shipped`, `<testId>-games-drops`,
   * `<testId>-cancel`, `<testId>-run`.
   */
  testId: string;
  /** Anything else MUI's `Dialog` takes — the gallery's frame. */
  dialogProps?: ExtraDialogProps;
};

type Translate = ReturnType<typeof useTranslation>["t"];

const choiceOptions = (t: Translate) => CONFLICT_CHOICES.map((choice) => ({ value: choice, label: t(`settings.import.choices.${choice}`) }));

/** One clashing folder: its name and counts, the choice it gets, and — opened — its own. */
function ConflictRow({
  category,
  conflict,
  choice,
  own,
  onChoose,
  testId,
}: {
  category: ExportCategory;
  conflict: FolderConflict;
  choice: ConflictChoice;
  own: ConflictChoice | undefined;
  onChoose: (choice: ConflictChoice) => void;
  testId: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const regionId = useId();
  const effective = own ?? choice;
  return (
    <Box component="li" data-testid={testId} sx={{ listStyle: "none" }}>
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <ExpandToggle
          expanded={open}
          onToggle={() => setOpen((was) => !was)}
          label={t("settings.import.dialog.toggle")}
          controls={regionId}
          testId={`${testId}-toggle`}
        />
        <Typography variant="body2" dir="auto" sx={{ fontWeight: 600 }}>
          {conflict.path.length === 0 ? t(`settings.import.top.${category}`) : conflict.path.join(" / ")}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {t("settings.import.dialog.counts", { incoming: conflict.incoming, existing: conflict.existing })}
        </Typography>
        {/* Filled when the folder has a choice of its own, outlined when it follows the category's. */}
        <Chip
          size="small"
          variant={own === undefined ? "outlined" : "filled"}
          label={t(`settings.import.choices.${effective}`)}
          data-testid={`${testId}-effective`}
        />
      </Box>
      <Collapse in={open} unmountOnExit id={regionId}>
        <Box sx={{ paddingInlineStart: 5 }}>
          <RadioGroupField<ConflictChoice>
            row
            label={t("settings.import.dialog.folderChoice")}
            options={choiceOptions(t)}
            value={effective}
            onChange={onChoose}
            testId={`${testId}-choice`}
          />
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * **What to import, and what a clash does** (CTA-109; CTA-89's dialog) — the
 * dialog a readable zip opens on. One row per category (those the zip does not
 * hold are off), each with its count; under a ticked one that clashes, Merge /
 * Override / Skip for the whole category and its clashing folders, each of
 * which opens to a choice of its own. **Every change re-plans**
 * (`importWritesOf`, pure), so what the import will add, replace, skip and
 * create — and a cap it would pass — is said before anything is written.
 *
 * Presentational: the dump, the stores' contents and their caps are props;
 * Import hands the choices back and writes nothing. Its words are the app's
 * (`settings.import.*`).
 */
function ImportDialog({ fileName, dump, current, caps, onCancel, onImport, testId, dialogProps }: ImportDialogProps) {
  const { t, i18n } = useTranslation();
  const plan = useMemo(() => importPlanOf(dump, current), [dump, current]);
  const [choices, setChoices] = useState<ImportChoices>(() => defaultImportChoices(plan));
  const writes = useMemo(() => importWritesOf(dump, current, choices, { caps }), [dump, current, choices, caps]);

  const change = (category: ExportCategory, next: Partial<CategoryChoices>) =>
    setChoices((was) => ({ ...was, [category]: { ...was[category], ...next } }));

  const exported = new Date(dump.exportedAt);
  const writable = EXPORT_CATEGORIES.some((category) => {
    const planned = writes[category];
    return planned !== undefined && planned.refused === undefined;
  });

  return (
    <BaseDialog
      open
      onClose={onCancel}
      title={t("settings.import.dialog.title", { fileName })}
      width="sm"
      dividers
      testId={`${testId}-dialog`}
      dialogProps={dialogProps}
      actions={
        <>
          <Button onClick={onCancel} data-testid={`${testId}-cancel`}>
            {t("settings.import.dialog.cancel")}
          </Button>
          <Button variant="contained" disabled={!writable} onClick={() => onImport(choices)} data-testid={`${testId}-run`}>
            {t("settings.import.dialog.run")}
          </Button>
        </>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {!Number.isNaN(exported.getTime()) && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("settings.import.dialog.from", { date: exported.toLocaleDateString(i18n.language), version: dump.appVersion })}
          </Typography>
        )}

        {EXPORT_CATEGORIES.map((category, at) => {
          const planned = plan.categories[category];
          const chosen = choices[category];
          const ticked = planned !== undefined && chosen.ticked;
          const outcome = ticked ? writes[category] : undefined;
          const conflicts = planned?.conflicts ?? [];
          const categoryId = `${testId}-${category}`;
          return (
            <Box key={category} data-testid={categoryId}>
              {at > 0 && <Divider sx={{ mb: 1 }} />}
              <CheckboxField
                size="medium"
                label={
                  <>
                    {t(`settings.export.categories.${category}`)}{" "}
                    <Typography component="span" variant="body2" color="text.secondary" data-testid={`${categoryId}-count`}>
                      ({planned?.count ?? 0})
                    </Typography>
                  </>
                }
                checked={ticked}
                disabled={planned === undefined}
                onChange={(checked) => change(category, { ticked: checked })}
                // The Import tab's tests reach the input inside the box.
                testIdOn="control"
                testId={`${categoryId}-tick`}
              />
              <Box sx={{ paddingInlineStart: 4, display: "flex", flexDirection: "column", gap: 0.5 }}>
                {category === "collections" && plan.shippedCollections > 0 && (
                  <Typography variant="body2" sx={{ color: "text.secondary" }} data-testid={`${testId}-shipped`}>
                    {t("settings.import.dialog.shipped", { count: plan.shippedCollections })}
                  </Typography>
                )}
                {ticked && conflicts.length > 0 && (
                  <>
                    <RadioGroupField<ConflictChoice>
                      row
                      label={t("settings.import.dialog.conflicts", { count: conflicts.length })}
                      options={choiceOptions(t)}
                      value={chosen.choice}
                      onChange={(choice) => change(category, { choice })}
                      help={t(`settings.import.choiceHelp.${chosen.choice}`)}
                      testId={`${categoryId}-choice`}
                    />
                    <Box component="ul" sx={{ m: 0, p: 0 }}>
                      {conflicts.map((conflict, index) => (
                        <ConflictRow
                          key={conflict.key}
                          category={category}
                          conflict={conflict}
                          choice={chosen.choice}
                          own={chosen.folders[conflict.key]}
                          onChoose={(choice) => change(category, { folders: { ...chosen.folders, [conflict.key]: choice } })}
                          testId={`${categoryId}-conflict-${index}`}
                        />
                      ))}
                    </Box>
                  </>
                )}
                {outcome !== undefined && outcome.refused === undefined && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }} data-testid={`${categoryId}-preview`}>
                    {t("settings.import.dialog.preview", outcome.report)}
                  </Typography>
                )}
                {outcome?.refused !== undefined && (
                  <InlineAlert severity="error" dense testId={`${categoryId}-refused`}>
                    {t(
                      outcome.refused.kind === "records" ? "settings.import.dialog.refusedRecords" : "settings.import.dialog.refusedFolders",
                      outcome.refused,
                    )}
                  </InlineAlert>
                )}
                {outcome?.dropsOldest !== undefined && (
                  <InlineAlert severity="warning" dense testId={`${testId}-games-drops`}>
                    {t("settings.import.dialog.dropsOldest", { count: outcome.dropsOldest, max: caps.playedGames })}
                  </InlineAlert>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </BaseDialog>
  );
}

export default ImportDialog;
