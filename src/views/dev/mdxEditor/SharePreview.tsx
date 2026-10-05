import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { asAppLanguage } from "../../../i18n";
import { articleImageFile, languageAwareOptions, shareImageOf, type ShareImage, type ShareImageLevel } from "../../../lib/shareImage";
import { SITE_SHARE_IMAGE, shareSectionImage, SHARE_SECTIONS } from "../../../assets/share/sections";
import { BLOG_ARTICLES_DIR, blogParentOf } from "../../blog/articles";
import { folderLevels } from "../../blog/blogPageMeta";

/**
 * Every image the chain may name, as the dev server serves it — keyed
 * repository-relative, as the chain names them. Dev-only: this module is the
 * MDX editor's, which no production build carries.
 */
const SERVED: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>(["/src/views/blog/articles/**/*.{png,jpg,jpeg,PNG,JPG,JPEG}", "/src/assets/share/*.png"], {
      eager: true,
      query: "?url",
      import: "default",
    }),
  ).map(([path, url]) => [path.slice(1), url]),
);

const BLOG_SECTION = SHARE_SECTIONS.find((section) => section.id === "blog")!;

const whereFrom = (image: ShareImage): string => {
  switch (image.level) {
    case "own":
      return "its own";
    case "folder":
      return image.from === "" ? "from the Blog's own index" : `from the folder ${image.from}`;
    case "section":
      return `the ${image.from} section's`;
    case "default":
      return "the site's own — nothing nearer has one";
  }
};

/**
 * **What a shared link to this page shows** (CTA-136) — the image its chain
 * resolves to (`lib/shareImage.ts`) as the draft stands, and where it came
 * from: the file's own `image`, a folder's, the Blog section's, or the site's.
 * The build walks the same chain (`src/entry-server.tsx`).
 */
export function SharePreview({
  kind,
  path,
  language,
  image,
  imageAlt,
}: {
  kind: "article" | "folder";
  /** The article's or the folder's path under `/blog/`. */
  path: string;
  language: string;
  /** The draft's own `image` and `imageAlt`, as typed. */
  image: unknown;
  imageAlt: unknown;
}) {
  const lang = asAppLanguage(language);
  const t = useTranslation().i18n.getFixedT(lang);
  const dir = kind === "folder" ? path : blogParentOf(path);
  const own = typeof image === "string" && image !== "" ? articleImageFile(BLOG_ARTICLES_DIR, dir, image) : undefined;
  const alt = typeof imageAlt === "string" && imageAlt !== "" ? imageAlt : undefined;
  const levels: ShareImageLevel[] = [
    ...(own === undefined ? [] : [{ level: kind === "article" ? ("own" as const) : ("folder" as const), from: kind === "folder" ? path : undefined, options: [{ file: own, alt }] }]),
    ...folderLevels(kind === "folder" ? blogParentOf(path) : dir, lang, true),
    { level: "section", from: BLOG_SECTION.id, options: languageAwareOptions(shareSectionImage(BLOG_SECTION), lang, t("share.sections.blog")) },
    { level: "default", options: languageAwareOptions(SITE_SHARE_IMAGE, lang, t("share.defaultImageAlt")) },
  ];
  const chosen = shareImageOf(levels, (file) => SERVED[file] !== undefined);
  const missing = own !== undefined && SERVED[own] === undefined;
  return (
    <Box data-testid="mdx-editor-meta-share" sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {chosen === undefined
          ? "Shares with no image — not even the site's is there."
          : `Shares as ${chosen.file.split("/").at(-1)} — ${whereFrom(chosen)}.`}
        {missing && ` (${own} is not there.)`}
      </Typography>
      {chosen !== undefined && (
        <Box
          component="img"
          src={SERVED[chosen.file]}
          alt={chosen.alt ?? ""}
          sx={{ width: "100%", maxWidth: 360, aspectRatio: "1200 / 630", objectFit: "cover", borderRadius: 1, border: 1, borderColor: "divider" }}
        />
      )}
    </Box>
  );
}
