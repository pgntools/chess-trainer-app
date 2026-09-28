import type { ReactNode } from "react";

import type { LinkTarget } from "../../link";
import { CardShell } from "../cardShell";

export type RecordCardProps = {
  /** What fills the square — a preview board. */
  preview: ReactNode;
  /** The record's name — a reader's words, `dir="auto"`. */
  name: ReactNode;
  /** The line under it ("Sicilian · 24 moves"). */
  caption?: ReactNode;
  /** A third line (CTA-113) — see `FolderCard`'s, which a grid gives too so its cards stay one height. */
  detail?: ReactNode;
  /** Open it — or give a `link`. With neither, the preview is not a button (a record that will not read). */
  onOpen?: () => void;
  link?: LinkTarget;
  /** The square's accessible name ("Open Najdorf"). */
  openLabel: string;
  /** The record's actions (`IconAction`s). */
  actions?: ReactNode;
  pick?: { checked: boolean; onToggle: () => void; label: string };
  /** The card's test id; the parts are `-open`, `-name` and `-pick`. */
  testId: string;
  /** The square's own test id, for a screen whose tests named it before it moved onto this card (CTA-113). */
  openTestId?: string;
  /** The pick's and the name's own test ids (CTA-113). */
  pickTestId?: string;
  nameTestId?: string;
};

/**
 * **A saved record as a card** (CTA-108) — a saved analysis, a repertoire:
 * the preview in a square that opens it, the name and its line under it, the
 * actions and the pick. The two saved lists' cards, as one.
 */
function RecordCard({ preview, ...props }: RecordCardProps) {
  return <CardShell square={preview} {...props} />;
}

export default RecordCard;
