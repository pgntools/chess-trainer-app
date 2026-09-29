import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { KeyValueList } from "../../../design-system/components/lists";
import type { Game } from "../../../lib/gameModel";
import { gameInfoRows } from "./gameInfoRows";

export type GameInfoProps = {
  /** The game on the board; `undefined` shows the empty line. */
  game: Game | undefined;
  /** The list's test id; each tag's value is `<testId>-<Tag>`, the empty line `<testId>-empty`. */
  testId: string;
};

/**
 * **A game's tags** (CTA-113; the Library game board's Info tab since
 * CTA-75) — its PGN tag pairs as a `KeyValueList`: the named tags first, in
 * the order the PGN spec prints them and under translated names, then any
 * other tag under its raw name (a PGN may hold any tag, and dropping them
 * would lose what the reader can see in the file). The placeholders `chess.js`
 * fills the seven-tag roster with (`?`, `????.??.??`) read as absent
 * (`gameTag`). Values are Latin text — names, dates, results — pinned left
 * to right.
 *
 * Presentational: the game arrives as a prop. Its words are the game
 * panel's (`gamePanel.info.*`).
 */
function GameInfo({ game, testId }: GameInfoProps) {
  const { t } = useTranslation();
  const rows = game === undefined ? [] : gameInfoRows(game);
  if (rows.length === 0) {
    return (
      <Typography variant="body2" data-testid={`${testId}-empty`} sx={{ color: "text.secondary" }}>
        {t("gamePanel.info.empty")}
      </Typography>
    );
  }
  return (
    <KeyValueList
      ariaLabel={t("gamePanel.info.title")}
      rows={rows.map((row) => ({
        id: row.tag,
        label: row.labelKey === undefined ? row.tag : t(`gamePanel.info.${row.labelKey}`),
        value: row.value,
        dir: "ltr",
      }))}
      testId={testId}
    />
  );
}

export default GameInfo;
