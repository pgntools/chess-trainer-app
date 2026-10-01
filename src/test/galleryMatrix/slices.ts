/*
  The gallery's axe matrix in slices (CTA-123). A file's tests run one after
  another, so a matrix in one file is as slow as all of it together — the
  Blocks tier's page alone was twenty minutes of one CI job. Cut into files,
  it runs on every worker locally and over several jobs nightly
  (`.github/workflows/nightly.yml`).

  A slice is a file, `<tier>.<n>.matrix.test.tsx`, calling its tier's matrix
  with `n`; it takes every `count`-th combination, so one page's themes land in
  different slices and a slow page does not make a slow file. `slices.test.ts`
  holds the files on disk to these counts, so no combination goes unrun.
*/

/** How many slice files each tier's matrix is cut into. */
export const MATRIX_SLICES = { designSystem: 6, blocks: 8 } as const;

/** The combinations slice `slice` (1-based) of `count` runs. */
export function sliceOf<T>(combos: readonly T[], slice: number, count: number): T[] {
  if (!Number.isInteger(slice) || slice < 1 || slice > count) throw new RangeError(`slice ${slice} is not one of 1..${count}`);
  return combos.filter((_, index) => index % count === slice - 1);
}
