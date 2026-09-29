import Box from "@mui/material/Box";
import { alpha, useTheme, type Theme } from "@mui/material/styles";

import type { GalleryModule } from "../../../gallery/types";
import WithHook from "../../../gallery/WithHook";
import WithState from "../../../gallery/WithState";
import ColorField, { type ColorFieldProps } from "./ColorField";

const WORDS = {
  invalidText: "Not a colour — a hex code, with or without its alpha, or an RGBA value.",
  testId: "gallery-color",
} as const;

/** A live field starting on a colour of the theme in view — the gallery draws no colour of its own. */
const live = (pick: (theme: Theme) => string, props: Partial<ColorFieldProps> & { label: string }) => (
  <Box sx={{ maxWidth: 320 }}>
    <WithHook hook={useTheme<Theme>} args={[]}>
      {(theme) => (
        <WithState initial={pick(theme)}>
          {(value, setValue) => (
            <ColorField pickerLabel={`Pick a colour for ${props.label}`} {...WORDS} {...props} value={value} onChange={setValue} />
          )}
        </WithState>
      )}
    </WithHook>
  </Box>
);

const gallery: GalleryModule = {
  section: "forms",
  title: "ColorField",
  demos: [
    { name: "An opaque colour — the swatch opens the system's picker", render: () => live((theme) => theme.palette.primary.main, { label: "Primary" }) },
    {
      name: "A translucent colour — over the checkerboard; the picker keeps its alpha",
      render: () => live((theme) => alpha(theme.palette.primary.main, 0.41), { label: "Last move" }),
    },
    {
      name: "With a caption that passes — its contrast against its background",
      render: () =>
        live((theme) => theme.palette.text.primary, { label: "Text", help: "Passes AA on every surface.", helpTone: "success" }),
    },
    {
      name: "With a caption that fails",
      render: () => live((theme) => theme.palette.divider, { label: "Text", help: "Fails AA on the paper.", helpTone: "error" }),
    },
    { name: "Disabled", render: () => live((theme) => theme.palette.text.secondary, { label: "Secondary", disabled: true }) },
  ],
};

export default gallery;
