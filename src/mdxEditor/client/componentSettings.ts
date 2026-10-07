/**
 * **A component's settings, as a form** (CTA-137) — the MDX editor's Add
 * component, so a reader can set what a component takes without knowing
 * its props: each component's props described (`SETTINGS`, from
 * `views/home/frontPage/README.md`), its markup read into values
 * (`elementOf`) and written back from them (`writeElement`). The markup
 * stays the one source: the form shows what the code says, and a change in
 * the form rewrites the code — a prop the form does not know (`pgn={…}`,
 * `_id`) kept as it was written.
 */

type FieldBase = {
  /** The prop. */
  prop: string;
  /** The field's label. */
  label: string;
  /** What it does, under the field. */
  help?: string;
};

/** One prop as a field: words, a number, on or off, or one of a few. */
export type SettingField =
  /** `keepEmpty`: an empty value is written (`alt=""` — a decorative image), not left out. */
  | (FieldBase & { kind: "text"; placeholder?: string; keepEmpty?: boolean })
  /** A size as a slider: `<n><unit>` (`60%`, `50vh`); `none` is the component's own — the prop is left out there. */
  | (FieldBase & { kind: "slider"; min: number; max: number; step: number; unit: "%" | "vh"; none: number })
  | (FieldBase & { kind: "number"; placeholder?: string })
  /** `on` is the component's own default — the prop is written only when it differs. */
  | (FieldBase & { kind: "switch"; on: boolean })
  /** `""` (none chosen) leaves the prop out — the component's default. */
  | (FieldBase & { kind: "choice"; options: readonly { value: string; label: string }[]; none: string });

/** What the form holds: each prop's value — a string, or a switch's state; absent, the component's default. */
export type SettingValues = Readonly<Record<string, string | boolean | undefined>>;

const startMove: SettingField = {
  prop: "startMove",
  kind: "text",
  label: "Opens at",
  placeholder: "17, 17... or 1. e4 c5 2. Nf3",
  help: "A move number — 17 after White's 17th, 17... after Black's, 0 the start — or a line of moves, which may go into a side line. Empty: the start.",
};
const nextMoveArrows: SettingField = { prop: "showNextMoveArrow", kind: "switch", on: true, label: "Arrows to the next moves", help: "Drawn over the board; the moves stay in the list either way." };
const density: SettingField = {
  prop: "density",
  kind: "choice",
  label: "Density",
  none: "Normal",
  options: [{ value: "dense", label: "Dense — tighter rows" }],
};
const rowsPerPage: SettingField = {
  prop: "rowsPerPage",
  kind: "choice",
  label: "Rows a page",
  none: "All on one page",
  options: ["25", "50", "100", "250"].map((value) => ({ value, label: value })),
};
const losersFromRound: SettingField = {
  prop: "losersFromRound",
  kind: "number",
  label: "Losers' bracket from round",
  placeholder: "51",
  help: "Where a double elimination's losers' bracket starts — The Week in Chess numbers it from 51. Empty: a knockout.",
};
const playerLink: SettingField = { prop: "playerLink", kind: "switch", on: true, label: "Names link to their games", help: "Each name opens the collection filtered by that player." };
const gameLink: SettingField = { prop: "gameLink", kind: "switch", on: true, label: "Results link to the game", help: "Each result opens its game on the Library's board." };
/** A table that reads any source (CTA-140): its links are a Library source's alone. */
const libraryOnly = (field: SettingField): SettingField => ({ ...field, help: `${field.help ?? ""} A Library source only — a PGN has nowhere to link to.`.trim() });

/** `<ArticleImage>`'s look — what Images' Add an image sets before the image goes in, and an image's settings after. */
export const IMAGE_APPEARANCE: readonly SettingField[] = [
  { prop: "width", kind: "slider", label: "Width", min: 10, max: 100, step: 5, unit: "%", none: 100, help: "Of the article's column." },
  { prop: "maxHeight", kind: "slider", label: "Height at most", min: 10, max: 100, step: 5, unit: "vh", none: 100, help: "Of the window's height — 100 for no limit." },
  {
    prop: "align",
    kind: "choice",
    label: "Placed",
    none: "In the middle",
    options: [
      { value: "start", label: "At the start of the line" },
      { value: "end", label: "At its end" },
    ],
  },
  { prop: "fit", kind: "choice", label: "Kept to its height by", none: "Showing all of it", options: [{ value: "cover", label: "Cropping it to fill" }] },
  { prop: "rounded", kind: "switch", on: false, label: "Rounded corners" },
  { prop: "border", kind: "switch", on: false, label: "A thin border" },
  { prop: "shadow", kind: "switch", on: false, label: "A shadow" },
  { prop: "link", kind: "switch", on: false, label: "Opens full size on a click", help: "In a new tab." },
];

/** `<InlinePgnGame>`'s settings — `<InlinePgnGameColumns>` takes the same props (CTA-146). */
const INLINE_PGN_GAME: readonly SettingField[] = [
  { prop: "game", kind: "number", label: "Which game", placeholder: "1", help: "For a PGN holding several games, 1 the first." },
  { prop: "from", kind: "text", label: "From move", placeholder: "5", help: "The first move the reader can step back to — 5 after White's 5th, 5... after Black's. Empty: the start." },
  { prop: "to", kind: "text", label: "To move", placeholder: "15...", help: "The last move the reader can step to. Empty: the end." },
  { prop: "start", kind: "text", label: "Opens at", placeholder: "11 or 1. e4 c5", help: "Where the board opens: a move number, or a line of moves into a side line. Empty: the window's start." },
  { prop: "caption", kind: "text", label: "Caption", help: "A line above the board." },
  { prop: "orientation", kind: "choice", label: "Board faces", none: "White", options: [{ value: "black", label: "Black" }] },
  { prop: "variations", kind: "switch", on: true, label: "Side lines", help: "Off: the mainline alone." },
  { prop: "comments", kind: "switch", on: false, label: "The move's comment", help: "The PGN's comment on the move on screen, under the board." },
  { prop: "shapes", kind: "switch", on: true, label: "Arrows and circles from the comments", help: "Lichess's [%cal] and [%csl], drawn on the board." },
  nextMoveArrows,
];

/** Every component's settings, by its name — the ones the Components and Images sections edit. */
export const SETTINGS: Readonly<Record<string, readonly SettingField[]>> = {
  InlinePgnGame: INLINE_PGN_GAME,
  InlinePgnGameColumns: INLINE_PGN_GAME,
  CollectionGameBoard: [startMove, nextMoveArrows],
  StoredGameEmbed: [startMove, nextMoveArrows],
  CollectionCard: [
    { prop: "showGame", kind: "number", label: "The game on the board", placeholder: "1", help: "Its number in the collection." },
    { prop: "rows", kind: "number", label: "Rows in its table", placeholder: "8" },
    startMove,
    nextMoveArrows,
  ],
  RepertoireBoard: [
    { prop: "_id", kind: "text", label: "The repertoire's address", placeholder: "/repertoires/<id>", help: "As its page shows it. A reader without it sees the sample below." },
    {
      prop: "fallback",
      kind: "choice",
      label: "Where the reader has none",
      none: "Say it is not here",
      options: [
        { value: "e4-white", label: "The 1. e4 sample, for White" },
        { value: "caro-kann-black", label: "The Caro-Kann sample, for Black" },
      ],
    },
    startMove,
    nextMoveArrows,
  ],
  SwissStandingsTable: [density, rowsPerPage, libraryOnly(playerLink), libraryOnly(gameLink)],
  RoundRobinCrossTable: [density, rowsPerPage, libraryOnly(playerLink), libraryOnly(gameLink)],
  KnockoutBracket: [losersFromRound, density, libraryOnly(playerLink), libraryOnly(gameLink)],
  MatchTable: [density, rowsPerPage, libraryOnly(playerLink), libraryOnly(gameLink)],
  TeamStandingsTable: [
    density,
    rowsPerPage,
    libraryOnly({ ...playerLink, prop: "teamLink", label: "Teams link to their games", help: "Each team opens the collection filtered by its players." }),
    libraryOnly(gameLink),
  ],
  CollectionTournamentTable: [
    {
      prop: "format",
      kind: "choice",
      label: "Format",
      none: "The collection's mark, else a Swiss",
      options: [
        { value: "swiss", label: "Swiss — standings" },
        { value: "roundRobin", label: "Round robin — crosstable" },
        { value: "match", label: "Match" },
      ],
    },
    playerLink,
    gameLink,
    density,
    rowsPerPage,
  ],
  CollectionKnockoutBracket: [losersFromRound, playerLink, gameLink, density],
  CollectionDoubleEliminationBracket: [{ ...losersFromRound, help: "Where the losers' bracket starts. Empty: 51, as The Week in Chess numbers it." }, playerLink, gameLink, density],
  CollectionTeamStandingsTable: [{ ...playerLink, prop: "teamLink", label: "Teams link to their games", help: "Each team opens the collection filtered by its players." }, gameLink, density, rowsPerPage],
  // The mocks — a sketch of what they would take.
  PlayerGames: [{ prop: "player", kind: "text", label: "The player", placeholder: "Carlsen, Magnus", help: "As the PGN's White and Black tags name them." }],
  PuzzleBoard: [{ prop: "hideNextMoves", kind: "switch", on: false, label: "Next moves hidden", help: "Each shown once the reader plays it on the board." }],
  ArticleImage: [
    { prop: "alt", kind: "text", keepEmpty: true, label: "Alt text", help: "What the image shows, for a reader who cannot see it. Empty: decorative, said by no one." },
    { prop: "caption", kind: "text", label: "Caption", help: "A line under the image, seen by everyone." },
    ...IMAGE_APPEARANCE,
  ],
};

/** One prop as written: its name, and its value — a string, an expression's source, or a bare prop (true). */
export type Attribute = { prop: string; value: { string: string } | { expression: string } | { bare: true } };

/** A component's markup, read: its name and its props in order — `undefined` for anything but one self-closing element. */
export const elementOf = (code: string): { component: string; attributes: Attribute[] } | undefined => {
  const element = /^\s*<([A-Z][\w]*)((?:\s+[A-Za-z_$][\w$]*(?:=(?:"[^"]*"|\{(?:[^{}]|\{[^{}]*\})*\}))?)*)\s*\/>\s*$/.exec(code);
  if (element === null) return undefined;
  const attributes: Attribute[] = [];
  for (const match of element[2].matchAll(/([A-Za-z_$][\w$]*)(?:=(?:"([^"]*)"|\{((?:[^{}]|\{[^{}]*\})*)\}))?/g)) {
    const [, prop, text, expression] = match;
    attributes.push({ prop, value: text !== undefined ? { string: text } : expression !== undefined ? { expression: expression.trim() } : { bare: true } });
  }
  return { component: element[1], attributes };
};

/** The form's values from an element's props — a string as written, `{false}` / `{true}` / a bare prop as a switch, `{"…"}` and `{3}` as their text. */
export const valuesOf = (attributes: readonly Attribute[], fields: readonly SettingField[]): SettingValues => {
  const values: Record<string, string | boolean> = {};
  for (const field of fields) {
    const attribute = attributes.find((candidate) => candidate.prop === field.prop);
    if (attribute === undefined) continue;
    const { value } = attribute;
    if ("bare" in value) values[field.prop] = true;
    else if ("string" in value) values[field.prop] = field.kind === "switch" ? value.string !== "false" : value.string;
    else if (value.expression === "true" || value.expression === "false") values[field.prop] = value.expression === "true";
    else if (/^-?\d+$/.test(value.expression)) values[field.prop] = value.expression;
    else {
      try {
        const parsed: unknown = JSON.parse(value.expression);
        if (typeof parsed === "string") values[field.prop] = parsed;
      } catch {
        // An expression the form cannot show — kept in the code, left out of the form.
      }
    }
  }
  return values;
};

/** One field's value as markup — `undefined` to leave the prop out (empty, or the component's default). */
const attributeOf = (field: SettingField, value: string | boolean | undefined): string | undefined => {
  if (field.kind === "switch") {
    if (typeof value !== "boolean" || value === field.on) return undefined;
    return value ? field.prop : `${field.prop}={false}`;
  }
  if (field.kind === "slider") {
    const number = typeof value === "string" ? Number.parseFloat(value) : Number.NaN;
    return Number.isNaN(number) || number === field.none ? undefined : `${field.prop}="${number}${field.unit}"`;
  }
  if (field.kind === "text" && field.keepEmpty === true && typeof value === "string" && value.trim() === "") return `${field.prop}=""`;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  // A string with a double quote in it cannot be an attribute's quoted text: it is written as a string expression.
  return value.includes('"') ? `${field.prop}={${JSON.stringify(value)}}` : `${field.prop}="${value}"`;
};

/**
 * The element written again from the form: the props the form does not
 * know first, as they were written, then the form's in its order — each
 * left out where it is empty or the component's default.
 */
export const writeElement = (component: string, attributes: readonly Attribute[], fields: readonly SettingField[], values: SettingValues): string => {
  const known = new Set(fields.map((field) => field.prop));
  const kept = attributes
    .filter((attribute) => !known.has(attribute.prop))
    .map(({ prop, value }) => ("bare" in value ? prop : "string" in value ? `${prop}="${value.string}"` : `${prop}={${value.expression}}`));
  const set = fields.map((field) => attributeOf(field, values[field.prop])).filter((attribute): attribute is string => attribute !== undefined);
  return `<${component}${[...kept, ...set].map((attribute) => ` ${attribute}`).join("")} />`;
};

/**
 * Every `<name … />` in the body — where it starts and ends, and its
 * markup — read past quotes and braces, so a `>` inside an attribute's
 * text (`caption={"a > b"}`) does not end it. Only self-closing elements.
 */
export const elementsIn = (body: string, name: string): { start: number; end: number; code: string }[] => {
  const found: { start: number; end: number; code: string }[] = [];
  const opening = new RegExp(`<${name}(?=[\\s/>])`, "g");
  for (const match of body.matchAll(opening)) {
    let depth = 0;
    let quote: string | undefined;
    for (let index = match.index + match[0].length; index < body.length; index += 1) {
      const char = body[index];
      if (quote !== undefined) {
        if (char === "\\") index += 1;
        else if (char === quote) quote = undefined;
      } else if (char === '"' || char === "'") quote = char;
      else if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      else if (depth === 0 && char === ">") {
        if (body[index - 1] === "/") found.push({ start: match.index, end: index + 1, code: body.slice(match.index, index + 1) });
        break;
      }
    }
  }
  return found;
};
