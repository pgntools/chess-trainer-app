import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import { useTranslation } from "react-i18next";

import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { IconAction } from "../../../design-system/components/toolbars";

/** One link, as the Project's screen shows it: the Project at its other end and where that is. */
export type ProjectLinkRow = { linkId: string; name: string; link: LinkTarget };

export type ProjectLinksProps = {
  /** The Projects this one links to. */
  linksTo: readonly ProjectLinkRow[];
  /** The Projects linking to this one. */
  linkedFrom: readonly ProjectLinkRow[];
  /** Unlink — the screen's store write. */
  onUnlink: (row: ProjectLinkRow) => void;
  /** The root; the two lists `-to` and `-from`, a row `-<to|from>-<linkId>`, its Unlink `-<to|from>-<linkId>-unlink`. */
  testId: string;
};

/**
 * **A Project's links** (CTA-188) — the Project screen's two lists: the
 * Projects it **links to** and the ones **linked from** it, each a link to
 * that Project and an **Unlink** named for it. A link is made by a Jobs V2
 * popup filing its results in a linked Project; a richer linking screen is a
 * later issue. Nothing at all while the Project has none.
 *
 * Presentational: the rows and Unlink are props; the screen reads and writes
 * the links' store. Its words are `analysisV2.links.*`.
 */
function ProjectLinks({ linksTo, linkedFrom, onUnlink, testId }: ProjectLinksProps) {
  const { t } = useTranslation();
  if (linksTo.length === 0 && linkedFrom.length === 0) return null;

  const list = (side: "to" | "from", rows: readonly ProjectLinkRow[]) => (
    <Box component="section" aria-labelledby={`${testId}-${side}-title`} data-testid={`${testId}-${side}`} sx={{ minWidth: 0 }}>
      <Typography id={`${testId}-${side}-title`} component="h2" variant="subtitle2" sx={{ fontWeight: 700 }}>
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
              <Link {...(linkProps(row.link) as Record<string, unknown>)} underline="hover" dir="auto" sx={{ overflowWrap: "anywhere" }}>
                {row.name}
              </Link>
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
    <Box data-testid={testId} sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      {list("to", linksTo)}
      {list("from", linkedFrom)}
    </Box>
  );
}

export default ProjectLinks;
