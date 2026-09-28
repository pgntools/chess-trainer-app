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
  /** Open it — or give a `link`. */
  onOpen?: () => void;
  link?: LinkTarget;
  /** The square's accessible name ("Open Najdorf"). */
  openLabel: string;
  /** The record's actions (`IconAction`s). */
  actions?: ReactNode;
  pick?: { checked: boolean; onToggle: () => void; label: string };
  /** The card's test id; the parts are `-open`, `-name` and `-pick`. */
  testId: string;
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
