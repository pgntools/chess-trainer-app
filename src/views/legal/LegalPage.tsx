import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { asAppLanguage } from "../../i18n";
import { ForceLTR } from "../../theme/ForceLTR";
import { mdxComponents } from "../home/frontPage";
import { useOwnPageHeading } from "../main/pageTitle";
import { legalDocument, type LegalPageId } from "./legalDocuments";

/**
 * **A legal page** (CTA-159) — `/privacy` and `/cookies`: the page's name as
 * its one `h1` (`pages.<id>`, the same words as its footer link and its
 * title), then its MDX document, rendered with the same components as a Blog
 * article (`mdxComponents`, so a link to a path of the app is a router link).
 * Its route is an `ARTICLE_ROUTE`: the shell gives it the readable column.
 * A language with no document would show the English one pinned left to
 * right, as an article does; both are written.
 */
const LegalPage = ({ page }: { page: LegalPageId }) => {
  const { t, i18n } = useTranslation();
  const language = asAppLanguage(i18n.language);
  const { Content, language: documentLanguage } = legalDocument(page, language);
  useOwnPageHeading();

  const body = (
    <Suspense
      fallback={
        <Typography role="status" color="text.secondary">
          {t("blog.loading")}
        </Typography>
      }
    >
      <Content components={mdxComponents} />
    </Suspense>
  );

  return (
    <Box data-testid={`legal-page-${page}`} sx={{ p: 1 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        {t(`pages.${page}`)}
      </Typography>
      {documentLanguage === language ? (
        body
      ) : (
        <ForceLTR>
          <Box lang={documentLanguage}>{body}</Box>
        </ForceLTR>
      )}
    </Box>
  );
};

export default LegalPage;
