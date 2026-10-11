type Rect = {
    width: number,
    height:number
}

/**
 * The app version, injected by Vite's `define` (see vite.config.ts) from
 * package.json `"version"` at build time. Updated by the CTA-5 release
 * automation's version bump with no code change.
 */
declare const __APP_VERSION__: string;

/**
 * Whether the build has the legal pages — its site operator configured
 * (CTA-182). Vite's `define` (vite.config.ts); read through
 * `views/legal/legalPagesShown.ts`.
 */
declare const __LEGAL_PAGES__: boolean;
