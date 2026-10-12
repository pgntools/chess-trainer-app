import List from "@mui/material/List";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DriveFileMoveRoundedIcon from "@mui/icons-material/DriveFileMoveRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { RecordRow } from "../../../design-system/components/lists";
import { EmptyState } from "../../../design-system/components/states";
import { IconAction } from "../../../design-system/components/toolbars";
import type { AnalysisCase } from "../../../lib/analysisProjects";
import { savedListDate, savedListLine } from "../../../lib/savedListCaption";
import { caseDisplayName } from "./caseName";

/** What a Case's row can do. */
export type CaseAction = "rename" | "move" | "duplicate" | "delete";

export type CasesListProps = {
  /** The Project's Cases, in the order to show them. */
  cases: readonly AnalysisCase[];
  /** Where a Case's row goes — its board. */
  caseLink: (caseId: string) => LinkTarget;
  onCaseAction: (action: CaseAction, record: AnalysisCase) => void;
  /** Moving a Case needs another Project to go to — off while there is none. */
  canMove?: boolean;
  /**
   * The prefix of its ids: the list `<testId>`, a Case's row
   * `<testId>-case-<id>` (its open `-open`, its actions
   * `<testId>-case-<action>-<id>`), the empty line `<testId>-empty`.
   */
  testId: string;
};

const ACTIONS: readonly { action: CaseAction; icon: typeof DeleteOutlineRoundedIcon }[] = [
  { action: "rename", icon: DriveFileRenameOutlineRoundedIcon },
  { action: "move", icon: DriveFileMoveRoundedIcon },
  { action: "duplicate", icon: ContentCopyRoundedIcon },
  { action: "delete", icon: DeleteOutlineRoundedIcon },
];

/**
 * **A Project's Cases** (CTA-186) — each a row to its board, named (its own
 * name, else derived from its game or position: `caseDisplayName`), its type
 * (Game / Position) and when it last changed under it, with its actions —
 * rename, move to another Project, duplicate, delete. Presentational: the
 * Cases, the links and the callbacks are props; its words are the app's
 * (`analysisV2.*`).
 */
function CasesList({ cases, caseLink, onCaseAction, canMove = true, testId }: CasesListProps) {
  const { t, i18n } = useTranslation();
  if (cases.length === 0) {
    return <EmptyState testId={`${testId}-empty`}>{t("analysisV2.case.empty")}</EmptyState>;
  }
  return (
    <List disablePadding aria-label={t("analysisV2.case.listLabel")} data-testid={testId}>
      {cases.map((record) => {
        const name = caseDisplayName(record, t);
        return (
          <RecordRow
            key={record.id}
            name={name}
            caption={savedListLine([
              t(record.type === "game" ? "analysisV2.case.typeGame" : "analysisV2.case.typePosition"),
              t("analysisV2.browser.updated", { date: savedListDate(record.updatedAt, i18n.language) }),
            ])}
            primaryAction={{
              label: t("analysisV2.case.open"),
              ariaLabel: t("analysisV2.case.openNamed", { name }),
              link: caseLink(record.id),
            }}
            actions={ACTIONS.map(({ action, icon: Icon }) => (
              <IconAction
                key={action}
                label={t(`analysisV2.case.${action}Named`, { name })}
                onClick={() => onCaseAction(action, record)}
                disabled={action === "move" && !canMove}
                color={action === "delete" ? "error" : "default"}
                testId={`${testId}-case-${action}-${record.id}`}
              >
                <Icon fontSize="small" />
              </IconAction>
            ))}
            testId={`${testId}-case-${record.id}`}
          />
        );
      })}
    </List>
  );
}

export default CasesList;
