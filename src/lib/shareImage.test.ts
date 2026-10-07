import { describe, expect, it } from "vitest";

import { articleImageFile, imageInfoOf, languageAwareOptions, languageVariantOf, shareImageOf, shareImageProblems, type ShareImageLevel } from "./shareImage";

const levels: ShareImageLevel[] = [
  { level: "own", options: [{ file: "a/own.he.png", alt: "שלי" }, { file: "a/own.png", alt: "שלי" }] },
  { level: "folder", from: "tournaments", options: [{ file: "a/folder.png", alt: "Folder" }] },
  { level: "section", from: "blog", options: languageAwareOptions("share/blog.png", "he", "בלוג") },
  { level: "default", options: languageAwareOptions("share/default.png", "he", "האתר") },
];

describe("a shared link's image", () => {
  it("takes the first file any level offers that is there, saying where it came from", () => {
    expect(shareImageOf(levels, (file) => file === "a/own.png" || file === "share/default.png")).toEqual({
      file: "a/own.png",
      alt: "שלי",
      level: "own",
    });
    expect(shareImageOf(levels, (file) => file === "a/folder.png")).toEqual({ file: "a/folder.png", alt: "Folder", level: "folder", from: "tournaments" });
    // Each level's language first: the section's Hebrew card before its general one.
    expect(shareImageOf(levels, (file) => file.startsWith("share/"))).toEqual({ file: "share/blog.he.png", alt: "בלוג", level: "section", from: "blog" });
    expect(shareImageOf(levels, (file) => file === "share/default.png")).toMatchObject({ level: "default", file: "share/default.png" });
    expect(shareImageOf(levels, () => false)).toBeUndefined();
  });

  it("names a file's variant in a language, and offers the default language the file alone", () => {
    expect(languageVariantOf("src/assets/share/blog.png", "he")).toBe("src/assets/share/blog.he.png");
    expect(languageAwareOptions("x.png", "en", "X")).toEqual([{ file: "x.png", alt: "X" }]);
  });

  it("resolves an article's image against its file's folder", () => {
    expect(articleImageFile("src/views/blog/articles", "tournaments", "./cover.png")).toBe("src/views/blog/articles/tournaments/cover.png");
    expect(articleImageFile("src/views/blog/articles", "tournaments/2026", "../covers/x.jpg")).toBe("src/views/blog/articles/tournaments/covers/x.jpg");
    expect(articleImageFile("src/views/blog/articles", "", "./x.png")).toBe("src/views/blog/articles/x.png");
  });

  it("holds an image to what previewers take", () => {
    expect(shareImageProblems({ type: "png", width: 1200, height: 630, bytes: 80_000 })).toEqual({ errors: [], warnings: [] });
    expect(shareImageProblems({ type: undefined, width: 0, height: 0, bytes: 10 }).errors).toEqual(["is not a PNG or a JPEG"]);
    expect(shareImageProblems({ type: "jpeg", width: 500, height: 300, bytes: 10 }).errors).toEqual(["is 500 × 300 — at least 600 × 315"]);
    expect(shareImageProblems({ type: "png", width: 1000, height: 1000, bytes: 10 }).warnings).toEqual(["is 1000 × 1000, off the previews' 1.91 : 1 (1200 × 630)"]);
    expect(shareImageProblems({ type: "png", width: 1200, height: 630, bytes: 6 * 1024 * 1024 }).errors).toEqual(["is 6.0 MB — at most 5 MB"]);
  });

  it("reads a PNG's and a JPEG's size from their bytes", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    new DataView(png.buffer).setUint32(16, 1200);
    new DataView(png.buffer).setUint32(20, 630);
    expect(imageInfoOf(png)).toEqual({ type: "png", width: 1200, height: 630 });

    // SOI, an APP0 segment of 16 bytes, then a baseline frame: height 315, width 600.
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0), 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x3b, 0x02, 0x58, 0x03]);
    expect(imageInfoOf(jpeg)).toEqual({ type: "jpeg", width: 600, height: 315 });
    expect(imageInfoOf(new TextEncoder().encode("<svg/>")).type).toBeUndefined();
  });
});
