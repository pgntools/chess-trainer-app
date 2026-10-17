import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useTranslation } from "react-i18next";

import { SelectAutocomplete } from "../../../design-system/components/autocompletes";
import { RadioGroupField, SettingsSection, TextInputField } from "../../../design-system/components/forms";
import { IconAction } from "../../../design-system/components/toolbars";
import {
  COLLECTION_MERGE_DEDUPE_MODES,
  defaultMergeName,
  MIN_MERGE_SOURCES,
  type CollectionMergeDedupe,
  type CollectionMergeSettings,
  type CollectionMergeSource,
} from "../../../lib/collectionMerge";

/** A collection picked to merge, with how many games it holds. */
export type CollectionMergeFormSource = CollectionMergeSource & { count: number };

/** A collection the reader may add — a shipped one (Built-in) or their own. */
export type CollectionMergeFormCandidate = CollectionMergeFormSource & { builtIn: boolean };

export type CollectionMergeFormProps = {
  /** The collections picked, in the order their games are written. */
  sources: readonly CollectionMergeFormSource[];
  /** The collections reordered, one removed or one added — the whole list, as it now is. */
  onSourcesChange: (sources: CollectionMergeFormSource[]) => void;
  /**
   * The collections the reader may add — every other one in the Library,
   * Built-in and their own; those already picked are left out here. Empty:
   * no picker.
   */
  candidates: readonly CollectionMergeFormCandidate[];
  /** The dedupe mode and the name (`""` — the default, "<first> + <n> more"). */
  settings: CollectionMergeSettings;
  /** A change, as a patch — the screen holds the settings. */
  onChange: (patch: Partial<CollectionMergeSettings>) => void;
  /** The merge is under way: nothing changes. */
  disabled?: boolean;
  /**
   * The root. The collections `-sources` (a row `-source-<id>`, its actions
   * `-up-<id>`, `-down-<id>`, `-remove-<id>`; the note at two `-minimum`),
   * the picker `-add` (its input `-add-input`), the dedupe radios `-dedupe`
   * (each `-dedupe-<mode>`), the name `-name`.
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
 * **A collection merge's form** (CTA-220; the Library's own since CTA-232,
 * in `CollectionMergeDialog`): the collections picked, in the order their
 * games are written — each with its game count, moved up or down or removed
 * (never below two once there are two: the last two cannot be, and a note
 * says why); a picker over the Library's other collections, Built-in and the
 * reader's own, typed to find, to add one at the end; how duplicates are
 * told, a radio each with what it keeps and drops; and the new collection's
 * name, the default "<first> + <n> more" (in the reader's language) where it
 * is left empty.
 *
 * Presentational: the collections, the candidates and the settings arrive, a
 * change leaves as the new list or a patch; Merge and its refusals are the
 * dialog's. Its words are `library.merge.*`.
 */
function CollectionMergeForm({ sources, onSourcesChange, candidates, settings, onChange, disabled = false, testId }: CollectionMergeFormProps) {
  const { t, i18n } = useTranslation();
  const words = (key: string, options?: Record<string, unknown>) => t(`library.merge.${key}`, options);
  const defaultName = defaultMergeName(sources, (count) => words("more", { count }));
  const atMinimum = sources.length <= MIN_MERGE_SOURCES;
  const picked = new Set(sources.map((source) => source.id));
  const addable = candidates.filter((candidate) => !picked.has(candidate.id));
  const count = (value: number) => value.toLocaleString(i18n.language);

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
                  {words("games", { count: source.count, formatted: count(source.count) })}
                </Typography>
              </Box>
              <IconAction
                label={words("moveUp", { name: source.name })}
                onClick={() => onSourcesChange(moved(sources, index, index - 1))}
                disabled={disabled || index === 0}
                testId={`${testId}-up-${source.id}`}
              >
                <ArrowUpwardRoundedIcon fontSize="small" />
              </IconAction>
              <IconAction
                label={words("moveDown", { name: source.name })}
                onClick={() => onSourcesChange(moved(sources, index, index + 1))}
                disabled={disabled || index === sources.length - 1}
                testId={`${testId}-down-${source.id}`}
              >
                <ArrowDownwardRoundedIcon fontSize="small" />
              </IconAction>
              <IconAction
                label={words("remove", { name: source.name })}
                onClick={() => onSourcesChange(sources.filter((each) => each.id !== source.id))}
                disabled={disabled || atMinimum}
                testId={`${testId}-remove-${source.id}`}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconAction>
            </Box>
          ))}
        </Box>
        {sources.length === MIN_MERGE_SOURCES && (
          <Typography variant="caption" sx={{ color: "text.secondary" }} data-testid={`${testId}-minimum`}>
            {words("minimum")}
          </Typography>
        )}
        {addable.length > 0 && (
          <SelectAutocomplete
            label={words("add")}
            value={null}
            onChange={(id) => {
              const chosen = addable.find((candidate) => candidate.id === id);
              if (chosen !== undefined) onSourcesChange([...sources, { id: chosen.id, name: chosen.name, count: chosen.count }]);
            }}
            options={addable.map((candidate) => ({
              value: candidate.id,
              label: `${candidate.name} — ${words("games", { count: candidate.count, formatted: count(candidate.count) })}`,
              group: words(candidate.builtIn ? "builtIn" : "yours"),
            }))}
            placeholder={words("addPlaceholder")}
            maxShown={200}
            disabled={disabled}
            testId={`${testId}-add`}
          />
        )}
      </SettingsSection>

      <SettingsSection title={words("dedupe")} testId={`${testId}-dedupe-section`}>
        <RadioGroupField<CollectionMergeDedupe>
          label={words("dedupe")}
          options={COLLECTION_MERGE_DEDUPE_MODES.map((mode) => ({
            value: mode,
            label: (
              <>
                {words(`dedupeModes.${mode}`)}
                <Box component="span" sx={{ display: "block", typography: "caption", color: "text.secondary", mb: 0.5 }}>
                  {words(MODE_HELP[mode])}
                </Box>
              </>
            ),
          }))}
          value={settings.dedupe}
          onChange={(dedupe) => onChange({ dedupe })}
          disabled={disabled}
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
          disabled={disabled}
          dir="auto"
          testId={`${testId}-name`}
        />
      </SettingsSection>
    </Box>
  );
}

export default CollectionMergeForm;
