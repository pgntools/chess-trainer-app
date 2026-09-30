import { describe, expect, it } from "vitest";

/*
  The house rules every tier of the component hierarchy keeps (CTA-108,
  CTA-110 — docs/design/hierarchy.md), checked over the source itself. Each
  tier's `conventions.test.ts` globs its own files as text and calls this:

    - every component is a folder of its files — the component, its test, its
      gallery, its index (and a block's fixtures) — re-exported from its
      section's (a family's) `index.ts`;
    - every section registered is filled (a family may wait for its first block);
    - it takes a `testId`;
    - it draws no colour literal and uses no physical side, no literal
      `transition`, and a `:focus-visible` it writes spreads the theme's ring;
    - its gallery shows at least one demo;
    - it has its entry in the docs — a heading in its section's doc (base,
      patterns), a row of the Blocks table (blocks);
    - a block's fixtures are imported by its gallery and its test only.

  What nothing here checks is docs/design/adding-a-component.md's "by review".
*/

type TierRules = {
  /** "base", "patterns", "blocks" — the describe's name. */
  tier: string;
  /** Every source file of the tier, by path relative to the tier's folder (`./tables/DataTable/DataTable.tsx`), as text. */
  sources: Record<string, string>;
  /** The tier's registry. */
  sections: readonly { id: string }[];
  /** Every registered section must hold a component (the base and patterns tiers; not the families). */
  everySectionFilled: boolean;
  /** The component folder holds a `fixtures.ts`, imported only by its gallery and its test (the blocks). */
  fixtures: boolean;
  /** Where the tier documents its components (`docs/design/`), as text. */
  docs: {
    /** The doc files by glob path (`../../../docs/design/sections/tabs.md`). */
    sources: Record<string, string>;
    /** The path, from `docs/design/`, of the file a section's components are documented in. */
    file: (section: string) => string;
    /** A heading per component (`## PanelTabs`), or a row of a table (`| \`FolderTree\` | trees | … |`). */
    form: DocEntryForm;
  };
};

export type DocEntryForm = "heading" | "row";

const isTest = (path: string) => /\.test\.tsx?$/.test(path);
const withoutComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

/**
 * **Whether a doc has a component's entry** (CTA-117): a heading naming it
 * (`## PanelTabs`, any depth from `##`), or a table row whose *first cell*
 * names it in backticks (`| \`FolderTree\` | trees | … |`, several to a cell
 * allowed) — a mention in prose, or in another column, is not an entry.
 */
export const hasDocEntry = (doc: string, name: string, form: DocEntryForm): boolean =>
  form === "heading"
    ? new RegExp(`^#{2,4}\\s+.*\\b${name}\\b`, "m").test(doc)
    : new RegExp(`^\\|[^|]*\`${name}\`[^|]*\\|`, "m").test(doc);

/** A literal `transition: "…"` — motion must go through `theme.transitions`, which reduced motion stops. */
export const hasLiteralTransition = (code: string): boolean => /\btransition\s*:\s*["'`]/.test(withoutComments(code));

/** A `:focus-visible` rule in a file that never mentions the theme's `focusRing`. */
export const hasOwnFocusStyle = (code: string): boolean => {
  const text = withoutComments(code);
  return /focus-visible/.test(text) && !/focusRing/.test(text);
};

export const describeTierConventions = ({ tier, sources, sections, everySectionFilled, fixtures, docs }: TierRules) => {
  const files = Object.keys(sources);
  /** `./<section>/<Name>/…` → the component folders. */
  const folders = [
    ...new Set(files.map((path) => path.split("/")).filter((parts) => parts.length === 4).map((parts) => `${parts[1]}/${parts[2]}`)),
  ];
  const code = files.filter((path) => !isTest(path) && !path.endsWith("conventions.ts"));

  describe(`the ${tier} tier's components`, () => {
    it("exist", () => {
      expect(folders.length).toBeGreaterThan(0);
    });

    if (everySectionFilled) {
      it.each(sections.map((section) => section.id))("fill section %s", (id) => {
        expect(folders.filter((folder) => folder.startsWith(`${id}/`)).length).toBeGreaterThan(0);
      });
    }

    it.each(folders)("%s sits in a registered section", (folder) => {
      expect(sections.map((section) => section.id)).toContain(folder.split("/")[0]);
    });

    it.each(folders)("%s is a folder of its files — the component, its test, its gallery, its index", (folder) => {
      const name = folder.split("/")[1];
      const has = (file: string) => files.includes(`./${folder}/${file}`);
      expect(has(`${name}.tsx`) || has(`${name}.ts`), `${name}.tsx`).toBe(true);
      expect(has(`${name}.test.tsx`) || has(`${name}.test.ts`), `${name}.test.tsx`).toBe(true);
      expect(has(`${name}.gallery.tsx`), `${name}.gallery.tsx`).toBe(true);
      expect(has("index.ts"), "index.ts").toBe(true);
      if (fixtures) expect(has("fixtures.ts"), "fixtures.ts").toBe(true);
    });

    it.each(folders)("%s is re-exported from its section's index", (folder) => {
      const [section, name] = folder.split("/");
      expect(sources[`./${section}/index.ts`]).toContain(`export * from "./${name}";`);
    });

    it.each(folders.filter((folder) => !folder.split("/")[1].startsWith("use")))("%s takes a testId", (folder) => {
      const name = folder.split("/")[1];
      expect(sources[`./${folder}/${name}.tsx`]).toMatch(/\btestId\??:/);
    });

    it.each(code)("%s draws no colour literal", (path) => {
      expect(withoutComments(sources[path])).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/);
    });

    it.each(code)("%s uses no physical side", (path) => {
      const text = withoutComments(sources[path]);
      expect(text).not.toMatch(/\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeft|borderRight|ml|mr|pl|pr)\s*:/);
      expect(text).not.toMatch(/textAlign:\s*"(left|right)"/);
    });

    it.each(code)("%s writes no literal transition", (path) => {
      expect(hasLiteralTransition(sources[path]), "use theme.transitions.create(…)").toBe(false);
    });

    it.each(code)("%s draws no focus ring of its own", (path) => {
      expect(hasOwnFocusStyle(sources[path]), "spread theme.mixins.focusRing under &:focus-visible").toBe(false);
    });

    it.each(folders)("%s has a gallery demo", (folder) => {
      const name = folder.split("/")[1];
      expect(sources[`./${folder}/${name}.gallery.tsx`]).toMatch(/\bname:\s*["'`]/);
    });

    it.each(folders)("%s has its entry in the docs", (folder) => {
      const [section, name] = folder.split("/");
      const file = docs.file(section);
      const doc = Object.entries(docs.sources).find(([path]) => path.endsWith(`/${file}`))?.[1];
      expect(doc, `docs/design/${file} (the file of ${section}'s components) exists`).toBeDefined();
      expect(
        hasDocEntry(doc ?? "", name, docs.form),
        docs.form === "heading" ? `docs/design/${file} has a heading naming ${name}` : `docs/design/${file} has a table row naming ${name}`,
      ).toBe(true);
    });

    if (fixtures) {
      it.each(code.filter((path) => !path.endsWith(".gallery.tsx") && !path.endsWith("/fixtures.ts")))(
        "%s imports no fixtures — only a gallery and a test do",
        (path) => {
          expect(withoutComments(sources[path])).not.toMatch(/from\s+["'][^"']*fixtures["']/);
        },
      );
    }
  });
};
