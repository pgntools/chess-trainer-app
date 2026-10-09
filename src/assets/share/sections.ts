/**
 * **The app's sections, for a shared link's image** (CTA-136) — the chain's
 * `section` level (`src/lib/shareImage.ts`): a page in a section with no
 * image of its own (an app screen, a Blog page with none above it) previews
 * with its section's card. Each card is `<id>.png` in this folder, with
 * `<id>.<lang>.png` beside it for a language; its words are the catalogs'
 * `share.sections.<id>`. `scripts/share-images.mjs` draws them.
 *
 * Read by the pre-render and by `scripts/share-images.mjs`, both in Node — so
 * nothing here imports.
 */

/** Where the section cards and the site's own image are — repository-relative. */
export const SHARE_DIR = "src/assets/share";

/** The site's image — the chain's last level, for a page with nothing nearer. */
export const SITE_SHARE_IMAGE = `${SHARE_DIR}/default.png`;

export type ShareSection = {
  /** The card's file stem and its alt text's key, `share.sections.<id>`. */
  id: "engine" | "analysis" | "openings" | "repertoires" | "library" | "blog" | "settings";
  /** The app paths it holds — each the path itself and everything under it. */
  paths: readonly string[];
};

export const SHARE_SECTIONS: readonly ShareSection[] = [
  { id: "engine", paths: ["/engine"] },
  // The Jobs screen (CTA-173) is the Analysis Board's computer analysis, run in the background.
  { id: "analysis", paths: ["/tools/analysis", "/jobs"] },
  { id: "openings", paths: ["/openings"] },
  { id: "repertoires", paths: ["/repertoires"] },
  { id: "library", paths: ["/library"] },
  { id: "blog", paths: ["/blog"] },
  { id: "settings", paths: ["/settings"] },
];

/** The section an unprefixed app path is in — `/library/tal/` → `library` — or `undefined` (the front page). */
export const shareSectionOf = (appPath: string): ShareSection | undefined =>
  SHARE_SECTIONS.find((section) => section.paths.some((path) => appPath === path || appPath.startsWith(`${path}/`)));

/** A section's card. */
export const shareSectionImage = (section: ShareSection): string => `${SHARE_DIR}/${section.id}.png`;
