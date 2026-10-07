/*
  **Cross-origin isolation** (CTA-154) — the two response headers that make a
  page `crossOriginIsolated`, which `SharedArrayBuffer` (and so the
  multi-thread Stockfish build, `src/lib/engines/`) needs. One definition, read
  by the pre-render (written into `staticwebapp.config.json`'s
  `globalHeaders`), by `yarn check:pages` (which holds `dist/` to it) and by
  `vite.config.ts` (`vite preview` serves them under `DEPLOY_TARGET=swa`, so the
  browser pass runs the page as chessapp.dev serves it).

  - **`COEP: require-corp`, not `credentialless`.** Safari has no
    `credentialless`; `require-corp` works everywhere. The app loads nothing
    cross-origin as a sub-resource (its fonts, images, pieces and the Stockfish
    worker and `.wasm` are all same-origin; a link to another site is a
    navigation, which COEP does not touch), so the stricter value costs
    nothing — and `check:pages` fails the build if a page ever does.
  - GitHub Pages cannot set headers: its build writes none, the page is not
    isolated there, and the registry lists the multi-thread build disabled.
*/

/** What the Azure Static Web Apps host sends with every response. */
export const CROSS_ORIGIN_ISOLATION_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};
