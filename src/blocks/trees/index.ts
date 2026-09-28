/**
 * **The Trees family's public surface** (CTA-110) — a screen imports this
 * family's blocks from here and nowhere deeper. Every block here is a
 * `TreeView` (the Trees pattern) over one of the app's own shapes; the
 * sidebar's navigation tree is the first such tree the app had.
 */
export * from "./FolderTree";
