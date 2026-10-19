import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { SelectAutocomplete, type AutocompleteOption } from "../../../design-system/components/autocompletes";
import { FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { StatusText } from "../../../design-system/components/feedback";

/** A Case that may be picked: its Project, its name as shown and its type. */
export type PickableCase = { id: string; projectId: string; name: string; type: "game" | "position" };

export type CasePickerDialogProps = {
  open: boolean;
  /** Every Project by name — those holding a Case to pick are offered. */
  projects: readonly { id: string; name: string }[];
  /** The Cases that may be picked — the screen leaves out the Case itself and the ones it links to already. */
  cases: readonly PickableCase[];
  /** The Project chosen at first — the Case's own, where it has a Case to pick. */
  initialProjectId: string;
  /** The chosen Case; the dialog does not close itself. */
  onSubmit: (caseId: string) => void;
  onClose: () => void;
  busy?: boolean;
  /** Why the last Link was refused — said in the dialog. */
  problem?: string;
  /** The dialog's title — absent, "Link a case" (CTA-238: the Accuracy Trainer's "Pick a case"). */
  title?: string;
  /** The submit's words — absent, "Link" (the Accuracy Trainer's "Load"). */
  submitLabel?: string;
  /** Said when no Case may be picked — absent, "There is no other case to link to." */
  emptyText?: string;
  /**
   * The prefix of its ids: the dialog `<testId>` (FormDialog's `-submit`,
   * `-cancel`), the Project `-project`, the Case `-cases` (their inputs
   * `-project-input`, `-cases-input`), none `-empty`, the refusal `-problem`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

/** At most this many Cases listed at once — typing narrows thousands (CTA-199). */
const CASES_SHOWN = 50;

/** The Case id in what was typed: a Case's address (`…/cases/<id>`, as the address bar shows it) or the text itself. */
const caseIdIn = (text: string): string => {
  const address = /\/cases\/([^/?#\s]+)/.exec(text);
  if (address === null) return text;
  try {
    return decodeURIComponent(address[1]);
  } catch {
    return address[1];
  }
};

/**
 * **A Case to link to** (CTA-188) — a Case's *Link a case* (its Linked cases
 * dialog, CTA-211): two autocompletes, built for hundreds of Projects and thousands of
 * Cases (CTA-199) — a **Project**, typed to find (the Case's own chosen at
 * first; cleared, any Project), then a **Case**, typed to find among that
 * Project's (every Project's, under their names, while none is chosen) — or
 * **found by its id**, or its address pasted, in any Project, which then
 * becomes the chosen one. At most {@link CASES_SHOWN} listed at once.
 * **Link** links the Case on the board to it. Projects with nothing to pick
 * are not offered.
 *
 * Presentational: the Projects, the Cases and the outcome are props; the
 * screen writes the link. Its words are `analysisV2.links.picker.*`.
 */
function CasePickerDialog({
  open,
  projects,
  cases,
  initialProjectId,
  onSubmit,
  onClose,
  busy = false,
  problem,
  title,
  submitLabel,
  emptyText,
  testId,
  dialogProps,
}: CasePickerDialogProps) {
  const { t } = useTranslation();
  const untitled = t("analysisV2.project.untitled");
  const offered = useMemo(
    () =>
      projects
        .filter((project) => cases.some((record) => record.projectId === project.id))
        .map((project) => ({ value: project.id, label: project.name || untitled }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [projects, cases, untitled],
  );
  const firstProject = () => (offered.some((project) => project.value === initialProjectId) ? initialProjectId : null);
  // `null`: any Project.
  const [projectId, setProjectId] = useState<string | null>(firstProject);
  const [chosen, setChosen] = useState<string | null>(null);

  // Opened afresh: the Case's own Project, nothing picked — adjusted during render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setProjectId(firstProject());
      setChosen(null);
    }
  }

  // Every pickable Case, by its Project's name then its own; the Project its group while any Project is open to pick from.
  const projectOf = useMemo(() => new Map(cases.map((record) => [record.id, record.projectId])), [cases]);
  const caseOptions = useMemo((): AutocompleteOption[] => {
    const projectName = new Map(offered.map((project) => [project.value, project.label]));
    return cases
      .map((record) => ({ value: record.id, label: record.name, group: projectName.get(record.projectId) ?? untitled }))
      .sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label))
      .map((option) => (projectId === null ? option : { value: option.value, label: option.label }));
  }, [cases, offered, projectId, untitled]);
  const matchesCase = (option: AutocompleteOption, text: string) => {
    const typed = text.trim();
    // Its id, or its address — found in any Project.
    if (typed !== "" && option.value === caseIdIn(typed)) return true;
    if (projectId !== null && projectOf.get(option.value) !== projectId) return false;
    return option.label.toLocaleLowerCase().includes(typed.toLocaleLowerCase());
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => {
        if (chosen !== null) onSubmit(chosen);
      }}
      title={title ?? t("analysisV2.links.picker.title")}
      submitLabel={submitLabel ?? t("analysisV2.links.picker.submit")}
      cancelLabel={t("analysisV2.cancel")}
      submitDisabled={chosen === null}
      busy={busy}
      testId={testId}
      dialogProps={dialogProps}
    >
      {offered.length === 0 ? (
        <Typography variant="body2" data-testid={`${testId}-empty`} sx={{ color: "text.secondary" }}>
          {emptyText ?? t("analysisV2.links.picker.none")}
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
          <SelectAutocomplete
            label={t("analysisV2.links.picker.project")}
            placeholder={t("analysisV2.links.picker.anyProject")}
            value={projectId}
            onChange={(next) => {
              setProjectId(next);
              if (next !== null && chosen !== null && projectOf.get(chosen) !== next) setChosen(null);
            }}
            options={offered}
            maxShown={CASES_SHOWN}
            testId={`${testId}-project`}
          />
          <SelectAutocomplete
            label={t("analysisV2.links.picker.cases")}
            placeholder={t("analysisV2.links.picker.casesPlaceholder")}
            value={chosen}
            onChange={(next) => {
              setChosen(next);
              // A Case found in another Project makes that one the chosen Project.
              const owner = next === null ? undefined : projectOf.get(next);
              if (owner !== undefined) setProjectId(owner);
            }}
            options={caseOptions}
            matches={matchesCase}
            maxShown={CASES_SHOWN}
            testId={`${testId}-cases`}
          />
          {problem !== undefined && (
            <StatusText tone="error" testId={`${testId}-problem`}>
              {problem}
            </StatusText>
          )}
        </Box>
      )}
    </FormDialog>
  );
}

export default CasePickerDialog;
