import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { CheckboxField } from "../../../design-system/components/forms";
import { EXPORT_CATEGORIES, type ExportCategory, type ExportSelection } from "../../../lib/dataExport";

export type ExportCategoriesFormProps = {
  selection: ExportSelection;
  onChange: (patch: Partial<ExportSelection>) => void;
  /** How many items each category holds — `undefined` while its store is read ("…"). */
  counts: Readonly<Record<ExportCategory, number | undefined>>;
  /** How many shipped collections there are to include. */
  shippedCount: number;
  /** An export is under way: every box off. */
  disabled?: boolean;
  /**
   * The prefix of its ids: each category's box `<testId>-<category>` (on the
   * checkbox around the input) and its count `-<category>-count`, the shipped
   * box `<testId>-shipped`, the whole `<testId>-categories`.
   */
  testId: string;
};

/**
 * **What an export takes** (CTA-109; CTA-86's form) — the four categories,
 * each all or nothing with how many items it holds, and under Collections
 * the box for the shipped ones (off until Collections is ticked; the reader's
 * uploads always go with Collections). Presentational: the selection and the
 * counts are props, a tick leaves as a patch. Its words are the app's
 * (`settings.export.*`).
 */
function ExportCategoriesForm({ selection, onChange, counts, shippedCount, disabled = false, testId }: ExportCategoriesFormProps) {
  const { t } = useTranslation();
  return (
    <Box data-testid={`${testId}-categories`} sx={{ display: "grid", gap: 0.5 }}>
      {EXPORT_CATEGORIES.map((category) => (
        <Box key={category}>
          <CheckboxField
            size="medium"
            label={
              <>
                {t(`settings.export.categories.${category}`)}{" "}
                <Typography component="span" variant="body2" color="text.secondary" data-testid={`${testId}-${category}-count`}>
                  ({counts[category] ?? "…"})
                </Typography>
              </>
            }
            checked={selection[category]}
            onChange={(checked) => onChange({ [category]: checked })}
            disabled={disabled}
            // The Export tab's tests reach the input inside the box.
            testIdOn="control"
            testId={`${testId}-${category}`}
          />
          {category === "collections" && (
            <Box sx={{ paddingInlineStart: 4 }}>
              <CheckboxField
                label={t("settings.export.includeShipped", { count: shippedCount })}
                checked={selection.shippedCollections}
                onChange={(shippedCollections) => onChange({ shippedCollections })}
                disabled={disabled || !selection.collections}
                testIdOn="control"
                testId={`${testId}-shipped`}
              />
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

export default ExportCategoriesForm;
