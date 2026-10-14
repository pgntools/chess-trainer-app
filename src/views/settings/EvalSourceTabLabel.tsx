import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../design-system/components/a11y";
import type { EvalSource } from "../../lib/evalSources";
import EvalSourceConnectionDot from "../shared/EvalSourceConnectionDot";
import { useEvalSourceConnection } from "../shared/useEvalSourceConnection";

/**
 * **An eval source's tab label** (CTA-199) — its title, then a small dot for
 * its connection where the source tells one (`EvalSource.connection`): gray
 * while it is off, yellow while on but not answering, green while it
 * answers. The dot is drawn, the state is words for a screen reader, so the
 * tab's name says it ("Lichess evaluation API, connected").
 */
function EvalSourceTabLabel({ source }: { source: EvalSource }) {
  const { t } = useTranslation();
  const connection = useEvalSourceConnection(source.connection);
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
      {t(source.titleKey)}
      {connection !== undefined && (
        <>
          <EvalSourceConnectionDot connection={connection} testId={`eval-source-connection-${source.id}`} />
          <Box component="span" sx={visuallyHidden}>
            {`, ${t(`settings.engine.evalSources.connection.${connection}`)}`}
          </Box>
        </>
      )}
    </Box>
  );
}

export default EvalSourceTabLabel;
