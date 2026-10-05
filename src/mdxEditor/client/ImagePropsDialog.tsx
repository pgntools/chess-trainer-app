import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { BaseDialog } from "../../design-system/components/dialogs";
import { StatusText } from "../../design-system/components/feedback";
import { PickerList } from "../../design-system/components/lists";
import { elementOf, elementsIn } from "./componentSettings";
import { COLUMNS, SIDE_COLUMN, TEXTAREA_SX } from "./dialogLayout";
import { SnippetPreview } from "./mdxPreview";
import { articleAssetsOf } from "./pgnImports";
import SettingsForm from "./SettingsForm";

const ID = "mdx-editor-image-props";

type ImagePropsDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The article's content — its `<ArticleImage>`s, and the imports they read. */
  body: string;
  /** Where the caret is — the image it sits in opens first. */
  caret: number;
  /** The article's folder under `articles/` — where an image's import resolves from. */
  folder: string;
  /** Files written this session — an image's object URL, read before the build's glob has caught up. */
  attached: Readonly<Record<string, string>>;
  /** Put the image's new markup in place of `body.slice(start, end)`. */
  onApply: (start: number, end: number, code: string) => void;
};

/** An `<ArticleImage>`'s words, for the list — its alt text, else its file. */
const labelOf = (code: string, files: ReadonlyMap<string, string>) => {
  const attributes = elementOf(code)?.attributes ?? [];
  const valueOf = (prop: string) => {
    const value = attributes.find((attribute) => attribute.prop === prop)?.value;
    if (value === undefined || "bare" in value) return undefined;
    if ("string" in value) return value.string;
    try {
      const parsed: unknown = JSON.parse(value.expression);
      return typeof parsed === "string" ? parsed : value.expression;
    } catch {
      return value.expression;
    }
  };
  const src = valueOf("src");
  const file = src === undefined ? undefined : files.get(src);
  const alt = valueOf("alt");
  return { alt: alt === undefined || alt === "" ? "Decorative" : alt, file: file ?? src ?? "?", src };
};

/**
 * **Image props** (CTA-137) — the settings of an image already in the
 * article, as Add component's are a chess component's: the content's
 * `<ArticleImage>`s to choose from (the one the caret is in first), its
 * settings as a form (`componentSettings.ts`: alt text, caption, width and
 * height as sliders, place, fit, corners, border, shadow, a full-size link)
 * beside its code and the image as the article will show it. Apply puts the
 * new markup in place of the old.
 */
function ImagePropsDialog({ open, onClose, body, caret, folder, attached, onApply }: ImagePropsDialogProps) {
  const images = elementsIn(body, "ArticleImage");
  const files = new Map(articleAssetsOf(body).map((asset) => [asset.name, asset.file]));
  const [chosen, setChosen] = useState(() => Math.max(0, images.findIndex((image) => caret >= image.start && caret <= image.end)));
  const image = images[chosen];
  const [code, setCode] = useState(image?.code ?? "");
  const [seen, setSeen] = useState(chosen);
  if (seen !== chosen) {
    setSeen(chosen);
    setCode(images[chosen]?.code ?? "");
  }
  const label = labelOf(code, files);
  // What the preview compiles: the image's import, then its markup.
  const importLine = articleAssetsOf(body).find((asset) => asset.name === label.src);
  const definition = importLine === undefined ? "" : `import ${importLine.name} from "${importLine.file}"\n\n`;
  const readable = elementOf(code)?.component === "ArticleImage";

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Image props"
      width="full"
      dividers
      testId={`${ID}-dialog`}
      actions={
        <>
          <Button onClick={onClose} data-testid={`${ID}-close`}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => image !== undefined && onApply(image.start, image.end, code)}
            disabled={image === undefined || !readable || code === image.code}
            data-testid={`${ID}-apply`}
          >
            Apply
          </Button>
        </>
      }
    >
      {image === undefined ? (
        <StatusText tone="neutral" testId={`${ID}-none`}>
          The article has no image yet — Add image puts one in.
        </StatusText>
      ) : (
        <Box sx={COLUMNS}>
          <Box sx={{ ...SIDE_COLUMN, pe: { md: 2 }, borderInlineEnd: { md: 1 }, borderColor: { md: "divider" } }}>
            <Box>
              <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
                The article's images
              </Typography>
              <PickerList
                items={images.map((candidate, index) => {
                  const words = labelOf(candidate.code, files);
                  return {
                    id: String(index),
                    label: (
                      <Box component="span" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${words.alt} — ${words.file}`}>
                        <span dir="auto">{words.alt}</span>
                        <Box component="span" dir="ltr" sx={{ color: "text.secondary" }}>{` — ${words.file}`}</Box>
                      </Box>
                    ),
                  };
                })}
                value={String(chosen)}
                onChange={(id) => id !== null && setChosen(Number(id))}
                ariaLabel="The article's images"
                maxHeight={200}
                testId={`${ID}-images`}
              />
            </Box>
            <Typography variant="subtitle2" component="h3">
              Settings
            </Typography>
            <SettingsForm code={code} onCode={setCode} testId={`${ID}-settings`} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0, overflowY: { md: "auto" } }}>
            <Typography component="label" htmlFor={`${ID}-code`} variant="subtitle2">
              {`Code — ${label.file}`}
            </Typography>
            <Box
              component="textarea"
              id={`${ID}-code`}
              data-testid={`${ID}-code`}
              dir="ltr"
              spellCheck={false}
              value={code}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setCode(event.target.value)}
              sx={{ ...TEXTAREA_SX, flex: "none", minHeight: 72, height: 96 }}
            />
            <Typography variant="subtitle2" component="h3" id={`${ID}-preview-label`}>
              Preview
            </Typography>
            <Box role="region" aria-labelledby={`${ID}-preview-label`} sx={{ flex: 1, minHeight: 240, overflowY: "auto", p: 2, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default" }}>
              <SnippetPreview source={`${definition}${code}`} folder={folder} attached={attached} lineOffset={definition === "" ? 0 : 2} testId={`${ID}-preview`} />
            </Box>
          </Box>
        </Box>
      )}
    </BaseDialog>
  );
}

export default ImagePropsDialog;
