/*
  **The theme editor's sections** (CTA-115) — the tabs down its left, and
  every field of each: which token it edits (a path into the
  `ThemeDefinition`), how, and in what words. Data, so the form, the contrast
  badges and "jump to the token" all read one list; every token of a theme is
  on it once (`sections.test.ts` holds it to that).
*/

/** Where the preview on the right looks: the app's UI, the board, or the map and the Library's bars. */
export type PreviewKind = "ui" | "board" | "map";

/** A choice of a select: its value (`null` for "MUI's own", the token left out) and its words. */
type Choice = { value: string | number | null; label: string };

export type FieldSpec = { path: string; label: string; help?: string } & (
  | { kind: "color"; optional?: boolean }
  | { kind: "number"; min: number; max: number; step: number; unit?: string }
  | { kind: "text"; placeholder?: string }
  | { kind: "length"; optional?: boolean; placeholder?: string }
  | { kind: "select"; choices: readonly Choice[] }
  | { kind: "toggle"; on: unknown }
);

/** A group of fields under one heading; `when` shows it only while that token is set (a toggled knob's own fields). */
type GroupSpec = { title: string; description?: string; when?: string; fields: readonly FieldSpec[] };

export type SectionSpec = {
  id: string;
  title: string;
  preview: PreviewKind;
  /** The scheme the preview switches to when the section opens. */
  scheme?: "light" | "dark";
  groups: readonly GroupSpec[];
};

const STATUS_COLOURS = ["secondary", "error", "warning", "info", "success"] as const;
const TITLE = (word: string) => word[0].toUpperCase() + word.slice(1);

const palette = (scheme: "light" | "dark"): SectionSpec => ({
  id: `palette-${scheme}`,
  title: `Palette — ${scheme}`,
  preview: "ui",
  scheme,
  groups: [
    {
      title: "Colours",
      description: "Left to MUI's default, a colour shows MUI's value; setting it writes it into the theme.",
      fields: [
        { path: `${scheme}.primary.main`, label: "Primary", kind: "color" },
        ...STATUS_COLOURS.map((colour) => ({ path: `${scheme}.${colour}.main`, label: TITLE(colour), kind: "color" as const, optional: true })),
      ],
    },
    {
      title: "Surfaces",
      fields: [
        { path: `${scheme}.background.default`, label: "The page (background.default)", kind: "color" },
        { path: `${scheme}.background.paper`, label: "A card or panel (background.paper)", kind: "color" },
        { path: `${scheme}.background.sunken`, label: "The sunken rail and side panel (background.sunken)", kind: "color" },
        { path: `${scheme}.background.translucent`, label: "The header, under its blur (background.translucent)", kind: "color" },
      ],
    },
    {
      title: "Text and lines",
      fields: [
        { path: `${scheme}.text.primary`, label: "Text", kind: "color" },
        { path: `${scheme}.text.secondary`, label: "Secondary text", kind: "color" },
        { path: `${scheme}.text.disabled`, label: "Disabled text", kind: "color", optional: true },
        { path: `${scheme}.divider`, label: "Divider", kind: "color" },
        { path: `${scheme}.controlBorder`, label: "A control's border (controlBorder)", kind: "color" },
      ],
    },
    {
      title: "Contrast threshold",
      fields: [
        {
          path: `${scheme}.contrastThreshold`,
          label: "Contrast threshold",
          help: "The ratio MUI picks a button's text colour by — keep it 4.5, WCAG's for text.",
          kind: "number",
          min: 3,
          max: 7,
          step: 0.5,
        },
      ],
    },
  ],
});

const WEIGHTS: readonly Choice[] = [
  { value: null, label: "MUI's own" },
  ...[300, 400, 500, 600, 700, 800, 900].map((weight) => ({ value: weight, label: String(weight) })),
];

const heading = (variant: "h1" | "h2" | "h3", title: string): GroupSpec => ({
  title,
  fields: [
    { path: `typography.${variant}.fontSize`, label: "Size", help: "Pixels, or any CSS length — clamp(28px, 4vw, 42px).", kind: "length", optional: true },
    { path: `typography.${variant}.lineHeight`, label: "Line height", help: "A number (1.1), or a CSS length.", kind: "length", optional: true },
    { path: `typography.${variant}.letterSpacing`, label: "Letter spacing", help: "A CSS length (-0.02em).", kind: "length", optional: true },
    { path: `typography.${variant}.fontWeight`, label: "Weight", kind: "select", choices: WEIGHTS },
  ],
});

const ARROW_PALETTES = [
  ["classic", "Classic — every board's"],
  ["lichess", "Lichess"],
  ["colorblind", "Colour-blind"],
] as const;
const NAG_TONES = [
  ["good", "Good (!)"],
  ["brilliant", "Brilliant (!!)"],
  ["interesting", "Interesting (!?)"],
  ["dubious", "Dubious (?!)"],
  ["mistake", "Mistake (?)"],
  ["blunder", "Blunder (??)"],
] as const;
const RESULTS = [
  ["white", "White wins"],
  ["draw", "Draw"],
  ["black", "Black wins"],
] as const;

/** The editor's sections, in the order of its tabs. */
export const SECTIONS: readonly SectionSpec[] = [
  { id: "theme", title: "Theme", preview: "ui", groups: [] },
  palette("light"),
  palette("dark"),
  {
    id: "typography",
    title: "Typography",
    preview: "ui",
    groups: [
      {
        title: "Font",
        fields: [
          { path: "typography.fontFamily", label: "Font family", help: "A CSS font stack, first choice first.", kind: "text", placeholder: "Roboto, sans-serif" },
          {
            path: "typography.fontFamilyMonospace",
            label: "Monospace font family",
            help: "Notation and machine words — SAN, a FEN, a PGN. Empty: the app's own stack.",
            kind: "text",
            placeholder: "ui-monospace, Menlo, monospace",
          },
        ],
      },
      heading("h1", "Heading 1 — a screen's title"),
      heading("h2", "Heading 2"),
      heading("h3", "Heading 3"),
      {
        title: "Buttons",
        fields: [
          { path: "typography.button.fontWeight", label: "Weight", kind: "select", choices: WEIGHTS },
          {
            path: "typography.button.textTransform",
            label: "Case",
            kind: "select",
            choices: [
              { value: null, label: "MUI's own (upper case)" },
              { value: "none", label: "As written" },
              { value: "uppercase", label: "Upper case" },
              { value: "capitalize", label: "Capitalised" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "components",
    title: "Shape & components",
    preview: "ui",
    groups: [
      {
        title: "Shape",
        fields: [{ path: "shape.borderRadius", label: "Corner radius", help: "Cards, fields, menus.", kind: "number", min: 0, max: 24, step: 1, unit: "px" }],
      },
      {
        title: "Buttons",
        fields: [
          { path: "components.buttonRadius", label: "Button corner radius", kind: "number", min: 0, max: 24, step: 1, unit: "px" },
          {
            path: "components.outlinedButtonBorder",
            label: "Outlined button's border",
            kind: "select",
            choices: [{ value: null, label: "MUI's own (1 px)" }, ...[1, 2, 3].map((width) => ({ value: width, label: `${width} px` }))],
          },
          { path: "components.buttonLip", label: "A darker lip along a contained button's bottom edge", kind: "toggle", on: { rest: 0.22, hover: 0.3 } },
        ],
      },
      {
        title: "The lip",
        when: "components.buttonLip",
        fields: [
          { path: "components.buttonLip.rest", label: "Its darkness at rest", kind: "number", min: 0, max: 1, step: 0.02 },
          { path: "components.buttonLip.hover", label: "Its darkness hovered", kind: "number", min: 0, max: 1, step: 0.02 },
        ],
      },
      {
        title: "The selected nav row",
        description: "The sidebar's row for the screen you are on.",
        fields: [
          { path: "components.selectedRow.radius", label: "Corner radius", kind: "number", min: 0, max: 24, step: 1, unit: "px" },
          { path: "components.selectedRow.rest", label: "Its primary tint", kind: "number", min: 0, max: 0.6, step: 0.02 },
          { path: "components.selectedRow.hover", label: "Its tint hovered", kind: "number", min: 0, max: 0.6, step: 0.02 },
          { path: "components.selectedRow.accent", label: "A bar along its start edge", kind: "number", min: 0, max: 6, step: 1, unit: "px" },
        ],
      },
      {
        title: "Links and chips",
        fields: [
          {
            path: "components.linkUnderline",
            label: "Links are underlined",
            kind: "select",
            choices: [
              { value: null, label: "MUI's own (always)" },
              { value: "always", label: "Always" },
              { value: "hover", label: "On hover" },
              { value: "none", label: "Never" },
            ],
          },
          { path: "components.chipFontWeight", label: "A chip's weight", kind: "select", choices: WEIGHTS },
        ],
      },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    preview: "ui",
    groups: [
      {
        title: "The focus ring",
        description: "Drawn around whatever the keyboard is on — at 3:1 against every surface.",
        fields: [
          { path: "light.focusRing", label: "Its colour — light", kind: "color" },
          { path: "dark.focusRing", label: "Its colour — dark", kind: "color" },
          { path: "focusRingWidth", label: "Its width", kind: "number", min: 1, max: 6, step: 1, unit: "px" },
        ],
      },
    ],
  },
  {
    id: "board",
    title: "Board",
    preview: "board",
    groups: [
      {
        title: "The squares",
        fields: [
          { path: "chess.board.lightSquare", label: "Light square", kind: "color" },
          { path: "chess.board.darkSquare", label: "Dark square", kind: "color" },
          { path: "chess.board.lightSquareNotation", label: "Coordinates on a light square", kind: "color" },
          { path: "chess.board.darkSquareNotation", label: "Coordinates on a dark square", kind: "color" },
        ],
      },
      {
        title: "Over the board",
        fields: [
          { path: "chess.lastMove", label: "The last move's fill", kind: "color" },
          { path: "chess.promotion.scrim", label: "The promotion picker's scrim", kind: "color" },
        ],
      },
    ],
  },
  {
    id: "arrows",
    title: "Arrows",
    preview: "board",
    groups: [
      ...ARROW_PALETTES.map(([id, title]) => ({
        title: `Next-move arrows: ${title}`,
        fields: [
          { path: `chess.arrowPalettes.${id}.mainline`, label: "The mainline's move", kind: "color" as const },
          { path: `chess.arrowPalettes.${id}.sideline`, label: "A side line's move", kind: "color" as const },
          { path: `chess.arrowPalettes.${id}.hovered`, label: "The hovered move", kind: "color" as const },
        ],
      })),
      {
        title: "The repertoires' arrows",
        fields: [
          { path: "chess.arrows.required", label: "A move you must play", kind: "color" },
          { path: "chess.arrows.untagged", label: "A continuation with no tag", kind: "color" },
          { path: "chess.arrows.chanceFill", label: "A play-chance arrow's fill", kind: "color" },
          { path: "chess.arrows.chanceBorder", label: "A play-chance arrow's border", kind: "color" },
        ],
      },
      {
        title: "The opening book's arrows",
        fields: [
          { path: "chess.book.known", label: "A book move", kind: "color" },
          { path: "chess.book.hovered", label: "The hovered book move", kind: "color" },
        ],
      },
    ],
  },
  {
    id: "annotations",
    title: "Annotations",
    preview: "board",
    groups: (["light", "dark"] as const).map((scheme) => ({
      title: `The move marks on the ${scheme} scheme's paper`,
      fields: NAG_TONES.map(([tone, label]) => ({ path: `chess.nag.${tone}.${scheme}`, label, kind: "color" as const })),
    })),
  },
  {
    id: "map",
    title: "Map & Library",
    preview: "map",
    groups: [
      {
        title: "The map's move dots",
        fields: [
          { path: "chess.map.whiteDot", label: "White's move", kind: "color" },
          { path: "chess.map.blackDot", label: "Black's move", kind: "color" },
        ],
      },
      ...RESULTS.map(([result, title]) => ({
        title: `The opening filter's result bar: ${title}`,
        fields: [
          { path: `chess.filterBoard.${result}.background`, label: "Its fill", kind: "color" as const },
          { path: `chess.filterBoard.${result}.text`, label: "Its percentage", kind: "color" as const },
        ],
      })),
    ],
  },
];

/** Every field of every section, with its section's id. */
export const FIELDS: readonly (FieldSpec & { section: string })[] = SECTIONS.flatMap((section) =>
  section.groups.flatMap((group) => group.fields.map((field) => ({ ...field, section: section.id }))),
);

/** The section whose field edits `token` — `undefined` for a token no field names. */
export const sectionOfToken = (token: string): string | undefined => FIELDS.find((field) => field.path === token)?.section;

/** A field's input id — how "jump to the token" finds it. */
export const fieldIdOf = (path: string): string => `theme-editor-field-${path.replaceAll(".", "-")}`;
