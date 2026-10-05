import Box from "@mui/material/Box";

/** Where a source line's block starts in the preview — `compileMdx.ts`'s marker, drawn as nothing. */
function SourceLineMarker({ line }: { line?: string }) {
  return <Box component="span" aria-hidden data-source-line={line} sx={{ display: "block", height: 0 }} />;
}

export default SourceLineMarker;
