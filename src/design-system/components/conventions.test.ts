import { describe, expect, it } from "vitest";

import { SECTIONS } from "./sections";

/*
  The components' house rules (CTA-108), checked over the source itself:
  every component is a folder of four files re-exported from its section, it
  draws no colour of its own, it uses no physical side, and it takes a
  `testId`. The gallery's demos are held to the colour and side rules too.
*/

/** Every source file under `components/`, by path relative to this file, as text. */
const sources = import.meta.glob<string>("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true });

const files = Object.keys(sources);
const isTest = (path: string) => /\.test\.tsx?$/.test(path);
/** `./<section>/<Name>/…` → the component folders, one per section entry. */
const folders = [...new Set(files.map((path) => path.split("/")).filter((parts) => parts.length === 4).map((parts) => `${parts[1]}/${parts[2]}`))];

describe("the design system's components", () => {
  it("fill every section", () => {
    for (const { id } of SECTIONS) {
      expect(folders.filter((folder) => folder.startsWith(`${id}/`)).length, id).toBeGreaterThan(0);
    }
  });

  it.each(folders)("%s is a folder of four files — the component, its test, its gallery and its index", (folder) => {
    const name = folder.split("/")[1];
    const has = (file: string) => files.includes(`./${folder}/${file}`);
    expect(has(`${name}.tsx`) || has(`${name}.ts`), `${name}.tsx`).toBe(true);
    expect(has(`${name}.test.tsx`) || has(`${name}.test.ts`), `${name}.test.tsx`).toBe(true);
    expect(has(`${name}.gallery.tsx`), `${name}.gallery.tsx`).toBe(true);
    expect(has("index.ts"), "index.ts").toBe(true);
  });

  it.each(folders)("%s is re-exported from its section's index", (folder) => {
    const [section, name] = folder.split("/");
    expect(sources[`./${section}/index.ts`]).toContain(`export * from "./${name}";`);
  });

  it.each(folders.filter((folder) => !folder.split("/")[1].startsWith("use")))("%s takes a testId", (folder) => {
    const name = folder.split("/")[1];
    expect(sources[`./${folder}/${name}.tsx`]).toMatch(/\btestId\??:/);
  });

  it.each(files.filter((path) => !isTest(path)))("%s draws no colour literal", (path) => {
    const code = sources[path].replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/);
  });

  it.each(files.filter((path) => !isTest(path)))("%s uses no physical side", (path) => {
    const code = sources[path].replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    expect(code).not.toMatch(/\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeft|borderRight|ml|mr|pl|pr)\s*:/);
    expect(code).not.toMatch(/textAlign:\s*"(left|right)"/);
  });
});
