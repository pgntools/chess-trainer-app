import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";

import { BaseDialog } from "../../design-system/components/dialogs";
import { InlineAlert } from "../../design-system/components/feedback";
import { CheckboxField, FileInputButton, TextInputField } from "../../design-system/components/forms";
import { COLUMNS, SIDE_COLUMN } from "./dialogLayout";
import { IDENTIFIER, namesIn, pgnImportName } from "./pgnImports";
import { sizeOf } from "./pgnPages";

const ID = "mdx-editor-add-image";
/** An image's file name — what the storage service takes. */
const IMAGE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpe?g|webp|gif)$/i;
/** The images an article takes — what the build bundles and every browser shows. */
const ACCEPT = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

/** An image the reader adds: the file, its name beside the article, the name the article binds it to, its alt text and its caption. */
export type ImageToAdd = { file: File; fileName: string; name: string; alt: string; caption: string };

type AddImageDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Whether the article has a file yet — an image goes beside it, so a new article is saved first. */
  hasFile: boolean;
  /** The article's folder under `articles/`, where the image goes. */
  folder: string;
  /** The article's content — the names it binds, which the image may not take. */
  body: string;
  onAdd: (image: ImageToAdd) => void;
  /** Save the article — for one with no folder yet. */
  onSaveFirst: () => void;
  busy: boolean;
  /** Why the service would not write it. */
  error?: string;
};

/** A file's name as the Blog's files are named: lower-case words and dashes, its extension kept. */
const cleanName = (name: string): string => {
  const match = /^(.*?)(\.[A-Za-z]+)?$/.exec(name);
  const stem = (match?.[1] ?? name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "");
  return `${stem === "" ? "image" : stem}${(match?.[2] ?? ".png").toLowerCase()}`;
};

/**
 * **Add image** (CTA-137) — an image beside the article, written by the
 * storage service as a PGN is (so the lobby lists it and deletes it), and
 * shown where the caret is: `import <name> from "./<file>"` at the top, an
 * `<img src={<name>} alt="…" />` in place. Its **alt text** is asked for —
 * what a screen reader says of it (WCAG 1.1.1) — or the image marked as
 * decorative, which says nothing. An article with no folder yet is saved
 * first.
 */
function AddImageDialog({ open, onClose, hasFile, folder, body, onAdd, onSaveFirst, busy, error }: AddImageDialogProps) {
  const taken = namesIn(body);
  const [file, setFile] = useState<File>();
  const [fileName, setFileName] = useState("");
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [caption, setCaption] = useState("");
  // The picked image, shown — its object URL let go once another is picked or the dialog closes.
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
    <BaseDialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Add image"
      width="full"
      dividers
      testId={`${ID}-dialog`}
      actions={
        <>
          <Button onClick={onClose} disabled={busy} data-testid={`${ID}-close`}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => file !== undefined && onAdd({ file, fileName, name: theName, alt: decorative ? "" : alt.trim(), caption: caption.trim() })}
            disabled={blocked}
            aria-busy={busy || undefined}
            data-testid={`${ID}-add`}
          >
            Add to the article
          </Button>
        </>
      }
    >
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
          {error !== undefined && (
            <InlineAlert severity="error" title="The service would not write it" testId={`${ID}-error`}>
              {error}
            </InlineAlert>
          )}
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minHeight: 0 }}>
          <Typography variant="subtitle2" component="h3">
            Preview
          </Typography>
          <Box
            sx={{ flex: 1, minHeight: 240, display: "grid", placeItems: "center", p: 2, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default", overflow: "auto" }}
            data-testid={`${ID}-preview`}
          >
            {preview === undefined ? (
              <Typography variant="body2" color="text.secondary">
                Choose an image to see it here.
              </Typography>
            ) : (
              <Box component="figure" sx={{ m: 0, display: "grid", gap: 1, justifyItems: "center" }}>
                <Box component="img" src={preview} alt={decorative ? "" : alt} sx={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain" }} />
                {caption.trim() !== "" && (
                  <Typography component="figcaption" variant="body2" color="text.secondary">
                    {caption}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </BaseDialog>
  );
}

export default AddImageDialog;
