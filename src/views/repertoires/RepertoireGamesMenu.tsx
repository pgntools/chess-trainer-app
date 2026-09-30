import { useState } from "react";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";

import { AnchoredMenu } from "../../design-system/components/menus";
import { IconAction } from "../../design-system/components/toolbars";
import { REPERTOIRE_GAMES, repertoireGamePath } from "../../lib/repertoireGames";

/**
 * **The games a repertoire can be played as** (CTA-63) — one button and a menu
 * of `REPERTOIRE_GAMES`, on the repertoire's own view and on its row and card
 * in the list: an `IconAction` that says it opens a menu, and an
 * `AnchoredMenu` (CTA-113) hung from it. Each entry is a link, so a game is a
 * URL like any other screen.
 */
function RepertoireGamesMenu({ id, label, testId }: { id: string; label?: string; testId: string }) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconAction
        label={label ?? t("repertoires.games.open")}
        onClick={(event) => setAnchor(event.currentTarget)}
        popupOpen={anchor !== null}
        testId={testId}
      >
        <SportsEsportsRoundedIcon fontSize="small" />
      </IconAction>
      <AnchoredMenu
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        entries={REPERTOIRE_GAMES.map((game) => ({
          id: game,
          label: t(`repertoires.games.${game}.title`),
          link: { component: RouterLink, to: repertoireGamePath(id, game) },
        }))}
        testId={`${testId}-menu`}
        entryTestIdPrefix={testId}
      />
    </>
  );
}

export default RepertoireGamesMenu;
