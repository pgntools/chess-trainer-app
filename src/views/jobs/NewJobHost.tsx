import { useMemo, useState } from "react";
import { useHref, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { EntityRef } from "@pgntools/jobs-runtime";

import { NewJobFrame, type NewJobKindOption } from "../../blocks/dialogs";
import { useSnackbar } from "../../design-system/components/feedback";
import { jobKindLocaleKey } from "../../lib/jobs/kinds";
import { jobRuntime } from "../../lib/jobs/runtime";
import { kindViewsOf } from "./kindViews";
import { jobPath } from "./paths";

/** What New job was opened for: its subjects, and what the screen knows that the store does not. */
export type NewJobRequest = { subjects: readonly EntityRef[]; context?: unknown };

/** The dialog — the kinds offered, the chosen kind's form. */
function NewJobHost({ request, onClose, testId }: { request: NewJobRequest | null; onClose: () => void; testId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const base = useHref("/");
  const { show } = useSnackbar();

  // The request last opened, kept while the dialog fades out — adjusted during render.
  const [shown, setShown] = useState<NewJobRequest | null>(request);
  if (request !== null && request !== shown) setShown(request);
  const subjects = useMemo(() => shown?.subjects ?? [], [shown]);

  /** The kinds whose `appliesTo` holds the subjects' type, each named, those that cannot start here saying why. */
  const optionsFor = (of: readonly EntityRef[]): NewJobKindOption[] => {
    const type = of[0]?.type;
    if (type === undefined) return [];
    return jobRuntime()
      .kindsFor(type)
      .map((kind) => {
        const key = jobKindLocaleKey(kind.id);
        const views = kindViewsOf(kind.id);
        const reason = views.NewJob === undefined ? t("jobs.newJob.noForm") : views.unavailable?.(of, t);
        return {
          id: kind.id,
          name: key === undefined ? kind.id : t(`jobs.kinds.${key}.name`),
          description: key === undefined ? "" : t(`jobs.kinds.${key}.description`),
          ...(reason === undefined ? {} : { disabledReason: reason }),
        };
      });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `optionsFor` reads only `t` and the static registries
  const kinds = useMemo(() => optionsFor(subjects), [subjects, t]);

  const [chosen, setChosen] = useState<string | undefined>();
  // Each opening starts on the first kind that can be started here.
  const [openedFor, setOpenedFor] = useState<NewJobRequest | null>(null);
  if (request !== openedFor) {
    setOpenedFor(request);
    if (request !== null) setChosen(optionsFor(request.subjects).find((kind) => kind.disabledReason === undefined)?.id);
  }
  const kindId = chosen !== undefined && kinds.some((kind) => kind.id === chosen) ? chosen : undefined;
  const Form = kindId === undefined ? undefined : kindViewsOf(kindId).NewJob;

  const started = ({ id, title }: { id: string; title: string }) => {
    onClose();
    const path = jobPath(id);
    show({
      severity: "success",
      duration: 10_000,
      testId: `${testId}-notice`,
      message: t("jobs.queued", { name: title || t("jobs.untitled") }),
      action: {
        label: t("jobs.openJob"),
        onClick: () => navigate(path),
        href: base === "/" ? path : `${base}${path}`,
        testId: `${testId}-open-job`,
      },
    });
  };

  if (Form !== undefined && kindId !== undefined) {
    return (
      <Form
        open={request !== null}
        onClose={onClose}
        onStarted={started}
        subjects={subjects}
        context={shown?.context}
        kinds={kinds}
        kindId={kindId}
        onKindChange={setChosen}
        testId={testId}
      />
    );
  }
  return (
    <NewJobFrame
      open={request !== null}
      onClose={onClose}
      onStart={() => undefined}
      kinds={kinds}
      kindId={kindId}
      onKindChange={setChosen}
      startBlockedNote={kinds.length === 0 ? t("jobs.newJob.noKinds") : t("jobs.newJob.chooseKind")}
      testId={testId}
    />
  );
}

export default NewJobHost;
