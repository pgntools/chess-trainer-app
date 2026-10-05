import { Component, Suspense, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import type { MDXContent } from "mdx/types";

import { SelectAutocomplete } from "../../../design-system/components/autocompletes";
import { InlineAlert, StatusText } from "../../../design-system/components/feedback";
import { SwitchField } from "../../../design-system/components/forms";
import { downloadTextFile } from "../../../lib/pgnExport";
import { mdxComponents } from "../../home/frontPage";
import { articleImportResolver, articleOptions, folderOf, loadArticleSource } from "./articleSources";
import { compileMdx, SOURCE_LINE_COMPONENT } from "./compileMdx";
import { STARTER_DOCUMENT } from "./starterDocument";
import { useScrollSync } from "./useScrollSync";

/**
 * **The MDX editor** (dev-only, `/dev/mdx-editor`) — an article's MDX on the
 * left, rendered on the right as the Blog renders it: the same components
 * (`views/home/frontPage/index.ts`), named with no `import`, reading the same
 * Library, repertoires and stored games. It is compiled in the browser
 * (`compileMdx.ts`) a moment after typing stops.
 *
 * - **A document that will not compile** keeps the last one that did on the
 *   right, under the error and where it is. **A component that throws** (a
 *   prop it cannot read) is caught there, and the next compile tries again.
 * - **An article** can be opened as a starting point — typed to find in the
 *   autocomplete beside the toolbar (the Blog's folders as its groups), or
 *   from the edit icon beside an article's title (`?article=<file>`, which
 *   `Main` hands in as `arrivingArticle`); its
 *   `import games from "./x.pgn?raw"` reads the file beside it.
 * - **The panes scroll together** (`useScrollSync.ts`) while "Scroll
 *   together" is on: scrolling either brings the other to the same block.
 * - **Nothing is written to the repository**: the text is copied or
 *   downloaded as a `.mdx`, to put under `src/views/blog/articles/` (the
 *   guide article says what else an article needs). The draft is kept for
 *   the tab's session, so a reload or a visit to another screen keeps it.
 */

/** Where a source line's block starts in the preview — `compileMdx.ts`'s marker, drawn as nothing. */
function SourceLineMarker({ line }: { line?: string }) {
  return <Box component="span" aria-hidden data-source-line={line} sx={{ display: "block", height: 0 }} />;
}

/** The article components, and the source-line marker the compiled document places before each block. */
const PREVIEW_COMPONENTS = { ...mdxComponents, [SOURCE_LINE_COMPONENT]: SourceLineMarker };

/** How long typing must pause before the document is compiled again. */
export const COMPILE_DELAY_MS = 300;

const DRAFT_KEY = "chessapp.dev.mdxEditor.draft";
const SOURCE_ID = "mdx-editor-source";
/** The articles it can open, typed to find — fixed for the build, as the files are. */
const ARTICLE_OPTIONS = articleOptions();

type Draft = { source: string; file: string };
/** What the tab keeps: the draft, and the text it was opened as — so a kept draft still counts as changed. */
type Kept = Draft & { opened: string };

const readKept = (): Kept | undefined => {
  try {
    const value = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as Partial<Kept> | null;
    if (typeof value?.source !== "string") return undefined;
    return { source: value.source, file: typeof value.file === "string" ? value.file : "", opened: typeof value.opened === "string" ? value.opened : value.source };
  } catch {
    return undefined;
  }
};

const writeKept = (kept: Kept) => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(kept));
  } catch {
    // A private window or full storage: the draft is simply not kept.
  }
};

/** What the preview shows: the last document that compiled, and what is wrong with the newest one. */
type Compiled = {
  Content?: MDXContent;
  /** Bumped on every successful compile, so the preview's error boundary starts afresh. */
  version: number;
  error?: { message: string; line?: number; column?: number };
  pending: boolean;
};

/** The document compiled `COMPILE_DELAY_MS` after it last changed — the newest compile wins. */
const useCompiled = (source: string, folder: string): Compiled => {
  const [compiled, setCompiled] = useState<Compiled>({ version: 0, pending: true });
  const latest = useRef(0);

  useEffect(() => {
    const run = ++latest.current;
    const timer = setTimeout(() => {
      void compileMdx(source, articleImportResolver(folder)).then((result) => {
        if (run !== latest.current) return;
        setCompiled((before) =>
          result.ok
            ? { Content: result.Content, version: before.version + 1, pending: false }
            : { ...before, error: { message: result.message, line: result.line, column: result.column }, pending: false },
        );
      });
    }, COMPILE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [source, folder]);

  // Typing marks the preview stale at once; the compile above clears it.
  const [seen, setSeen] = useState({ source, folder });
  if (seen.source !== source || seen.folder !== folder) {
    setSeen({ source, folder });
    if (!compiled.pending) setCompiled({ ...compiled, pending: true });
  }
  return compiled;
};

type BoundaryProps = { children: ReactNode };
type BoundaryState = { error?: Error };

/** A component in the document that throws is caught here rather than taking the page down. */
class PreviewBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = {};

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("MDX editor: a component in the document threw", error, info.componentStack);
  }

  render() {
    if (this.state.error !== undefined) {
      return (
        <InlineAlert severity="error" title="A component in the document failed" testId="mdx-editor-render-error">
          {this.state.error.message}
        </InlineAlert>
      );
    }
    return this.props.children;
  }
}

const whereOf = ({ line, column }: { line?: number; column?: number }) =>
  line === undefined ? "" : column === undefined ? `Line ${line}: ` : `Line ${line}, column ${column}: `;

type MdxEditorProps = {
  /** An article file to open on arrival — `tournaments/olympiad-2026`, `get-started.he` — replacing the draft. */
  arrivingArticle?: string;
  /** Called once that file is open (or found missing), so the address can drop it. */
  onArrived?: () => void;
};

function MdxEditor({ arrivingArticle, onArrived }: MdxEditorProps = {}) {
  const [kept] = useState(readKept);
  const [draft, setDraft] = useState<Draft>(() => (kept === undefined ? { source: STARTER_DOCUMENT, file: "" } : { source: kept.source, file: kept.file }));
  const [opened, setOpened] = useState(kept?.opened ?? draft.source);
  const [notice, setNotice] = useState<string>();
  const [scrollTogether, setScrollTogether] = useState(true);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  useScrollSync({ enabled: scrollTogether, source: sourceRef, preview: previewRef });
  const folder = folderOf(draft.file);
  const compiled = useCompiled(draft.source, folder);

  useEffect(() => writeKept({ ...draft, opened }), [draft, opened]);

  // Arriving from an article's edit icon: that article replaces the draft — the reader asked for it.
  useEffect(() => {
    if (arrivingArticle === undefined) return;
    let live = true;
    void loadArticleSource(arrivingArticle).then((source) => {
      if (!live) return;
      if (source === undefined) setNotice(`No article file ${arrivingArticle}.mdx.`);
      else {
        setDraft({ source, file: arrivingArticle });
        setOpened(source);
        setNotice(`Opened ${arrivingArticle}.mdx.`);
      }
      onArrived?.();
    });
    return () => {
      live = false;
    };
  }, [arrivingArticle, onArrived]);

  const dirty = draft.source !== opened;
  const replace = (next: Draft, message: string) => {
    if (dirty && !window.confirm("Replace the text in the editor? Its changes will be lost.")) return;
    setDraft(next);
    setOpened(next.source);
    setNotice(message);
  };

  const openArticle = async (file: string) => {
    const source = await loadArticleSource(file);
    if (source === undefined) setNotice(`No article file ${file}.mdx.`);
    else replace({ source, file }, `Opened ${file}.mdx.`);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft.source);
      setNotice("Copied the MDX.");
    } catch {
      setNotice("The browser refused to copy — select the text and copy it by hand.");
    }
  };

  const fileName = `${draft.file === "" ? "article" : draft.file.split("/").at(-1)}.mdx`;
  const download = () => setNotice(downloadTextFile(fileName, draft.source, "text/markdown") ? `Downloaded ${fileName}.` : "The browser refused the download.");

  const { Content, error, pending, version } = compiled;
  return (
    <Box data-testid="mdx-editor" sx={{ height: { md: "100%" }, minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
        <Box sx={{ flexGrow: 1, minWidth: 200 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            MDX editor
          </Typography>
          <Typography variant="body2" color="text.secondary" data-testid="mdx-editor-editing">
            {`${draft.file === "" ? "A new article" : `Editing ${draft.file}.mdx`}${dirty ? " — changed" : ""} · imports resolve from articles/${folder === "" ? "" : `${folder}/`}`}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 280 }}>
          <SelectAutocomplete
            label="Open an article"
            value={null}
            onChange={(file) => file !== null && void openArticle(file)}
            options={ARTICLE_OPTIONS}
            placeholder="Type to find an article…"
            clearable={false}
            testId="mdx-editor-open"
          />
        </Box>
        <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => void copy()} data-testid="mdx-editor-copy">
          Copy MDX
        </Button>
        <Button size="small" startIcon={<DownloadRoundedIcon />} onClick={download} data-testid="mdx-editor-download">
          Download .mdx
        </Button>
        <Button
          size="small"
          startIcon={<RestartAltRoundedIcon />}
          onClick={() => replace({ source: STARTER_DOCUMENT, file: "" }, "Started a new article.")}
          disabled={draft.file === "" && draft.source === STARTER_DOCUMENT}
          data-testid="mdx-editor-reset"
        >
          New article
        </Button>
      </Box>
      {notice !== undefined && (
        <StatusText tone="info" testId="mdx-editor-notice">
          {notice}
        </StatusText>
      )}

      <Box
        sx={{
          flex: { md: 1 },
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 1fr)" },
          gridTemplateRows: { md: "minmax(0, 1fr)" },
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minHeight: 0 }}>
          <Typography component="label" htmlFor={SOURCE_ID} variant="subtitle2">
            MDX source
          </Typography>
          <Box
            component="textarea"
            ref={sourceRef}
            id={SOURCE_ID}
            data-testid="mdx-editor-source"
            dir="ltr"
            spellCheck={false}
            value={draft.source}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft({ ...draft, source: event.target.value })}
            sx={{
              flex: 1,
              minHeight: { xs: "50vh", md: 0 },
              resize: "none",
              p: 1.5,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: 13,
              lineHeight: 1.5,
              tabSize: 2,
              color: "text.primary",
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              "&:focus-visible": { outline: 2, outlineStyle: "solid", outlineColor: "primary.main", outlineOffset: 1 },
            }}
          />
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minHeight: 0 }}>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
            <Typography variant="subtitle2" id="mdx-editor-preview-label">
              Preview
            </Typography>
            <StatusText tone="neutral" testId="mdx-editor-state">
              {pending ? "Compiling…" : error !== undefined ? "Not compiled" : "Up to date"}
            </StatusText>
            <Box sx={{ marginInlineStart: "auto" }}>
              <SwitchField label="Scroll together" checked={scrollTogether} onChange={setScrollTogether} size="small" testId="mdx-editor-scroll-together" />
            </Box>
          </Box>
          <Box
            role="region"
            ref={previewRef}
            aria-labelledby="mdx-editor-preview-label"
            data-testid="mdx-editor-preview"
            sx={{ flex: 1, minHeight: 0, overflowY: { md: "auto" }, p: 2, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default" }}
          >
            {error !== undefined && (
              <Box sx={{ mb: 2 }}>
                <InlineAlert severity="error" title="The MDX does not compile" testId="mdx-editor-compile-error">
                  {`${whereOf(error)}${error.message}`}
                  {Content !== undefined && " — showing the last version that did."}
                </InlineAlert>
              </Box>
            )}
            {Content !== undefined && (
              <PreviewBoundary key={version}>
                <Suspense
                  fallback={
                    <Typography role="status" color="text.secondary">
                      Loading…
                    </Typography>
                  }
                >
                  <Content components={PREVIEW_COMPONENTS} />
                </Suspense>
              </PreviewBoundary>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default MdxEditor;
