/**
 * Every flag of the `flag-icons` package (MIT), 4:3, by its code (`"de"`,
 * `"gb-eng"`) — each its own file, fetched only when a flag shows: `no-inline`
 * keeps Vite from writing a small one into the script, and `url` makes each
 * entry a string, so this map is all a page carries until then.
 */
export const FLAG_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("/node_modules/flag-icons/flags/4x3/*.svg", { eager: true, query: "?url&no-inline", import: "default" }),
  ).map(([path, url]) => [path.split("/").pop()!.replace(/\.svg$/, ""), url]),
);
