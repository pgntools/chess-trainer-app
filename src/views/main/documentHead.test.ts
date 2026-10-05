import { describe, expect, it } from "vitest";

import { canonicalUrlOf, documentHeadHtml, pageUrlOf, type DocumentHeadInput } from "./documentHead";

const ROOT = "https://chessapp.dev/";

const article: DocumentHeadInput = {
  language: "he",
  path: "/blog/writing-an-article/components/nav-cards/",
  title: "כל המסכים ככרטיסים — בלוג — אפליקציית אימון שחמט",
  name: "כל המסכים ככרטיסים",
  description: "<NavCards>: מסכי האפליקציה",
  siteName: "אפליקציית אימון שחמט",
  kind: "article",
  published: "2026-09-14",
  modified: "2026-10-01",
  tags: ["components"],
  languages: ["en", "he"],
  canonicalRoot: ROOT,
  image: { url: `${ROOT}assets/share/nav-cards-1a2b.png`, alt: "לוח", width: 1200, height: 630, type: "image/png" },
};

const lines = (input: DocumentHeadInput) => documentHeadHtml(input).split("\n").map((line) => line.trim());

describe("a page's head", () => {
  it("puts every URL on the canonical host, prefixed by language, ending in a slash", () => {
    expect(pageUrlOf(ROOT, "/blog/x/", "en")).toBe("https://chessapp.dev/blog/x/");
    expect(pageUrlOf(ROOT, "/blog/x/", "he")).toBe("https://chessapp.dev/he/blog/x/");
    expect(pageUrlOf(ROOT, "/", "he")).toBe("https://chessapp.dev/he/");
  });

  it("writes the title, the description, the canonical, the alternates and the previews' tags", () => {
    expect(lines(article)).toEqual([
      "<title>כל המסכים ככרטיסים — בלוג — אפליקציית אימון שחמט</title>",
      '<meta name="description" content="&lt;NavCards&gt;: מסכי האפליקציה">',
      '<link rel="canonical" href="https://chessapp.dev/he/blog/writing-an-article/components/nav-cards/">',
      '<link rel="alternate" hreflang="en" href="https://chessapp.dev/blog/writing-an-article/components/nav-cards/">',
      '<link rel="alternate" hreflang="he" href="https://chessapp.dev/he/blog/writing-an-article/components/nav-cards/">',
      '<link rel="alternate" hreflang="x-default" href="https://chessapp.dev/blog/writing-an-article/components/nav-cards/">',
      '<meta property="og:type" content="article">',
      '<meta property="og:site_name" content="אפליקציית אימון שחמט">',
      '<meta property="og:title" content="כל המסכים ככרטיסים">',
      '<meta property="og:description" content="&lt;NavCards&gt;: מסכי האפליקציה">',
      '<meta property="og:url" content="https://chessapp.dev/he/blog/writing-an-article/components/nav-cards/">',
      '<meta property="og:locale" content="he_IL">',
      '<meta property="og:locale:alternate" content="en_US">',
      '<meta property="og:image" content="https://chessapp.dev/assets/share/nav-cards-1a2b.png">',
      '<meta property="og:image:type" content="image/png">',
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      '<meta property="og:image:alt" content="לוח">',
      '<meta property="article:published_time" content="2026-09-14">',
      '<meta property="article:modified_time" content="2026-10-01">',
      '<meta property="article:tag" content="components">',
      '<meta name="twitter:card" content="summary_large_image">',
      '<meta name="twitter:title" content="כל המסכים ככרטיסים">',
      '<meta name="twitter:description" content="&lt;NavCards&gt;: מסכי האפליקציה">',
      '<meta name="twitter:image" content="https://chessapp.dev/assets/share/nav-cards-1a2b.png">',
      '<meta name="twitter:image:alt" content="לוח">',
    ]);
  });

  it("sends a page not written in its language to the default language's, and lists no alternates for one language", () => {
    const titleOnly = { ...article, languages: ["en"] as const };
    expect(canonicalUrlOf(titleOnly)).toBe("https://chessapp.dev/blog/writing-an-article/components/nav-cards/");
    expect(lines(titleOnly).filter((line) => line.includes('rel="alternate"'))).toEqual([]);
  });

  it("leaves an article's tags off a screen", () => {
    const screen: DocumentHeadInput = { ...article, kind: "website", path: "/library/", image: undefined };
    const head = documentHeadHtml(screen);
    expect(head).toContain('<meta property="og:type" content="website">');
    expect(head).not.toContain("article:");
    expect(head).toContain('<meta name="twitter:card" content="summary">');
  });
});
