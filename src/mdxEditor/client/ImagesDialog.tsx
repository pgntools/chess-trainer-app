import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";

import { InlineAlert } from "../../design-system/components/feedback";
import { CheckboxField, FileInputButton, TextInputField } from "../../design-system/components/forms";
import { ArticleImage } from "../../views/home/frontPage/ArticleImage";
import { elementsIn, IMAGE_APPEARANCE, SETTINGS, writeElement, type SettingValues } from "./componentSettings";
import { elementAt, imageLabelOf, startAtCaret } from "./contentElements";
import { COLUMNS, MAIN_COLUMN, SIDE_COLUMN } from "./dialogLayout";
import { SettingsFields } from "./SettingsForm";
import { articleAssetsOf, IDENTIFIER, namesIn, pgnImportName } from "./pgnImports";
import { sizeOf } from "./pgnPages";
import { ElementEditor, ItemHead, SectionDialog } from "./SectionDialog";

const ID = "mdx-editor-images";
/** An image's file name — what the storage service takes. */
const IMAGE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpe?g|webp|gif)$/i;
/** The images an article takes — what the build bundles and every browser shows. */
const ACCEPT = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

/** An image the reader adds: the file, its name beside the article, the name the article binds it to, and the `<ArticleImage>` that shows it. */
export type ImageToAdd = { file: File; fileName: string; name: string; code: string };

/** The appearance's values as `<ArticleImage>`'s props — for the preview. */
const appearanceProps = (values: SettingValues) => ({
  width: typeof values.width === "string" ? values.width : undefined,
  maxHeight: typeof values.maxHeight === "string" && values.maxHeight !== "100vh" ? values.maxHeight : undefined,
  align: values.align === "start" ? ("start" as const) : values.align === "end" ? ("end" as const) : undefined,
  fit: values.fit === "cover" ? ("cover" as const) : undefined,
  rounded: values.rounded === true,
  border: values.border === true,
  shadow: values.shadow === true,
  link: values.link === true,
});

/** A file's name as the Blog's files are named: lower-case words and dashes, its extension kept. */
const cleanName = (name: string): string => {
  const match = /^(.*?)(\.[A-Za-z]+)?$/.exec(name);
  const stem = (match?.[1] ?? name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "");
  return `${stem === "" ? "image" : stem}${(match?.[2] ?? ".png").toLowerCase()}`;
};


type ImagesDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Whether the article has a file yet — an image goes beside it, so a new article is saved first. */
  hasFile: boolean;
  /** The article's folder under `articles/`, where an image goes and its import resolves from. */
  folder: string;
  /** The article's content — its `<ArticleImage>`s, the imports they read, and the names it binds, which a new image may not take. */
  body: string;
  /** Files written this session — an image's object URL, read before the build's glob has caught up. */
  attached: Readonly<Record<string, string>>;
  /** Where the caret is — the image it sits in opens first. */
  caret: number;
  onAdd: (image: ImageToAdd) => void;
  /** Save the article — for one with no folder yet. */
  onSaveFirst: () => void;
  /** Put an image's new markup in place of `body.slice(start, end)`. */
  onApply: (start: number, end: number, code: string) => void;
  /** Take an image out of the content — asking first — and its import once nothing else reads it. */
  onRemove: (image: { start: number; end: number; src?: string; file: string }) => void;
  /** Put the caret on an image in the content. */
  onShow: (start: number, end: number) => void;
  busy: boolean;
  /** Why the service would not write it. */
  error?: string;
  /** An image just put in, by where it starts — the list moves to it. */
  picked?: { seq: number; start: number };
  /** What the last action in the dialog came to. */
  message?: string;
};

/**
 * **Images** (CTA-137, CTA-139) — the article's images and a new one, in
 * one dialog:
 *
 * - **The article's images** — every `<ArticleImage>` in the content, by
 *   its alt text and its file (the one the caret is in first). Chosen, one
 *   shows its settings as a form (`componentSettings.ts`: alt text,
 *   caption, width and height as sliders, place, fit, corners, border,
 *   shadow, a full-size link) beside its code and the image as the article
 *   will show it — Apply puts the new markup in place of the old; it can be
 *   **shown in the content**, or **removed** from it (its import too once
 *   nothing reads it; the file stays beside the article).
 * - **Add an image** — written beside the article by the storage service,
 *   as a PGN is (so the lobby lists it and deletes it), and shown where the
 *   caret is: `import <name> from "./<file>"` at the top, an
 *   `<ArticleImage src={<name>} alt="…" />` in place, its appearance set
 *   and seen in the preview. Its **alt text** is asked for — what a screen
 *   reader says of it (WCAG 1.1.1) — or the image marked as decorative,
 *   which says nothing. An article with no folder yet is saved first. An
 *   article with no image opens here.
 */
function ImagesDialog(props: ImagesDialogProps) {
  const { open, onClose, body, caret, folder, attached, onApply, onRemove, onShow, busy, picked, message } = props;
  const images = elementsIn(body, "ArticleImage");
  const files = new Map(articleAssetsOf(body).map((asset) => [asset.name, asset.file]));
  /** The image chosen, by where it starts — `null` for Add an image. */
  const [selected, setSelected] = useState<number | null>(() => startAtCaret(images, caret));
  const [seenPick, setSeenPick] = useState(picked?.seq);
  if (picked !== undefined && picked.seq !== seenPick) {
    setSeenPick(picked.seq);
    setSelected(picked.start);
  }
  const image = elementAt(images, selected);
  const label = image === undefined ? undefined : imageLabelOf(image.code, files);
  // What the preview compiles: the image's import, then its markup.
  const importLine = articleAssetsOf(body).find((asset) => asset.name === label?.src);

  return (
    <SectionDialog
      open={open}
      onClose={onClose}
      title="Images"
      listLabel="The article's images"
      items={images.map((candidate) => {
        const words = imageLabelOf(candidate.code, files);
        return {
          id: String(candidate.start),
          label: (
            <Box component="span" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${words.alt} — ${words.file}`}>
              <span dir="auto">{words.alt}</span>
              {/* Its own text, between the two: a space at a span's edge is lost from the row's name. */}
              {" — "}
              <Box component="span" dir="ltr" sx={{ color: "text.secondary" }}>
                {words.file}
              </Box>
            </Box>
          ),
        };
      })}
      emptyWords="None yet."
      addLabel="Add an image"
      selected={image === undefined ? null : String(image.start)}
      onSelect={(id) => setSelected(id === null ? null : Number(id))}
      paneLabel={label === undefined ? "Add an image" : `The image ${label.alt}`}
      message={message}
      busy={busy}
      testId={ID}
    >
      {image === undefined || label === undefined ? (
        <AddImagePane {...props} />
      ) : (
        <>
          <ItemHead
            title={<span dir="auto">{label.alt}</span>}
            detail={<span dir="ltr">{label.file}</span>}
            onShow={() => onShow(image.start, image.end)}
            onRemove={() => onRemove({ start: image.start, end: image.end, src: label.src, file: label.file })}
            busy={busy}
            testId={ID}
          />
          <ElementEditor
            // A fresh form for each image, and once its new markup is in.
            key={`${image.start}:${image.code}`}
            code={image.code}
            onApply={(code) => onApply(image.start, image.end, code)}
            definitions={importLine === undefined ? { source: "", lines: 0 } : { source: `import ${importLine.name} from "${importLine.file}"\n\n`, lines: 2 }}
            folder={folder}
            attached={attached}
            testId={`${ID}-image`}
          />
        </>
      )}
    </SectionDialog>
  );
}

/**
 * **Add an image** — picked, named beside the article and in it, its alt
 * text (or decorative), caption and appearance set, seen as the article
 * will show it.
 */
function AddImagePane({ hasFile, folder, body, onAdd, onSaveFirst, busy, error }: ImagesDialogProps) {
  const taken = namesIn(body);
  const [file, setFile] = useState<File>();
  const [fileName, setFileName] = useState("");
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [caption, setCaption] = useState("");
  /** How it looks — `<ArticleImage>`'s width, height, place, fit, corners, border, shadow, link. */
  const [appearance, setAppearance] = useState<SettingValues>({});
  // The picked image, shown — its object URL let go once another is picked or the pane closes.
  const [preview, setPreview] = useState<string>();
  useEffect(() => {
    if (file === undefined) return;
    const url = URL.createObjectURL(file);
    // A new file, a new preview: an object URL is made outside React and handed in once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (picked: File) => {
    const cleaned = cleanName(picked.name);
    setFile(picked);
    setFileName(cleaned);
    setName(pgnImportName(cleaned.replace(/\.[a-z]+$/, ".pgn"), taken));
  };

  const theName = name.trim();
  const nameProblem = theName === "" ? undefined : !IDENTIFIER.test(theName) ? "Letters, digits, _ and $, not starting with a digit." : taken.has(theName) ? `The content already binds ${theName}.` : undefined;
  const fileProblem = fileName === "" || IMAGE_FILE.test(fileName) ? undefined : "Letters, digits, dots, dashes and underscores, then .png, .jpg, .webp or .gif.";
  const blocked = file === undefined || theName === "" || nameProblem !== undefined || fileName === "" || fileProblem !== undefined || (!decorative && alt.trim() === "") || !hasFile || busy;

  return (
    <>
      <Typography variant="subtitle1" component="h3" sx={{ flexShrink: 0, fontWeight: 600, px: 0.5 }}>
        Add an image
      </Typography>
      <Box sx={COLUMNS}>
        <Box sx={SIDE_COLUMN}>
          {!hasFile && (
            <InlineAlert severity="info" title="The article has no folder yet" testId={`${ID}-no-folder`}>
              <Box sx={{ display: "grid", gap: 1, justifyItems: "start" }}>
                <span>An image goes beside the article: save the article first, then add it.</span>
                <Button size="small" variant="outlined" onClick={onSaveFirst} data-testid={`${ID}-save-first`}>
                  Save the article first
                </Button>
              </Box>
            </InlineAlert>
          )}
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
            <FileInputButton label="Choose an image" accept={ACCEPT} onFiles={(files) => pick(files[0])} variant="outlined" size="small" startIcon={<AddPhotoAlternateOutlinedIcon />} testId={`${ID}-upload`} />
            {file !== undefined && (
              <Typography variant="body2" color="text.secondary">
                {`${file.name}, ${sizeOf(file.size)}`}
              </Typography>
            )}
          </Box>
          <TextInputField
            label="File name"
            value={fileName}
            onChange={setFileName}
            placeholder="photo.png"
            dir="ltr"
            error={fileProblem !== undefined}
            helperText={fileProblem ?? (fileName === "" ? "Beside the article." : <span dir="ltr">{`src/views/blog/articles/${folder === "" ? "" : `${folder}/`}${fileName}`}</span>)}
            testId={`${ID}-file-name`}
          />
          <TextInputField
            label="Alt text"
            value={decorative ? "" : alt}
            onChange={setAlt}
            disabled={decorative}
            placeholder="The final position: White mates on h7"
            dir="auto"
            helperText="What the image shows, for a reader who cannot see it — a screen reader says it."
            testId={`${ID}-alt`}
          />
          <CheckboxField label="Decorative — it says nothing the text does not" checked={decorative} onChange={setDecorative} size="small" testId={`${ID}-decorative`} />
          <TextInputField label="Caption (optional)" value={caption} onChange={setCaption} dir="auto" helperText="A line under the image, seen by everyone." testId={`${ID}-caption`} />
          <TextInputField
            label="Name in the article"
            value={name}
            onChange={setName}
            placeholder="photo"
            dir="ltr"
            error={nameProblem !== undefined}
            helperText={nameProblem ?? `What the markup reads: <img src={${theName === "" ? "…" : theName}} />.`}
            testId={`${ID}-name`}
          />
          <Typography variant="subtitle2" component="h4">
            Appearance
          </Typography>
          <SettingsFields fields={IMAGE_APPEARANCE} values={appearance} onChange={(prop, value) => setAppearance((before) => ({ ...before, [prop]: value }))} testId={`${ID}-appearance`} />
          <Box>
            <Button
              variant="contained"
              onClick={() =>
                file !== undefined &&
                onAdd({
                  file,
                  fileName,
                  name: theName,
                  code: writeElement("ArticleImage", [{ prop: "src", value: { expression: theName } }], SETTINGS.ArticleImage, { ...appearance, alt: decorative ? "" : alt.trim(), caption: caption.trim() }),
                })
              }
              disabled={blocked}
              aria-busy={busy || undefined}
              data-testid={`${ID}-add`}
            >
              Add to the article
            </Button>
          </Box>
          {error !== undefined && (
            <InlineAlert severity="error" title="The service would not write it" testId={`${ID}-error`}>
              {error}
            </InlineAlert>
          )}
        </Box>
        <Box sx={MAIN_COLUMN}>
          <Typography variant="subtitle2" component="h4">
            Preview
          </Typography>
          <Box sx={{ flex: "1 0 240px", minHeight: 240, p: 2, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default", overflow: "auto" }} data-testid={`${ID}-preview`}>
            {preview === undefined ? (
              <Typography variant="body2" color="text.secondary">
                Choose an image to see it here.
              </Typography>
            ) : (
              // As the article will show it: the component itself, the picked file its image.
              <ArticleImage src={preview} alt={decorative ? "" : alt} caption={caption.trim()} {...appearanceProps(appearance)} />
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
}

export default ImagesDialog;
