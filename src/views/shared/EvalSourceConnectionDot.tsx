import Box from "@mui/material/Box";

import type { EvalSourceConnection } from "../../lib/evalSources";

/** The dot's colour per connection: gray off, the warning's yellow on but not answering, the success green answering. */
const DOT_COLOR: Record<EvalSourceConnection, string> = {
  disabled: "text.disabled",
  "not-connected": "warning.main",
  connected: "success.main",
};

/**
 * **An eval source's connection as a dot** (CTA-199) — drawn only
 * (`aria-hidden`): whoever shows it says the state in words beside it.
 */
function EvalSourceConnectionDot({ connection, testId }: { connection: EvalSourceConnection; testId: string }) {
  return (
    <Box
      component="span"
      aria-hidden
      data-testid={testId}
      data-connection={connection}
      sx={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: DOT_COLOR[connection] }}
    />
  );
}

export default EvalSourceConnectionDot;
