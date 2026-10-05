/**
 * **Whether the MDX editor is in this build** (CTA-137) — only under
 * `yarn mdx-editor:start` (`server/start.ts` runs Vite with
 * `VITE_MDX_EDITOR=1`), never in plain `yarn dev`, never in a production
 * build: `import.meta.env.DEV` is the literal `false` there, so its routes
 * and its sidebar folder are dropped with the code.
 * The one switch the rest of the app reads.
 */
export const MDX_EDITOR_ENABLED: boolean = import.meta.env.DEV && import.meta.env.VITE_MDX_EDITOR === "1";
