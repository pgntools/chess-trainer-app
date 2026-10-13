import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { TFunction } from "i18next";

import type { SelectOption } from "../../../design-system/components/forms";
import type { EngineEntry } from "../../../lib/engines";

/**
 * **The engines as a select's options** — each its name and version, left to
 * right; one this page cannot run disabled, with why under it. The New Job
 * form's engine select and the Jobs settings' default (CTA-193) share it.
 */
export const engineSelectOptions = (engines: readonly EngineEntry[], t: TFunction): SelectOption[] =>
  engines.map(({ descriptor, availability }) => ({
    value: descriptor.id,
    disabled: !availability.available,
    label: (
      <Box component="span" sx={{ display: "grid", minWidth: 0 }}>
        <bdi dir="ltr">
          {descriptor.name} ({descriptor.version})
        </bdi>
        {!availability.available && (
          <Typography component="span" variant="caption" sx={{ whiteSpace: "normal" }}>
            {t(`enginePicker.unavailable.${availability.reason}`)}
          </Typography>
        )}
      </Box>
    ),
  }));
