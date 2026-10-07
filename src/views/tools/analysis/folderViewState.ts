/**
 * What the reader has done to the panel: folded it to a rail, typed words into
 * its filter, and the tree's folders opened or closed by hand
 * (`null` until the first — then the chain to the analysis on the board is
 * open) and how many of each folder's analyses are listed (`""`: the top
 * level). The board's route holds it, so it survives stepping to another
 * analysis, which is a new board.
 */
export type FolderViewState = {
  /** Wide: the panel is folded to a rail at the start edge. */
  collapsed: boolean;
  /** The words in the filter box. */
  text: string;
  open: ReadonlySet<string> | null;
  shown: ReadonlyMap<string, number>;
};

export const INITIAL_FOLDER_VIEW: FolderViewState = { collapsed: false, text: "", open: null, shown: new Map() };

