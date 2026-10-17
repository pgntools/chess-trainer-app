/*
  A board's engine controls' sample states (CTA-181). Imported only by the
  block's gallery and its test.
*/

/** The engine off, the eval bar on — a board as it opens. */
export const OFF = { engineOn: false, showEvalBar: true } as const;

/** The engine on, the eval bar off. */
export const ON_NO_BAR = { engineOn: true, showEvalBar: false } as const;
