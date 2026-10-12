/**
 * **Whether Analysis V2 is in this build** (CTA-186) — dev-only while it is
 * built: its routes, its sidebar folder and its Export / Import category are
 * there under `yarn dev` (and the tests) and nowhere in a production build,
 * where `import.meta.env.DEV` is the literal `false`, so every branch on it is
 * dead code and its modules are left out (`.claude/rules/analysis-v2.md` §1).
 * Shipping the module is this line becoming `true` — and the loader's below.
 */
export const ANALYSIS_PROJECTS_ENABLED: boolean = import.meta.env.DEV;

/**
 * **Analysis V2's stores, for Settings' Export and Import** — the folders,
 * the Projects, the Cases and the links between Cases (CTA-188) — dynamic
 * imports in a build with the module, `undefined` in one without. The
 * condition is `import.meta.env.DEV` itself, inline, not the flag above: Vite
 * writes the literal `false` here in a production build, and a dynamic import
 * in a branch that is dead *as written* is never followed — no chunk of the
 * stores is emitted — where one behind an imported constant still is.
 */
export const analysisProjectStores = async () => {
  if (import.meta.env.DEV) {
    const [folders, projects, cases, links] = await Promise.all([
      import("./analysisProjectFolderStore"),
      import("./analysisProjectStore"),
      import("./analysisCaseStore"),
      import("./analysisCaseLinkStore"),
    ]);
    return { folders, projects, cases, links };
  }
  return undefined;
};
