import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DataObjectRoundedIcon from "@mui/icons-material/DataObjectRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import { ChipsAutocomplete } from "../../../design-system/components/autocompletes";
import { InlineAlert } from "../../../design-system/components/feedback";
import { SwitchField, TextInputField } from "../../../design-system/components/forms";
import { ViewToggle } from "../../../design-system/components/toolbars";
import {
  FRONTMATTER_KEYS,
  keysFor,
  parseFrontmatterYaml,
  validateFrontmatter,
  type ArticleFileKind,
  type FrontmatterIssue,
  type FrontmatterKey,
} from "../../../lib/articleFrontmatter";
import type { BlogArticleEntry } from "../../blog/articles";
import { setMetadataKey, type MetadataValue } from "./metadataYaml";
import { SharePreview } from "./SharePreview";

type MetadataPaneProps = {
  /** The frontmatter's YAML, as it will be written between the `---` lines. */
  yaml: string;
  onChange: (yaml: string) => void;
  /** What the file is — an article or a folder's index — and its language: which keys it takes. */
  kind: ArticleFileKind;
  language: string;
  /** For a translation: its article as the English file describes it — the keys it may not repeat, shown. */
  english?: BlogArticleEntry;
  /** The article's or folder's path under `/blog/` — where its share image is looked for (CTA-136). */
  path?: string;
};

/** The field each key gets, and its words. */
const FIELDS: Record<FrontmatterKey, { label: string; control: "text" | "lines" | "number" | "date" | "list" | "switch"; hint?: string }> = {
  title: { label: "Title", control: "text" },
  summary: { label: "Summary", control: "lines", hint: "One line under the title on the index pages." },
  description: { label: "Description", control: "lines", hint: "The page's description, for search and sharing. Empty: the summary." },
  order: { label: "Order", control: "number", hint: "Pins it to the top of its folder, lowest first. Empty: sorted by date." },
  date: { label: "Date", control: "date", hint: "Published. Unpinned articles sort newest first." },
  updated: { label: "Updated", control: "date" },
  tags: { label: "Tags", control: "list" },
  draft: { label: "Draft — in yarn dev only, not in the build", control: "switch" },
  image: { label: "Share image", control: "text", hint: "A PNG or JPEG beside the file, 1200 × 630 — ./cover.png. Empty: the nearest folder's, else the section's." },
  imageAlt: { label: "Share image's words", control: "text", hint: "What the image shows — required with an image." },
  redirectFrom: { label: "Old addresses", control: "list", hint: "Paths under /blog/ that lead here — tournaments/old-name." },
};

/** What the English file says of an article, for a translation's read-only line. */
const englishLine = (article: BlogArticleEntry): string =>
  [
    article.order === undefined ? undefined : `order ${article.order}`,
    article.date === undefined ? undefined : `date ${article.date}`,
    article.updated === undefined ? undefined : `updated ${article.updated}`,
    article.tags === undefined || article.tags.length === 0 ? undefined : `tags ${article.tags.join(", ")}`,
    article.draft ? "a draft" : undefined,
  ]
    .filter((part): part is string => part !== undefined)
    .join(" · ") || "nothing";

/**
 * **The Metadata tab** of the MDX editor (CTA-135) — the file's frontmatter,
 * as a form built from the schema (`src/lib/articleFrontmatter.ts`) or as the
 * YAML itself. Both edit the one text (`metadataYaml.ts` keeps its comments
 * and unknown keys), and it is checked while typing by the validator the
 * build runs, so what the build would refuse shows against its field. YAML
 * that does not parse keeps the YAML view, with where it fails, until it does.
 *
 * What the form offers follows the file: an article's English file every
 * key; a translation its own words only, the English file's `order`, `date`
 * and the rest shown beside them; a folder's `index` its name, summary,
 * description, order and share image. Under them, the image a shared link
 * to the page shows, and where it comes from (CTA-136, `SharePreview`).
 */
export function MetadataPane({ yaml, onChange, kind, language, english, path = "" }: MetadataPaneProps) {
  const [view, setView] = useState<"form" | "yaml">("form");
  const parsed = parseFrontmatterYaml(yaml);
  const data = parsed.ok && parsed.data !== null && typeof parsed.data === "object" && !Array.isArray(parsed.data) ? (parsed.data as Record<string, unknown>) : {};
  const issues: FrontmatterIssue[] = parsed.ok ? validateFrontmatter(parsed.data, { kind, language }).issues : [];
  const issueOf = (key: string) => issues.find((issue) => issue.key === key)?.message;
  const known = new Set<string>(FRONTMATTER_KEYS);
  const unknown = Object.keys(data).filter((key) => !known.has(key));
  const shown = view === "yaml" || !parsed.ok ? "yaml" : "form";
  const set = (key: FrontmatterKey, value: MetadataValue) => onChange(setMetadataKey(yaml, key, value));

  const field = (key: FrontmatterKey) => {
    const { label, control, hint } = FIELDS[key];
    const value = data[key];
    const error = issueOf(key);
    const helperText = error ?? hint;
    const testId = `mdx-editor-meta-${key}`;
    switch (control) {
      case "switch":
        return <SwitchField key={key} label={label} checked={value === true} onChange={(on) => set(key, on ? true : undefined)} testId={testId} />;
      case "list":
        return (
          <ChipsAutocomplete
            key={key}
            label={label}
            value={Array.isArray(value) ? value.map(String) : []}
            onChange={(next) => set(key, next)}
            options={[]}
            placeholder={hint}
            testId={testId}
          />
        );
      case "number":
        return (
          <TextInputField
            key={key}
            label={label}
            type="number"
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(text) => set(key, text.trim() === "" ? undefined : Number.isFinite(Number(text)) ? Number(text) : text)}
            helperText={helperText}
            error={error !== undefined}
            testId={testId}
          />
        );
      default:
        return (
          <TextInputField
            key={key}
            label={key === "title" || (key === "summary" && kind === "article") ? `${label} (required)` : label}
            type={control === "date" ? "date" : "text"}
            multiline={control === "lines"}
            dir={control === "date" ? "ltr" : "auto"}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(text) => set(key, text === "" ? undefined : text)}
            helperText={helperText}
            error={error !== undefined}
            testId={testId}
          />
        );
    }
  };

  // What no text field of the form can show under itself: an issue of no key, of a key the form has not, of a list or a switch.
  const inForm = (key: string | undefined): key is FrontmatterKey =>
    key !== undefined && keysFor(kind, language).includes(key as FrontmatterKey) && !["list", "switch"].includes(FIELDS[key as FrontmatterKey].control);
  const loose = issues.filter((issue) => !inForm(issue.key));
  return (
    <Box data-testid="mdx-editor-metadata" sx={{ display: "flex", flexDirection: "column", gap: 1.5, minHeight: 0, flex: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {kind === "folder" ? "A folder's index" : language === "en" ? "An article" : `A translation (${language})`} — checked as the build checks it.
        </Typography>
        <ViewToggle
          value={shown}
          onChange={setView}
          options={[
            { value: "form", label: "Form", icon: <TuneRoundedIcon fontSize="small" /> },
            { value: "yaml", label: "YAML", icon: <DataObjectRoundedIcon fontSize="small" /> },
          ]}
          ariaLabel="Edit the metadata as"
          testId="mdx-editor-meta-view"
        />
      </Box>

      {!parsed.ok && (
        <InlineAlert severity="error" title="The YAML does not parse" testId="mdx-editor-meta-yaml-error">
          {`${parsed.line === undefined ? "" : `Line ${parsed.line}: `}${parsed.message} — the form returns once it does.`}
        </InlineAlert>
      )}
      {parsed.ok && loose.length > 0 && (
        <InlineAlert severity="warning" title="The build would refuse this" testId="mdx-editor-meta-issues">
          {loose.map((issue) => issue.message).join(" · ")}
        </InlineAlert>
      )}

      {shown === "yaml" ? (
        <Box
          component="textarea"
          aria-label="Metadata YAML"
          data-testid="mdx-editor-meta-yaml"
          dir="ltr"
          spellCheck={false}
          value={yaml}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
          sx={{
            flex: 1,
            minHeight: { xs: "40vh", md: 0 },
            resize: "none",
            p: 1.5,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: 13,
            lineHeight: 1.5,
            color: "text.primary",
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            "&:focus-visible": { outline: 2, outlineStyle: "solid", outlineColor: "primary.main", outlineOffset: 1 },
          }}
        />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, overflowY: { md: "auto" }, minHeight: 0, pt: 1 }}>
          {keysFor(kind, language).map(field)}
          <SharePreview kind={kind} path={path} language={language} image={data.image} imageAlt={data.imageAlt} />
          {english !== undefined && language !== "en" && (
            <Typography variant="body2" color="text.secondary" data-testid="mdx-editor-meta-english">
              {`From the English file: ${englishLine(english)}.`}
            </Typography>
          )}
          {unknown.map((key) => (
            <Typography key={key} variant="body2" color="text.secondary" data-testid={`mdx-editor-meta-unknown-${key}`}>
              <Box component="code" dir="ltr">{key}</Box> — an unknown key, kept as written (the build refuses it).
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}
