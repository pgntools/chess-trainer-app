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
    - it draws no colour literal and uses no physical side;
    - a block's fixtures are imported by its gallery and its test only.
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
};

const isTest = (path: string) => /\.test\.tsx?$/.test(path);
const withoutComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

export const describeTierConventions = ({ tier, sources, sections, everySectionFilled, fixtures }: TierRules) => {
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
