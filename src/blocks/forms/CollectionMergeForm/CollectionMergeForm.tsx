import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useTranslation } from "react-i18next";

import { CheckboxField, RadioGroupField, SettingsSection, TextInputField } from "../../../design-system/components/forms";
import { IconAction } from "../../../design-system/components/toolbars";
import {
  COLLECTION_MERGE_DEDUPE_MODES,
  defaultMergeName,
  MIN_MERGE_SOURCES,
  type CollectionMergeDedupe,
  type CollectionMergeSettings,
  type CollectionMergeSource,
} from "../../../lib/jobs/kinds/collectionMerge/core";
import { MAX_COLLECTION_CHARS } from "../../../lib/libraryCollections";

/** A collection picked to merge, with how many games it holds. */
export type CollectionMergeFormSource = CollectionMergeSource & { count: number };

export type CollectionMergeFormProps = {
  /** The collections picked, in the order their games are written — two or more. */
  sources: readonly CollectionMergeFormSource[];
  /** The collections reordered, or one removed — the whole list, as it now is. */
  onSourcesChange: (sources: CollectionMergeFormSource[]) => void;
  /** The dedupe mode, the name (`""` — the default, "<first> + <n> more") and the outputs. */
  settings: CollectionMergeSettings;
  /** A change, as a patch — the screen holds the settings (`collectionMergeSettingsFrom`). */
  onChange: (patch: Partial<CollectionMergeSettings>) => void;
  /**
   * The root. The collections `-sources` (a row `-source-<id>`, its actions
   * `-up-<id>`, `-down-<id>`, `-remove-<id>`; the note at two `-minimum`), the
   * dedupe radios `-dedupe` (each `-dedupe-<mode>`), the name `-name`, the
   * outputs `-output-pgn`, `-output-collection`.
   */
  testId: string;
};

/** Each dedupe mode's explanation key. */
const MODE_HELP: Readonly<Record<CollectionMergeDedupe, string>> = {
  none: "noneHelp",
  "identical-pgn": "identicalHelp",
  "same-game": "sameGameHelp",
};

/** `sources` with the one at `from` moved to `to`. */
const moved = (sources: readonly CollectionMergeFormSource[], from: number, to: number): CollectionMergeFormSource[] => {
  const next = [...sources];
  const [source] = next.splice(from, 1);
  next.splice(to, 0, source);
  return next;
};

/**
 * **A collection merge's New-job form** (CTA-220, the Jobs module's
 * `library.collection-merge` kind): the collections picked, in the order
 * their games are written — each with its game count, moved up or down or
 * removed (never below two: the last two cannot be, and a note says why); how
 * duplicates are told, a radio each with what it keeps and drops; the name,
 * the default "<first> + <n> more" (in the reader's language) where it is
 * left empty; and what is made — the merged PGN as a file always (ticked, not
 * to be unticked), and *Also add as a Library collection*.
 *
 * Presentational: the collections and the settings arrive, a change leaves
 * as the new list or a patch; Start and its refusals are the New-job frame's.
 * Its words are `jobs.kinds.collectionMerge.*`.
 */
function CollectionMergeForm({ sources, onSourcesChange, settings, onChange, testId }: CollectionMergeFormProps) {
  const { t, i18n } = useTranslation();
  const words = (key: string, options?: Record<string, unknown>) => t(`jobs.kinds.collectionMerge.form.${key}`, options);
  const defaultName = defaultMergeName(sources, (count) => words("more", { count }));
  const atMinimum = sources.length <= MIN_MERGE_SOURCES;

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 2 }}>
      <SettingsSection title={words("sources")} description={words("sourcesHelp")} testId={`${testId}-sources-section`}>
        <Box
          component="ol"
          aria-label={words("sources")}
          data-testid={`${testId}-sources`}
          sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}
        >
          {sources.map((source, index) => (
            <Box
              component="li"
              key={source.id}
              data-testid={`${testId}-source-${source.id}`}
              sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, py: 0.25, borderBottom: 1, borderColor: "divider" }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary", minWidth: "1.5em", textAlign: "end" }} dir="ltr">
                {index + 1}.
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" dir="auto" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={source.name}>
                  {source.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {words("games", { count: source.count, formatted: source.count.toLocaleString(i18n.language) })}
                </Typography>
              </Box>
              <IconAction
                label={words("moveUp", { name: source.name })}
                onClick={() => onSourcesChange(moved(sources, index, index - 1))}
                disabled={index === 0}
                testId={`${testId}-up-${source.id}`}
              >
                <ArrowUpwardRoundedIcon fontSize="small" />
              </IconAction>
              <IconAction
                label={words("moveDown", { name: source.name })}
                onClick={() => onSourcesChange(moved(sources, index, index + 1))}
                disabled={index === sources.length - 1}
                testId={`${testId}-down-${source.id}`}
              >
                <ArrowDownwardRoundedIcon fontSize="small" />
              </IconAction>
              <IconAction
                label={words("remove", { name: source.name })}
                onClick={() => onSourcesChange(sources.filter((each) => each.id !== source.id))}
                disabled={atMinimum}
                testId={`${testId}-remove-${source.id}`}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconAction>
            </Box>
          ))}
        </Box>
        {atMinimum && (
          <Typography variant="caption" sx={{ color: "text.secondary" }} data-testid={`${testId}-minimum`}>
            {words("minimum")}
          </Typography>
        )}
      </SettingsSection>

      <SettingsSection title={words("dedupe")} testId={`${testId}-dedupe-section`}>
        <RadioGroupField<CollectionMergeDedupe>
          label={words("dedupe")}
          options={COLLECTION_MERGE_DEDUPE_MODES.map((mode) => ({
            value: mode,
            label: (
              <>
                {t(`jobs.kinds.collectionMerge.dedupe.${mode}`)}
                <Box component="span" sx={{ display: "block", typography: "caption", color: "text.secondary", mb: 0.5 }}>
                  {words(MODE_HELP[mode])}
                </Box>
              </>
            ),
          }))}
          value={settings.dedupe}
          onChange={(dedupe) => onChange({ dedupe })}
          testId={`${testId}-dedupe`}
        />
      </SettingsSection>

      <SettingsSection title={words("name")} testId={`${testId}-name-section`}>
        <TextInputField
          label={words("name")}
          value={settings.name}
          onChange={(name) => onChange({ name })}
          placeholder={defaultName}
          helperText={words("nameHelp", { name: defaultName })}
          dir="auto"
          testId={`${testId}-name`}
        />
      </SettingsSection>

      <SettingsSection title={words("outputs")} testId={`${testId}-outputs`}>
        <CheckboxField label={words("pgnFile")} help={words("pgnFileHelp")} checked disabled onChange={() => {}} testId={`${testId}-output-pgn`} />
        <CheckboxField
          label={words("collection")}
          help={words("collectionHelp", { limit: MAX_COLLECTION_CHARS.toLocaleString(i18n.language) })}
          checked={settings.outputs.collection}
          onChange={(collection) => onChange({ outputs: { ...settings.outputs, collection } })}
          testId={`${testId}-output-collection`}
        />
      </SettingsSection>
    </Box>
  );
}

export default CollectionMergeForm;
