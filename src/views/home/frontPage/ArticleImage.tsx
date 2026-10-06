import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

type ArticleImageProps = {
  /** The image — `import photo from "./photo.png"`, then `src={photo}`. */
  src: string;
  /** What it shows, for a reader who cannot see it; `""` for a decorative image, said by no one. */
  alt?: string;
  /** A line under it, seen by everyone. */
  caption?: string;
  /** How wide, of the article's column — `"60%"`. Absent, the whole column. */
  width?: string;
  /** How tall at most, of the window — `"50vh"`. Absent, no limit. */
  maxHeight?: string;
  /** Where it sits on its line — at the start, in the middle (the default) or at the end. */
  align?: "start" | "center" | "end";
  /** Kept to `maxHeight` by showing all of it (`contain`, the default) or by cropping it to fill (`cover`). */
  fit?: "contain" | "cover";
  rounded?: boolean;
  border?: boolean;
  shadow?: boolean;
  /** A click opens it full size, in a new tab. */
  link?: boolean;
};

/**
 * **An image in an article** (CTA-137) —
 * `<ArticleImage src={photo} alt="…" width="60%" caption="…" />`: a figure
 * of the image beside the article (`import photo from "./photo.png"`, which
 * the build serves at a URL of its own), as wide as `width` of the column
 * and no taller than `maxHeight` of the window, at the start, middle or end
 * of its line (sides that mirror under RTL), kept whole or cropped, rounded,
 * bordered or shadowed, its caption under it, opening full size on a click
 * where `link`. Lazy: read only as it comes into view. The MDX editor's
 * Images section writes it and sets it.
 */
export function ArticleImage({ src, alt = "", caption, width, maxHeight, align = "center", fit = "contain", rounded = false, border = false, shadow = false, link = false }: ArticleImageProps) {
  const image = (
    <Box
      component="img"
      src={src}
      alt={alt}
      loading="lazy"
      sx={{
        display: "block",
        width: "100%",
        height: maxHeight === undefined ? "auto" : "100%",
        maxHeight,
        objectFit: fit,
        borderRadius: rounded ? 2 : 0,
        border: border ? 1 : 0,
        borderColor: "divider",
        boxShadow: shadow ? 3 : "none",
      }}
    />
  );
  return (
    <Box
      component="figure"
      data-testid="article-image"
      sx={{
        my: 2,
        mx: 0,
        width: width ?? "100%",
        maxWidth: "100%",
        marginInlineStart: align === "start" ? 0 : "auto",
        marginInlineEnd: align === "end" ? 0 : "auto",
      }}
    >
      {link ? (
        <a href={src} target="_blank" rel="noreferrer" aria-label={alt === "" ? "The image, full size" : `${alt} — full size`}>
          {image}
        </a>
      ) : (
        image
      )}
      {caption !== undefined && caption !== "" && (
        <Typography component="figcaption" variant="body2" color="text.secondary" sx={{ mt: 0.75, textAlign: "center" }}>
          {caption}
        </Typography>
      )}
    </Box>
  );
}
