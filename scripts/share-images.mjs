#!/usr/bin/env node
/*
  **The site's and the sections' share images** (CTA-136) — the last two
  levels of a shared link's image chain (`src/lib/shareImage.ts`): one card per
  section of the app and one for the site, in every language, 1200 × 630,
  written to `src/assets/share/` (`<id>.png`, `<id>.he.png`; `default.png`,
  `default.he.png`). A board beside the section's name and description, in the
  default theme's squares.

  A tool, not a build step: the images are committed, and this makes them
  again after a name, a description or the look changes —

    node scripts/share-images.mjs            # all of them
    node scripts/share-images.mjs --only blog

  The words come from the catalogs (`src/locales/`) — the alt texts beside them
  (`share.*`) describe this layout, so a new layout rewrites those too. It runs
  Playwright's Chromium (`npx playwright install chromium`, once), with the
  machine's fonts: DejaVu Sans carries the pieces and the Hebrew.
*/
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

import en from "../src/locales/en.ts";
import he from "../src/locales/he.ts";
import { SHARE_DIR, SHARE_SECTIONS } from "../src/assets/share/sections.ts";

const CATALOGS = { en, he };
const RTL = new Set(["he"]);

/** Each card's catalog keys: its name and its line. `default` is the site's. */
const CARDS = {
  default: { name: "app.brandText", line: "pageDescriptions.home" },
  engine: { name: "pages.playWithEngine", line: "pageDescriptions.playWithEngine" },
  analysis: { name: "pages.analysisBoard", line: "pageDescriptions.analysisBoard" },
  openings: { name: "pages.openings", line: "pageDescriptions.openings" },
  repertoires: { name: "nav.folders.repertoires", line: "pageDescriptions.repertoires" },
  library: { name: "pages.library", line: "pageDescriptions.library" },
  blog: { name: "pages.blog", line: "pageDescriptions.blog" },
  settings: { name: "pages.settings", line: "pageDescriptions.settings" },
};

const sectionIds = new Set(SHARE_SECTIONS.map((section) => section.id));
for (const id of Object.keys(CARDS)) {
  if (id !== "default" && !sectionIds.has(id)) throw new Error(`share-images: "${id}" is no section of src/assets/share/sections.ts`);
}
for (const id of sectionIds) if (CARDS[id] === undefined) throw new Error(`share-images: section "${id}" has no card here`);

const lookup = (catalog, key) => key.split(".").reduce((node, part) => node?.[part], catalog);
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** After 1. e4 e5 2. Nf3 Nc6 3. Bb5 — the Ruy Lopez. */
const POSITION = "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R";
const GLYPHS = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };

const board = () => {
  const rows = POSITION.split("/");
  let cells = "";
  rows.forEach((row, rank) => {
    let file = 0;
    for (const char of row) {
      if (/\d/.test(char)) {
        for (let i = 0; i < Number(char); i += 1, file += 1) cells += `<div class="sq ${(rank + file) % 2 === 0 ? "l" : "d"}"></div>`;
      } else {
        const white = char === char.toUpperCase();
        cells += `<div class="sq ${(rank + file) % 2 === 0 ? "l" : "d"}"><span class="${white ? "w" : "b"}">${GLYPHS[char.toLowerCase()]}</span></div>`;
        file += 1;
      }
    }
  });
  return `<div class="board">${cells}</div>`;
};

const page = (language, id) => {
  const catalog = CATALOGS[language];
  const card = CARDS[id];
  const brand = lookup(catalog, "app.brandText");
  const name = lookup(catalog, card.name);
  const line = lookup(catalog, card.line);
  const dir = RTL.has(language) ? "rtl" : "ltr";
  return `<!doctype html><html lang="${language}" dir="${dir}"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; }
    body { width: 1200px; height: 630px; background: #1e2a33; color: #f5efe6; font-family: "DejaVu Sans", sans-serif;
      display: flex; align-items: center; gap: 64px; padding: 0 72px; }
    .board { direction: ltr; flex: none; width: 472px; height: 472px; display: grid; grid-template-columns: repeat(8, 1fr);
      border-radius: 6px; overflow: hidden; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
    .sq { display: flex; align-items: center; justify-content: center; font-size: 46px; line-height: 1; }
    .l { background: #f0d9b5; } .d { background: #b58863; }
    .w { color: #fff; -webkit-text-stroke: 1.4px #222; } .b { color: #222; }
    .text { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
    .brand { font-size: 26px; letter-spacing: .04em; color: #e8c07d; }
    .name { font-size: ${id === "default" ? 62 : 66}px; font-weight: 700; line-height: 1.08; }
    .line { font-size: 27px; line-height: 1.4; color: #d4ccbf; }
  </style></head><body>${board()}<div class="text">
    ${id === "default" ? "" : `<div class="brand">${escape(brand)}</div>`}
    <div class="name">${escape(name)}</div>
    <div class="line">${escape(line)}</div>
  </div></body></html>`;
};

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : undefined;
const outDir = resolve(SHARE_DIR);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const tab = await context.newPage();
  for (const id of Object.keys(CARDS)) {
    if (only !== undefined && only !== id) continue;
    for (const language of Object.keys(CATALOGS)) {
      await tab.setContent(page(language, id));
      const file = `${outDir}/${id}${language === "en" ? "" : `.${language}`}.png`;
      await tab.screenshot({ path: file, type: "png" });
      console.log(`share-images: ${file}`);
    }
  }
} finally {
  await browser.close();
}
