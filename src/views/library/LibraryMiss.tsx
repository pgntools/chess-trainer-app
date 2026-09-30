import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";

import { MissState } from "../../design-system/components/states";

/**
 * A Library path that names nothing — a collection that is not there (a
 * deleted upload, an old link), or a game number past its end. Says which,
 * and links back to the Library: the design system's `MissState` (CTA-113).
 */
function LibraryMiss({ what }: { what: "collection" | "game" }) {
  const { t } = useTranslation();
  return (
    <MissState
      backLabel={t("library.notFound.back")}
      backLink={{ component: RouterLink, to: "/library" }}
      testId="library-not-found"
    >
      {t(`library.notFound.${what}`)}
    </MissState>
  );
}

export default LibraryMiss;
