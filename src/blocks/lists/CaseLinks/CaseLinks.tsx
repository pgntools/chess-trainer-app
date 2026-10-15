import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import AddLinkRoundedIcon from "@mui/icons-material/AddLinkRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { StatusText } from "../../../design-system/components/feedback";
import { IconAction } from "../../../design-system/components/toolbars";

/** One link, as a Case's Info tab shows it: the Case at its other end, its Project, and where that Case is. */
export type CaseLinkRow = { linkId: string; name: string; projectName: string; link: LinkTarget };

export type CaseLinksProps = {
  /** The Cases this one links to. */
  linksTo: readonly CaseLinkRow[];
  /** The Cases linking to this one. */
  linkedFrom: readonly CaseLinkRow[];
  /** Unlink — the screen's store write. */
  onUnlink: (row: CaseLinkRow) => void;
  /** Link a case — the screen's picker. Absent, no such button. */
  onLink?: () => void;
  /** Why the last Unlink was refused — said under the lists. */
  problem?: string;
  /**
   * Keep the heading for a screen reader but out of sight — under a title that
   * already says "Linked cases" (the Case view's dialog, CTA-211). Absent, shown.
   */
  titleHidden?: boolean;
  /**
   * The root; the heading `-title`, Link a case `-link`, none `-empty`, the
   * two lists `-to` and `-from`, a row `-<to|from>-<linkId>`, its Unlink
   * `-<to|from>-<linkId>-unlink`, a refusal `-problem`.
   */
  testId: string;
};

/**
 * **A Case's links** (CTA-188) — in its Linked cases dialog (`CaseDetails`' Info tab, CTA-211): the Cases it
 * **links to** and the ones **linked from** it, across Projects — each a link
 * to that Case with its Project's name, and an **Unlink** named for it — and
 * **Link a case**, the screen's picker. A Jobs V2 computer analysis links its
 * source to every new Case it makes. None: a line saying so.
 *
 * Presentational: the rows, Unlink and Link a case are props; the screen
 * reads and writes the links' store. Its words are `analysisV2.links.*`.
 */
function CaseLinks({ linksTo, linkedFrom, onUnlink, onLink, problem, titleHidden = false, testId }: CaseLinksProps) {
  const { t } = useTranslation();
  const none = linksTo.length === 0 && linkedFrom.length === 0;

  const list = (side: "to" | "from", rows: readonly CaseLinkRow[]) => (
    <Box component="section" aria-labelledby={`${testId}-${side}-title`} data-testid={`${testId}-${side}`} sx={{ minWidth: 0 }}>
      <Typography id={`${testId}-${side}-title`} component="h4" variant="body2" sx={{ fontWeight: 700 }}>
        {t(side === "to" ? "analysisV2.links.to" : "analysisV2.links.from")}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("analysisV2.links.none")}
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {rows.map((row) => (
            <Box
              component="li"
              key={row.linkId}
              data-testid={`${testId}-${side}-${row.linkId}`}
              sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Link {...(linkProps(row.link) as Record<string, unknown>)} underline="hover" dir="auto" sx={{ overflowWrap: "anywhere" }}>
                  {row.name}
                </Link>
                <Typography variant="caption" component="div" dir="auto" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>
                  {row.projectName}
                </Typography>
              </Box>
              <IconAction label={t("analysisV2.links.unlink", { name: row.name })} onClick={() => onUnlink(row)} testId={`${testId}-${side}-${row.linkId}-unlink`}>
                <LinkOffRoundedIcon fontSize="small" />
              </IconAction>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Typography id={`${testId}-title`} component="h3" variant="subtitle2" sx={titleHidden ? visuallyHidden : { fontWeight: 700 }}>
          {t("analysisV2.links.title")}
        </Typography>
        {onLink !== undefined && (
          <Button size="small" variant="outlined" startIcon={<AddLinkRoundedIcon />} onClick={onLink} data-testid={`${testId}-link`}>
            {t("analysisV2.links.link")}
          </Button>
        )}
      </Box>
      {none ? (
        <Typography variant="body2" data-testid={`${testId}-empty`} sx={{ color: "text.secondary" }}>
          {t("analysisV2.links.empty")}
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {list("to", linksTo)}
          {list("from", linkedFrom)}
        </Box>
      )}
      {problem !== undefined && (
        <StatusText tone="error" testId={`${testId}-problem`}>
          {problem}
        </StatusText>
      )}
    </Box>
  );
}

export default CaseLinks;
