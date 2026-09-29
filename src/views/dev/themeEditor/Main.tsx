import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { isThemeId, type ThemeDefinition } from "../../../design-system/themes";
import { useThemeChoice } from "../../../theme/themeChoice";
import { useOwnPageHeading } from "../../main/pageTitle";
import ThemeEditor from "./ThemeEditor";

/**
 * Layout-only wrapper, as on every other screen — the dev-only theme editor
 * (`/dev/theme-editor`, CTA-115), opened on `?theme=<id>` (what
 * `yarn theme:bootstrap` points at) or else the reader's own theme. A
 * registered theme's names come from the catalogs, in English and Hebrew
 * whatever the app's language. Reached only through `routes.tsx`'s
 * Development routes, so it never ships.
 */
const Main = () => {
  const [params] = useSearchParams();
  const { themeId } = useThemeChoice();
  const { i18n } = useTranslation();
  // The editor's own title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  const asked = params.get("theme");
  const namesOf = (definition: ThemeDefinition) => ({
    name: i18n.getFixedT("en")(definition.labelKey),
    nameHe: i18n.getFixedT("he")(definition.labelKey),
  });
  return (
    <Box data-testid="theme-editor-wrapper" sx={{ height: "100%" }}>
      <ThemeEditor initialThemeId={isThemeId(asked) ? asked : themeId} namesOf={namesOf} />
    </Box>
  );
};

export default Main;
