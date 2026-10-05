import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { InlineAlert } from "../../design-system/components/feedback";
import { PREVIEW_COMPONENTS, useCompiled, whereOf } from "./useCompiled";

/**
 * **What the MDX editor renders MDX with** — its preview pane's parts, and
 * the Add PGN dialog's preview of one component (CTA-137): the source-line
 * marker, the boundary that contains a component that throws, and a piece
 * of MDX rendered whole.
 */

type BoundaryProps = { children: ReactNode };
type BoundaryState = { error?: Error };

/** A component in the document that throws is caught here rather than taking the page down. */
export class PreviewBoundary extends Component<BoundaryProps, BoundaryState> {
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

/**
 * **A piece of MDX rendered as an article renders it** — the Add PGN
 * dialog's preview of the component it is about to insert: compiled a
 * moment after it last changed, with `folder`'s imports (and the PGNs just
 * `attached`); a code that will not compile says where — `lineOffset`
 * taking off the lines put before it — over the last one that did.
 */
export function SnippetPreview({
  source,
  folder,
  attached,
  lineOffset = 0,
  testId,
}: {
  source: string;
  folder: string;
  attached: Readonly<Record<string, string>>;
  lineOffset?: number;
  testId: string;
}) {
  const { Content, error, pending, version } = useCompiled(source, folder, attached);
  return (
    <Box data-testid={testId} aria-busy={pending || undefined}>
      {error !== undefined && (
        <Box sx={{ mb: 2 }}>
          <InlineAlert severity="error" title="The code does not compile" testId={`${testId}-error`}>
            {`${whereOf({ ...error, line: error.line === undefined ? undefined : error.line - lineOffset })}${error.message}`}
          </InlineAlert>
        </Box>
      )}
      {Content === undefined
        ? pending && (
            <Typography role="status" color="text.secondary">
              Compiling…
            </Typography>
          )
        : (
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
  );
}
