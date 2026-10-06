import { useEffect, useRef, useState } from "react";
import type { MDXContent } from "mdx/types";

import { mdxComponents } from "../../views/home/frontPage";
import { articleImportResolver } from "./articleSources";
import { compileMdx, SOURCE_LINE_COMPONENT } from "./compileMdx";
import SourceLineMarker from "./SourceLineMarker";

/**
 * **MDX compiled as the editor shows it** — its preview pane's and the Add
 * PGN dialog's (CTA-137): the document compiled a moment after it last
 * changed, the newest compile winning, and the components it renders with.
 */

/** The article components, and the source-line marker the compiled document places before each block. */
export const PREVIEW_COMPONENTS = { ...mdxComponents, [SOURCE_LINE_COMPONENT]: SourceLineMarker };

/** How long typing must pause before the document is compiled again. */
const COMPILE_DELAY_MS = 300;

/** What the preview shows: the last document that compiled, and what is wrong with the newest one. */
export type Compiled = {
  Content?: MDXContent;
  /** Bumped on every successful compile, so the preview's error boundary starts afresh. */
  version: number;
  error?: { message: string; line?: number; column?: number };
  pending: boolean;
};

/** The document compiled `COMPILE_DELAY_MS` after it last changed — the newest compile wins. `attached`: PGNs just written, by path under `articles/`. */
export const useCompiled = (source: string, folder: string, attached: Readonly<Record<string, string>>): Compiled => {
  const [compiled, setCompiled] = useState<Compiled>({ version: 0, pending: true });
  const latest = useRef(0);

  useEffect(() => {
    const run = ++latest.current;
    const timer = setTimeout(() => {
      void compileMdx(source, articleImportResolver(folder, attached)).then((result) => {
        if (run !== latest.current) return;
        setCompiled((before) =>
          result.ok
            ? { Content: result.Content, version: before.version + 1, pending: false }
            : { ...before, error: { message: result.message, line: result.line, column: result.column }, pending: false },
        );
      });
    }, COMPILE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [source, folder, attached]);

  // Typing marks the preview stale at once; the compile above clears it.
  const [seen, setSeen] = useState({ source, folder });
  if (seen.source !== source || seen.folder !== folder) {
    setSeen({ source, folder });
    if (!compiled.pending) setCompiled({ ...compiled, pending: true });
  }
  return compiled;
};

export const whereOf = ({ line, column }: { line?: number; column?: number }) =>
  line === undefined ? "" : column === undefined ? `Line ${line}: ` : `Line ${line}, column ${column}: `;
