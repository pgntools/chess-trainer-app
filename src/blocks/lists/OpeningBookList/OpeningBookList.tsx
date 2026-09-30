import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import type { KnownMoveOpening } from "../../../lib/openings";

export type OpeningBookListProps = {
  /** The book's continuations from the position on screen — `useOpeningBookModule`'s. */
  moves: readonly KnownMoveOpening[];
  /** A row was chosen: play its move. */
  onPlay: (san: string) => void;
  /** The row the pointer — or the keyboard's focus — is on, its arrow recoloured; `null` when it leaves. */
  onHover: (move: KnownMoveOpening | null) => void;
  /** The root; the parts are `-list`, `-empty` and `-move-<san>`. */
  testId: string;
};

/**
 * **The book's continuations from the position on screen** (CTA-113; the
 * Openings explorer's Book tab of CTA-78) — every move eco.json names from
 * here, with the opening it leads to and its ECO code. A named list of
 * buttons: a click, Enter or Space plays one, and the row the pointer or the
 * focus is on tells the screen which arrow to recolour.
 *
 * Only the moves the book can name are listed — an off-book move is still
 * playable on the board; it simply is not a book continuation. The SAN, the
 * name and the code stay left to right under Hebrew. Its words are the
 * Openings explorer's (`openings.book.*`).
 */
function OpeningBookList({ moves, onPlay, onHover, testId }: OpeningBookListProps) {
  const { t } = useTranslation();

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 0.5 }}>
      {moves.length === 0 ? (
        <Typography variant="body2" data-testid={`${testId}-empty`} sx={{ color: "text.secondary", px: 1 }}>
          {t("openings.book.empty")}
        </Typography>
      ) : (
        <>
          <Typography variant="caption" sx={{ color: "text.secondary", px: 1 }}>
            {t("openings.book.help")}
          </Typography>
          <List dense disablePadding aria-label={t("openings.book.label")} data-testid={`${testId}-list`}>
            {moves.map((move) => (
              // A list's rows are its items (CTA-113: the buttons sat straight in the list, which axe refuses).
              <ListItem key={move.san} disablePadding>
                <ListItemButton
                  onClick={() => onPlay(move.san)}
                  onMouseEnter={() => onHover(move)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(move)}
                  onBlur={() => onHover(null)}
                  data-testid={`${testId}-move-${move.san}`}
                  sx={(theme) => ({ borderRadius: 0.5, minHeight: 24, "&.Mui-focusVisible": theme.mixins.focusRing })}
                >
                  <ListItemText
                    primary={<bdi dir="ltr">{move.san}</bdi>}
                    secondary={<bdi dir="ltr">{move.opening.name}</bdi>}
                  />
                  <Chip size="small" dir="ltr" label={move.opening.eco} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
}

export default OpeningBookList;
