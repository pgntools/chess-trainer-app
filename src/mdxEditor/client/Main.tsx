import { useCallback } from "react";
import Box from "@mui/material/Box";
import { useSearchParams } from "react-router";

import { useOwnPageHeading } from "../../views/main/pageTitle";
import MdxEditor from "./MdxEditor";

/**
 * Layout-only wrapper, as on every other screen — the MDX editor
 * (`/dev/mdx-editor/edit`): an article's MDX beside its live rendering.
 * Reached only through `routes.tsx`'s Development routes under
 * `yarn mdx-editor:start`, so it — and the MDX compiler it loads — never
 * ships.
 *
 * `?article=<file>` (the lobby's Edit) opens that article file, `?new` (the lobby's New article)
 * starts a new one; once done the parameter is dropped, so a reload keeps
 * the edited draft rather than opening it afresh.
 */
const Main = () => {
  const [params, setParams] = useSearchParams();
  // The editor's own title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  const arriving = params.get("article") ?? undefined;
  const arrivingNew = params.has("new");
  const arrived = useCallback(
    () =>
      setParams(
        (before) => {
          const next = new URLSearchParams(before);
          next.delete("article");
          next.delete("new");
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return (
    <Box data-testid="mdx-editor-wrapper" sx={{ height: { md: "100%" } }}>
      <MdxEditor arrivingArticle={arriving} arrivingNew={arrivingNew} onArrived={arrived} />
    </Box>
  );
};

export default Main;
