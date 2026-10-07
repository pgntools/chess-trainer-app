import Box from "@mui/material/Box";
import { useColorScheme } from "@mui/material/styles";
import { useParams } from "react-router";

import DesignGallery from "../../../design-system/gallery/DesignGallery";
import { useThemeChoice } from "../../../theme/themeChoice";
import { useOwnPageHeading } from "../../main/pageTitle";
import { blocksTier } from "./blocksTier";

/** A page — `/dev/design/<section>/<component>`, `/dev/design/<tier>/<section>/<component>`. */
const sectionPath = (page: string) => `/dev/design/${page.split("/").map(encodeURIComponent).join("/")}`;

const TIERS = [blocksTier];

/**
 * Layout-only wrapper, as on every other screen — the dev-only design gallery
 * (`/dev/design/<section>`, CTA-107), one page per section of each tier —
 * Base, Patterns and Blocks (CTA-110) — opened on the reader's own theme and
 * scheme. `/dev/design` and an unknown page land on the first. Reached only
 * through `routes.tsx`'s Development routes, so it never ships.
 */
const Main = () => {
  const page = useParams()["*"]?.replace(/\/+$/, "");
  const { themeId } = useThemeChoice();
  const { mode, systemMode } = useColorScheme();
  const resolved = systemMode ?? mode;
  // The gallery's own title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  return (
    <Box data-testid="design-gallery-wrapper" sx={{ height: "100%" }}>
      <DesignGallery
        section={page === "" ? undefined : page}
        sectionPath={sectionPath}
        startPath="/dev/design"
        tiers={TIERS}
        initialThemeId={themeId}
        initialMode={resolved === "dark" ? "dark" : "light"}
      />
    </Box>
  );
};

export default Main;
