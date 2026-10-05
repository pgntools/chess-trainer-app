import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { LabelChip } from "../../design-system/components/tables";
import type { AppLanguage } from "../../i18n";
import { InLanguage } from "../../theme/InLanguage";

type ArticleHeaderProps = {
  /** The article's title in the language it is shown in. */
  title: string;
  /** That language — English where the reader's has no title (CTA-135): the heading is then marked `lang="en"`. */
  titleLanguage?: AppLanguage;
  /** Its frontmatter's `draft`: a chip beside the title. Only `yarn dev` lists a draft. */
  draft?: boolean;
  /** `YYYY-MM-DD` — published; a line under the title. */
  date?: string;
  /** `YYYY-MM-DD` — last updated; on the same line. */
  updated?: string;
  /** Beside the title, after the chip — the dev-only edit link. */
  action?: ReactNode;
};

/** `2026-09-14` as the reader's language writes a date — "14 Sept 2026", "14 בספט׳ 2026". */
const formatDate = (date: string, language: string): string =>
  new Intl.DateTimeFormat(language, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

/**
 * **An article's header** (CTA-135) — its title as the page's `h1`, a
 * *Draft* chip when it is one, and the line of its dates under it: what a
 * Blog article's page, the front page and the MDX editor's preview each draw
 * above the document, from the article's frontmatter. No margin of its own:
 * each place spaces it as it did its title.
 */
export function ArticleHeader({ title, titleLanguage, draft = false, date, updated, action }: ArticleHeaderProps) {
  const { t, i18n } = useTranslation();
  const dates = [
    ...(date === undefined ? [] : [t("blog.published", { date: formatDate(date, i18n.language) })]),
    ...(updated === undefined ? [] : [t("blog.updated", { date: formatDate(updated, i18n.language) })]),
  ];
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          <InLanguage language={titleLanguage}>{title}</InLanguage>
        </Typography>
        {draft && <LabelChip label={t("blog.draft")} tone="warning" testId="article-draft" />}
        {action}
      </Box>
      {dates.length > 0 && (
        <Typography variant="body2" color="text.secondary" data-testid="article-dates" sx={{ mt: 0.5 }}>
          {dates.join(" · ")}
        </Typography>
      )}
    </Box>
  );
}
