import { useCallback } from "react";
import Box from "@mui/material/Box";
import { useSearchParams } from "react-router";

import { useOwnPageHeading } from "../../views/main/pageTitle";
import MdxEditor from "./MdxEditor";

/**
 * Layout-only wrapper, as on every other screen — the dev-only MDX editor
 * (`/dev/mdx-editor`): an article's MDX beside its live rendering. Reached
 * only through `routes.tsx`'s Development routes, so it — and the MDX
 * compiler it loads — never ships.
 *
 * `?article=<file>` (an article's edit icon, `../ArticleEditLink`)
 * opens that article file; once it is open the parameter is dropped, so a
 * reload keeps the edited draft rather than opening the article afresh.
 */
const Main = () => {
  const [params, setParams] = useSearchParams();
  // The editor's own title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  const arriving = params.get("article") ?? undefined;
  const arrived = useCallback(
    () =>
      setParams(
        (before) => {
          const next = new URLSearchParams(before);
          next.delete("article");
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return (
    <Box data-testid="mdx-editor-wrapper" sx={{ height: { md: "100%" } }}>
      <MdxEditor arrivingArticle={arriving} onArrived={arrived} />
    </Box>
  );
};

export default Main;
