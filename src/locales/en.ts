/**
 * UI chrome only — the app shell's brand, navigation labels and the accessible
 * names of its controls. Board screens render chess notation, which is
 * language-independent and deliberately stays out of here.
 */
const en = {
  app: {
    brandMark: "CT",
    brandText: "chessapp.dev",
  },
  /** The notice every session opens with (CTA-155) — `blocks/dialogs/DevelopmentNoticeDialog`. */
  developmentNotice: {
    title: "{{name}} is still in development",
    badge: "Early beta",
    intro: "This is an early beta, so please use it with caution. Here is what to know:",
    items: {
      local: { title: "Your data stays in this browser", text: "Games, analyses, repertoires and collections are saved on this device only." },
      export: { title: "Export it now and then", text: "Settings → Export downloads everything as one zip, so nothing is lost." },
      changes: { title: "Things may change or break", text: "Saved data may have to be imported again after an update." },
    },
    dismiss: "Dismiss",
  },
  nav: {
    ariaLabel: "Main navigation",
    toggleColorMode: "Toggle light and dark mode",
    switchLanguage: "Switch language",
    /**
     * The language switch's question while a screen holds unsaved work
     * (CTA-136): the language is in the address, so switching makes the
     * router anew and the screen remounts.
     */
    switchLanguageConfirm: {
      title: "Switch language?",
      message: "Switching language reloads the screen — unsaved changes will be lost.",
      confirm: "Switch",
      cancel: "Stay",
    },
    /**
     * The engine's lobby at `/engine/games` (CTA-82; "Saved games" until then):
     * the games played against the engine, and the new-game form whose Start
     * button is how Play with Engine is reached — it has no nav entry of its own.
     */
    lobby: "Lobby",
    /** Play with Engine with the pieces in disguise (`/engine/masked`, CTA-79), beside the Lobby in the Engine folder. */
    maskedPlay: "Masked Pieces",
    analysisBoard: "Analysis Board",
    /** The Openings explorer (CTA-78) — shown under the folder's own name, a single entry. */
    openings: "Openings explorer",
    /** The reader's own repertoires (CTA-61) — shown under the folder's own name, a single entry (CTA-84). */
    repertoires: "My repertoires",
    /** The Blog's index (CTA-126), `/blog`. */
    blogIndex: "All articles",
    /** The Library's two screens (CTA-75): the collections, and adding one. */
    libraryCollections: "Collections",
    addCollection: "Add collection",
    /** Settings' Export tab (CTA-86), in the Settings folder. */
    settingsExport: "Export",
    /** Settings' Import tab (CTA-89), in the Settings folder. */
    settingsImport: "Import",
    /** Settings' Storage tab (CTA-94), in the Settings folder. */
    settingsStorage: "Storage",
    /** Settings' Appearance tab (CTA-107), in the Settings folder. */
    settingsAppearance: "Appearance",
    /** Settings' Engine tab (CTA-153), in the Settings folder. */
    settingsEngine: "Engine",
    /** Settings' Support tab (CTA-155), in the Settings folder. */
    settingsSupport: "Support",
    /** The dev-only design gallery (CTA-107), in the Development folder. */
    designSystem: "Design system",
    /** The dev-only theme editor (CTA-115), in the Development folder. */
    themeEditor: "Theme editor",
    /** The MDX editor (CTA-137, `yarn mdx-editor:start` only): its article lobby and the editor itself, in its own folder — and its Components gallery (CTA-140). */
    mdxArticles: "Articles",
    mdxEditor: "Editor",
    mdxComponents: "Components gallery",
    /** The Jobs screen (CTA-173), in the Analyses folder beside its Lobby. */
    jobs: "Jobs",
    /** Sidebar folders — groupings over the routes, never routes themselves. */
    folders: {
      engine: "Engine",
      analysisBoard: "Analyses",
      openings: "Openings",
      repertoires: "Repertoires",
      /** The Blog (CTA-126) — MDX articles in nested folders, named by their data. */
      blog: "Blog",
      /**
       * The Library (CTA-75). Its collections are not folders here — they are
       * the rows of `/library`, named from their files and uploads.
       */
      library: "Library",
      /** The app's own settings (CTA-86) — one screen per tab. */
      settings: "Settings",
      /** The dev-only Development section (`chessboard.md` §9.5). */
      development: "Development",
      /** The MDX editor's own folder (CTA-137) — only under `yarn mdx-editor:start`. */
      mdxEditor: "MDX editor",
    },
  },
  /** The index screen — a landing page linking out to the real screens. */
  home: {
    /** The front page's embedded stored games (CTA-126) — `<CollectionGameBoard>`, `<StoredGameEmbed>`. */
    embed: {
      loading: "Loading the game…",
      missing: "The game this page embeds is not here.",
      label: "{{players}} — game board",
      start: "Play the game's first move",
      open: "Open on the Analysis Board",
      white: "White",
      black: "Black",
    },
    /** `<RepertoireBoard>` (CTA-126). */
    repertoire: {
      loading: "Loading the repertoire…",
      missing: "The repertoire this page embeds is not on this device.",
      untitled: "Untitled repertoire",
      forWhite: "A repertoire for White",
      forBlack: "A repertoire for Black",
      sampleNote: "A sample repertoire that comes with the app",
      label: "{{name}} — repertoire board",
      start: "Play a move of the repertoire",
      open: "Open the repertoire",
      add: "Add your own repertoire",
      samples: {
        "e4-white": "1. e4 for White",
        "caro-kann-black": "The Caro-Kann for Black",
      },
    },
    /** `<CollectionCard>` (CTA-126). */
    collection: {
      loading: "Loading the collection…",
      missing: "The collection this page embeds is not here.",
      games_one: "{{formatted}} game",
      games_other: "{{formatted}} games",
      open: "Open the collection",
      table: "Games of {{name}}",
      empty: "No games",
      earlier: "Earlier games",
      later: "Later games",
      columns: {
        number: "No.",
        white: "White",
        black: "Black",
        result: "Result",
        year: "Year",
      },
    },
  },
  /** The front page's demo mini-boards (CTA-126, `views/shared/DemoBoard.tsx`). */
  /** The Blog (CTA-126, `views/blog/`). */
  blog: {
    title: "Blog",
    breadcrumbs: "Where this is in the Blog",
    folders: "Folders",
    articlesHeading: "Articles",
    articles_one: "{{count}} article",
    articles_other: "{{count}} articles",
    openFolder: "Open {{name}}",
    noArticles: "No articles here yet",
    loading: "Loading the article…",
    missingTitle: "Not found",
    missingArticle: "There is no article at this address.",
    missingFolder: "There is no Blog folder at this address.",
    /** A draft's mark — shown in `yarn dev` only, where drafts are listed (CTA-135). */
    draft: "Draft",
    /** The line under an article's title (CTA-135): its frontmatter's `date` and `updated`. */
    published: "Published {{date}}",
    updated: "Updated {{date}}",
  },
  /** `<InlinePgnGame>` (CTA-126): an excerpt of a game in an article (`views/shared/ExcerptBoard.tsx`). */
  inlinePgn: {
    label: "The game, from {{from}} to {{to}}",
    start: "The start",
    moves: "The moves",
    first: "To the first move shown",
    back: "One move back",
    next: "One move on",
    last: "To the last move shown",
    flip: "Flip the board",
    unreadable: "This game's PGN does not read.",
    white: "White",
    black: "Black",
  },
  demoBoard: {
    reset: "Back to the start",
    back: "Take back a move",
    next: "Next move",
    flip: "Flip the board",
    start: "Play a move",
    end: "The line ends here",
    moves: "Moves from here",
  },
  /**
   * Each screen's name (CTA-112) — its route's `handle.title`: the page title
   * ("Lobby — chessapp.dev", the open record's name before it), the
   * `main` landmark's name and the page's `h1`.
   */
  pages: {
    home: "Home",
    /** The Blog (CTA-126) — every page of it, one route (CTA-135): a folder's or an article's name goes first. */
    blog: "Blog",
    playWithEngine: "Play with Engine",
    lobby: "Lobby",
    maskedPieces: "Masked Pieces",
    analysisBoard: "Analysis Board",
    savedAnalyses: "Saved analyses",
    analysisSettings: "Analysis settings",
    openings: "Openings explorer",
    repertoires: "My repertoires",
    newRepertoire: "New repertoire",
    repertoire: "Repertoire",
    repertoireSettings: "Repertoire settings",
    repertoireGame: "Repertoire game",
    library: "Library",
    addCollection: "Add collection",
    collection: "Collection",
    collectionSettings: "Collection settings",
    libraryGame: "Library game",
    settings: "Settings",
    designSystem: "Design system",
    themeEditor: "Theme editor",
    mdxEditor: "MDX editor",
    mdxArticles: "MDX editor — articles",
    mdxComponents: "MDX editor — components gallery",
    /** The background jobs (CTA-173). */
    jobs: "Jobs",
    /** The legal pages (CTA-159), reached from the footer. */
    privacy: "Privacy Policy",
    cookies: "Cookies Notice",
  },
  /**
   * **Each screen's description** (CTA-136) — its page's `<meta name="description">`
   * and the words under its title in a shared link's preview, keyed as
   * `pages.*`. Every screen the build pre-renders has one
   * (`views/main/documentHead.ts`).
   */
  pageDescriptions: {
    home: "A chess trainer in the browser: play the engine, analyse games, explore openings, drill your repertoires and replay master games.",
    blog: "Articles about the app and about chess: tournaments told through their games, and how to write an article with live boards and tables.",
    playWithEngine: "Play a game against Stockfish in your browser, at the strength you choose, with the evaluation and the moves beside the board.",
    lobby: "Your games against the engine, newest first — carry one on or review it, or start a new game from any position.",
    maskedPieces: "Play the engine with the pieces in disguise, and train your board vision by remembering what stands where.",
    analysisBoard: "Analyse a game or a position with Stockfish: side lines, comments, arrows and the engine's best lines, kept in your browser.",
    savedAnalyses: "Your analysis boards, kept in your browser and filed in folders.",
    openings: "Explore the chess openings move by move: every named line, and where each move leads.",
    repertoires: "Your opening repertoires, and a trainer that plays against you from them.",
    newRepertoire: "Bring in an opening repertoire from a PGN file or pasted text.",
    library: "Collections of chess games — Alekhine, Capablanca, Fischer, Petrosian, Tal and this year's tournaments — and your own, to search and replay.",
    addCollection: "Add a collection of games to the Library from a PGN file, a zip or pasted text.",
    collection: "A collection of chess games: search it, filter by player, opening, event and date, and replay any game on a board.",
    /** A shipped collection's own page (`/library/<collection>`) — its name and its count. */
    collectionNamed: "{{name}}: {{games}} chess games to search, filter by player, opening, event and date, and replay on a board.",
    settings: "Export your data as one zip and bring it back, see how much space it takes, and choose how the app looks.",
    jobs: "Your background jobs — a game's computer analysis — with their progress, results and reports.",
    privacy: "What chessapp.dev keeps on your device, what it never collects, and your rights under the GDPR and Israel's Protection of Privacy Law.",
    cookies: "chessapp.dev sets no cookies. Every item it stores in your browser — preferences and your own chess data — and why.",
  },
  /**
   * **A shared link's image** (CTA-136, `lib/shareImage.ts`): the words read
   * out for a screen's section image, and for the site's own — the last of
   * the chain, for a page with no image nearer to it.
   */
  share: {
    defaultImageAlt: "chessapp.dev — a chessboard beside the app's name",
    sections: {
      engine: "Play with Engine — a chessboard beside the section's name",
      analysis: "Analysis Board — a chessboard beside the section's name",
      openings: "Openings explorer — a chessboard beside the section's name",
      repertoires: "Repertoires — a chessboard beside the section's name",
      library: "Library — a chessboard beside the section's name",
      blog: "Blog — a chessboard beside the section's name",
      settings: "Settings — a chessboard beside the section's name",
    },
  },
  /** The app shell's own words for a screen reader (CTA-112). */
  shell: {
    /** The first stop of the tab order: straight to the screen. */
    skipToMain: "Skip to main content",
    /** The right-hand panel's landmark name. */
    sidePanel: "Side panel",
    /**
     * The header button that opens the navigation under a narrow window
     * (CTA-118), where the sidebar is a drawer rather than a rail.
     */
    openNav: "Open navigation",
  },
  /**
   * How a composite widget is worked (CTA-112) — read with it by a screen
   * reader (`aria-describedby`), not shown: a tree's and a table's keys are
   * not a web page's.
   */
  hints: {
    tree: "Up and down arrows to move, right to open, left to close, Enter to go.",
    table: {
      sortAndPick: "Sort by a column from its header button. Tick a row's box to pick it.",
    },
  },
  language: {
    en: "English",
    he: "עברית",
  },
  panel: {
    /** The right-hand column, a placeholder until it holds an eval bar / move list. */
    analysisTitle: "Analysis",
    analysisPlaceholder: "Evaluation and move list will appear here.",
  },
  /**
   * The shared board controls and the shared tag table (`BoardControls.tsx`,
   * `GameInfo.tsx`). Chrome only — SAN itself is language-independent.
   */
  gamePanel: {
    /** The board panel's tab strip, named (CTA-113). */
    tabs: "Board panel",
    /** Accessible names for the icon-only board controls. */
    controls: {
      /** The row's name as a toolbar (CTA-113). */
      label: "Moves",
      first: "Start position",
      previous: "Previous move",
      next: "Next move",
      last: "Final position",
      flip: "Flip board",
    },
    info: {
      /** The tag list's accessible name (CTA-113). */
      title: "Game details",
      empty: "Load a game to see its details.",
      /** Labels for the PGN tags worth naming; anything else shows its raw tag. */
      event: "Event",
      site: "Site",
      date: "Date",
      round: "Round",
      white: "White",
      black: "Black",
      result: "Result",
      eco: "ECO",
      opening: "Opening",
      timeControl: "Time control",
      termination: "Termination",
    },
  },
  /** The evaluation bar and the captured-pieces strips — on every play/analysis board. */
  board: {
    evalBar: "Evaluation",
    capturedByWhite: "Captured by White",
    capturedByBlack: "Captured by Black",
    /**
     * The player plates at the strips' left end (CTA-105) — the parts of one
     * plate's spoken label, each present only when the plate shows it.
     */
    playerWhite: "White player",
    playerBlack: "Black player",
    playerRating: "rating {{elo}}",
    playerResult: "result {{result}}",
  },
  /** The engine's lines — `views/shared/BestVariations.tsx`, on three screens. */
  variations: {
    /**
     * The header checkbox's label (CTA-56) — the checkbox is the block's own
     * control: clearing it hides the lines, for analysing on one's own.
     */
    title: "Variations",
    depth: "Depth {{depth}}",
    thinking: "Waiting for the engine…",
    partial: "{{shown}} of {{requested}} lines so far.",
    /**
     * The row's chevron's spoken label (CTA-56) — an `aria-label` over an
     * icon, which says none of this on its own, so it has to carry the
     * variation and the score itself.
     */
    expand: "Variation {{rank}}, {{score}} — show the full line",
    collapse: "Variation {{rank}}, {{score}} — collapse the line",
  },
  /** The promotion picker — `views/shared/PromotionPicker.tsx`, on two screens. */
  promotion: {
    title: "Choose a piece",
    pieces: {
      q: "Queen",
      r: "Rook",
      n: "Knight",
      b: "Bishop",
    },
  },
  /** What the engine forms (`blocks/forms`) say about an option they cannot drive. */
  engineOption: {
    /** Shown under a control the running engine build does not have. */
    unsupported: "This engine build has no \"{{option}}\" option.",
    /** Shown under a control the build declares but pins to a single value. */
    fixed: "This engine build fixes {{option}} at {{value}}.",
  },
  /** A read-only notation field — `views/shared/CopyableValue.tsx`, on two screens. */
  copyable: {
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Could not copy — select the text and copy it by hand.",
  },
  /**
   * The saved lists' controls, named for their record (CTA-113) — the saved
   * analyses, the repertoires and the Library's folders share them, so a
   * screen reader hears which row a button belongs to.
   */
  savedList: {
    openNamed: "Open {{name}}",
    selectNamed: "Select {{name}}",
    settingsNamed: "Settings of {{name}}",
    clearSelected: "Clear the selection",
    /** The folder trail's name, read before its steps. */
    breadcrumb: "Folders",
    folder: {
      openNamed: "Open folder {{name}}",
      newNamed: "New folder in {{name}}",
      uploadNamed: "Upload a collection into {{name}}",
      downloadNamed: "Download {{name}} as PGN",
      renameNamed: "Rename {{name}}",
      moveNamed: "Move {{name}}",
      deleteNamed: "Delete {{name}}",
    },
  },
  /**
   * Piece masking — the Masking tab of Masked Pieces (`views/engine/masked/`,
   * CTA-79), and the Saved games list's marker. Top-level like the other
   * shared-component namespaces: the mask is a prop the shared move list,
   * explorer and variations take, not something one screen owns.
   */
  masking: {
    tab: "Masking",
    white: "White",
    black: "Black",
    /** Over the twelve controls: what each real piece is drawn as. */
    drawnAs: "Drawn as",
    presets: {
      title: "Masking policy",
      /** The three policies of the specification's variants table (§8). */
      identity: "Show real pieces",
      nonPawns: "Non-pawns as pawns",
      allIdentical: "All pieces identical",
    },
    /** The six piece names, for the rows and the choices in them. */
    pieces: {
      k: "King",
      q: "Queen",
      r: "Rook",
      b: "Bishop",
      n: "Knight",
      p: "Pawn",
    },
    notation: "Hide masked pieces in the notation",
    notationHint:
      "A move by a masked piece is written as coordinates (g1f3) wherever a move is written — the move list, the map, the next moves, the engine's lines — so the notation does not name what the board is hiding.",
    /** The pinned engine lines' switch — off by default (CTA-79). */
    lines: "Show the engine's best lines",
    linesHint:
      "Off by default: an engine line is a list of the pieces the mask is hiding. The evaluation bar and the score are unaffected.",
    /** The Saved games list's marker on a game played on Masked Pieces. */
    marker: "Masked",
  },
  /**
   * The variations explorer's right-click menu on a move (CTA-64) — shared by
   * whichever board passes `onEditTree` to `TreeMoveList`.
   */
  moveMenu: {
    promote: "Promote variation",
    makeMainline: "Make main line",
    deleteFrom: "Delete from here",
    copyPgn: "Copy variation PGN",
    addComment: "Add comment",
    addAnnotation: "Add annotation…",
    shapes: "Arrows and circles…",
    playChances: "Play chances…",
    copied: "Variation PGN copied",
    copyFailed: "Could not copy — the clipboard is not available here.",
    deleteTitle: "Delete from",
    /** `moves` and `lines` are the two counts below, already worded. */
    deleteSummary: "{{moves}} / {{lines}} will be deleted.",
    moves_one: "{{count}} move",
    moves_other: "{{count}} moves",
    lines_one: "{{count}} line",
    lines_other: "{{count}} lines",
    delete: "Delete",
    cancel: "Cancel",
  },
  /**
   * How likely the trainer is to play each move at a branch (CTA-69) —
   * lichess-tools' `prc:N`, set per branch. The rules: `lib/playChance.ts`.
   */
  playChance: {
    title: "Play chances after",
    titleStart: "Play chances at the start",
    help: "How often the trainer plays each move here. Leave a field empty for automatic: moves with more lines in the next 8 plies are played more often. Numbers are scaled to 100%; 0 means never. Saved as prc:N in the move's comment, as lichess-tools writes it.",
    move: "Move",
    mark: "Chance",
    lines: "Lines",
    chance: "Played",
    auto: "Auto",
    /** The sum of the numbers typed, before scaling. */
    total: "Set: {{total}}% — scaled to 100%, the rest shared by the automatic moves.",
    invalid: "A chance is a number from 0 to 100.",
    save: "Save",
    cancel: "Cancel",
  },
  /** Adding or editing one comment on a move (CTA-69). */
  /**
   * The move menu's *Add annotation…* (CTA-97) — a move's NAG glyphs in three
   * tabs, one per section of `lib/moveAnnotations.ts`'s table. `meaning.*` is
   * keyed by each choice's `id` there.
   */
  /**
   * The arrows and circles a move's comment draws (CTA-143) — lichess's
   * `[%cal]` / `[%csl]`, managed from the move menu.
   */
  shapesDialog: {
    title: "Arrows and circles",
    help: "Drawn on the board at this move. On the board itself, right-drag to draw an arrow and right-click a square for a circle (Shift red, Alt blue, both yellow). Saved with the changes, in the move's comment as lichess writes them.",
    list: "Drawn at this move",
    empty: "Nothing is drawn at this move.",
    arrow: "Arrow",
    circle: "Circle",
    brush: "Colour",
    brushes: { green: "Green", red: "Red", yellow: "Yellow", blue: "Blue" },
    /** `shape` is the row's shape, already worded ("Arrow e2 → e4"). */
    recolour: "{{shape}}: {{brush}}",
    remove: "Remove {{shape}}",
    removeAll: "Remove all",
    add: "Add",
    kind: "Shape",
    from: "From",
    to: "To",
    at: "Square",
    square: "A square, a1 to h8",
    exists: "Already drawn in this colour.",
    close: "Close",
  },
  nagDialog: {
    title: "Annotate",
    help: "One move assessment and one evaluation at a time; pick the active one again to remove it. Features are toggled one by one. Saved with the changes, as NAGs in the PGN.",
    close: "Close",
    tabs: {
      move: "Move Assessment",
      position: "Position Evaluation",
      features: "Positional Features & Commentary",
    },
    meaning: {
      good: "Good move",
      mistake: "Poor move or mistake",
      brilliant: "Very good or brilliant move",
      blunder: "Very poor move or blunder",
      interesting: "Interesting or speculative move",
      dubious: "Questionable or dubious move",
      forced: "Only move / forced move",
      worst: "Worst move",
      equal: "Equal position",
      unclear: "Unclear or volatile position",
      whiteSlight: "White has a slight advantage",
      blackSlight: "Black has a slight advantage",
      whiteModerate: "White has a moderate advantage",
      blackModerate: "Black has a moderate advantage",
      whiteDecisive: "White has a decisive advantage",
      blackDecisive: "Black has a decisive advantage",
      zugzwangWhite: "Zugzwang (White)",
      zugzwangBlack: "Zugzwang (Black)",
      initiativeWhite: "Initiative (White)",
      initiativeBlack: "Initiative (Black)",
      attackWhite: "Attack (White)",
      attackBlack: "Attack (Black)",
      compensation: "Compensation",
      counterplay: "Counterplay",
      zeitnot: "Zeitnot (severe time pressure)",
      withIdea: "With the idea of…",
      novelty: "Opening novelty",
    },
  },
  commentDialog: {
    label: "Comment",
    addTitle: "Comment on",
    editTitle: "Edit the comment on",
    placeholder: "What is there to say about this move?",
    help: "Saved with the repertoire's changes. Ctrl+Enter saves. [%eval …]-style commands are kept as written.",
    save: "Save",
    cancel: "Cancel",
  },
  /**
   * The variations explorer's tree map (CTA-63, shared since CTA-72) — a
   * game tree drawn as a tree, in a tab and full screen.
   */
  treeMap: {
    toolbar: "Map controls",
    title: "Map",
    covered: "Lines covered: {{covered}} of {{total}}",
    label: "The repertoire as a tree: covered lines in green, your way here highlighted",
    here: "You are here",
    left_one: "{{count}} line left",
    left_other: "{{count}} lines left",
    done: "Every line is covered.",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fullScreen: "Open the map full screen",
    fit: "Fit the whole tree",
    close: "Close the map",
    mouseHint: "Scroll to zoom, drag to move",
    showMoves: "Show moves",
    zoomToRead: "Zoom in to read the moves",
    goTo: "Go to {{move}}",
    size: "{{lines}}, {{moves}}",
    lines_one: "{{count}} line",
    lines_other: "{{count}} lines",
    moves_one: "{{count}} move",
    moves_other: "{{count}} moves",
    added_one: "{{count}} added",
    added_other: "{{count}} added",
  },
  /**
   * The variations explorer's comment block (CTA-69, shared since CTA-72):
   * what the PGN says at the position on screen — its comments, and the
   * attributes read out of them.
   */
  annotations: {
    title: "Comment",
    /** The comment opening a variation, above the ones after its move. */
    before: "Before this move",
    add: "Add a comment",
    edit: "Edit this comment",
    delete: "Delete this comment",
    /**
     * An attribute's name. `[%key value]` commands the app does not know
     * print their own key; these are the ones it does.
     */
    keys: {
      eval: "Eval",
      depth: "Depth",
      mate: "Mate in",
      assessment: "Assessment",
      clk: "Clock",
      emt: "Time spent",
      cal: "Arrows",
      csl: "Squares",
      prc: "Play chance",
      games: "Games",
    },
  },
  moveList: {
    title: "Moves",
    /** Ply 0, a selectable entry of its own. */
    startPosition: "Start position",
    noMoves: "This game has no moves.",
    /** Read by a screen reader before a side line's moves. */
    variation: "Variation",
  },
  /**
   * The Play with Engine screen — and Masked Pieces, which is that screen with
   * the pieces in disguise and so says all the same things about tabs, turns
   * and settings. Chrome only: SAN, the scores and the depth are notation and
   * numbers, and stay language-independent.
   */
  playEngine: {
    tabs: {
      engine: "Engine",
      /** Play with Engine v2's (CTA-74) — the variations explorer's move list. */
      moves: "Moves",
    },
    /**
     * A resumed game whose own engine cannot run on this page (CTA-153): the
     * default plays on, and the record keeps naming the one that played.
     */
    /** The Engine tab's first line (CTA-153): which engine plays this game. */
    enginePlaying: "Played by",
    engineFallback:
      "This game was played with {{wanted}}, which cannot run here, so {{using}} plays on. The game's record still names {{wanted}}.",
    /** Play with Engine v2's header controls (CTA-74). */
    game: {
      /**
       * The header's first control (CTA-91): the way back to the Lobby — an
       * arrow named by where it goes.
       */
      backToLobby: "Back to the Lobby",
      replay: "Replay — start over",
      resign: "Resign",
      cancel: "Cancel",
      replayConfirm: {
        title: "Start over?",
        body: "This game's saved progress is discarded and a new game begins from the start.",
        confirm: "Start over",
      },
      resignConfirm: {
        title: "Resign this game?",
        body: "You lose the game. You can still step through it and analyse it.",
        confirm: "Resign",
      },
      /** The footer's line once resigned. */
      resigned: "You resigned · {{result}}",
      /** The footer's line for an ending decided on the board (CTA-91). */
      ended: "Game over · {{result}}",
      /**
       * The game-over button (CTA-91): the ended game, opened on the
       * Analysis Board.
       */
      openAnalysis: "Open in analysis",
    },
    settings: {
      /** The engine's on/off switch above the tab strip — the tab's own name. */
      engineOn: "Engine",
      strength: "Strength",
      /** The engine has no ELO setting, so the figure is named as an estimate. */
      strengthValue: "Level {{level}} (≈{{elo}} Elo)",
      /** An engine that takes its strength as an Elo (CTA-153): the slider is the Elo itself, not an estimate. */
      strengthElo: "Strength (Elo)",
      strengthEloValue: "{{elo}} Elo",
      depth: "Search depth",
      moveTime: "Move time",
      moveTimeValue: "{{seconds}}s",
      moveTimeNone: "No limit",
      multiPv: "Variations to show",
      threads: "Threads",
      /** A neutral caption under the Threads slider (CTA-163). */
      threadsHelp: "Engine CPU cores",
      hash: "Hash (MB)",
      /** A neutral caption under the Hash slider (CTA-163). */
      hashHelp: "Engine memory (RAM)",
      playAs: "Play as",
      white: "White",
      black: "Black",
      evalBar: "Show evaluation bar",
    },
  },
  /**
   * The engine's **Lobby** (`views/engine/games/`; the Saved games list of
   * CTA-74, a lobby since CTA-82) — the games, flat and newest first, each a
   * tree resumed where the reader left it, with their filters; and the
   * new-game form in the right-hand panel.
   */
  playedGames: {
    title: "Lobby",
    count: "Games: {{count}}",
    /** The count while a filter narrows the list. */
    countFiltered: "Games: {{shown}} of {{count}}",
    /** A filter that leaves nothing. */
    noMatch: "No games match these filters.",
    filters: {
      /** The side the reader played. */
      color: "Your side",
      all: "All",
      white: "White",
      black: "Black",
      /** The opening each game reached — the deepest one the book names along its mainline. */
      opening: "Opening",
      allOpenings: "All openings",
      openingLoading: "Reading the openings…",
    },
    /**
     * The games table (CTA-100): its sort headers, what a cell with nothing
     * to say says, and its pagination — the Library table's own words.
     */
    table: {
      /** The columns, left to right — every one a sort header. */
      columns: {
        white: "White",
        whiteElo: "Elo",
        black: "Black",
        blackElo: "Elo",
        result: "Result",
        opening: "Opening",
        moves: "Moves",
        /** The Masked column — the chip's own word. */
        masked: "Masked",
        date: "Date",
      },
      /** The reader's side of an Elo cell — an estimate is the engine's alone. */
      unknown: "Unknown",
      rowsPerPage: "Rows per page",
      /** The table's accessible name (CTA-109). */
      label: "Your games",
      /** The row actions' column — named for a screen reader, blank on screen. */
      actions: "Actions",
    },
    /** The right-hand panel: a new game's options, and the button that starts it. */
    newGame: {
      title: "New game",
      side: "Play as",
      white: "White",
      black: "Black",
      /**
       * The Variations checkbox under the eval bar (CTA-90) — the same choice
       * as the pinned block's own header checkbox: whether the new game
       * starts with the engine's lines shown.
       */
      variations: "Variations",
      start: "Start",
      /** The form's two tabs (CTA-83). */
      tabs: {
        game: "Game",
        editor: "Board editor",
      },
      /** On the Game tab while the Board editor holds a position other than the standard start. */
      customPosition: "The game starts from a custom position.",
      customPositionEdit: "Edit",
      customPositionReset: "Use the standard start",
      /** Above Start while the edited position cannot be played from. */
      illegal: "Start is off until the position in the Board editor can be played from.",
    },
    loading: "Reading your saved games…",
    empty: "No saved games yet. Play a game against the engine and it appears here on its own.",
    storage: "Your games are kept in this browser only. Clearing site data removes them, and they do not follow you to another device.",
    /**
     * What a row is called (CTA-109) — its pick's, its Analysis' and its
     * Continue's names: the pairing, White first, and the day it was begun,
     * so no two rows' controls read alike.
     */
    rowTitle: "the game {{white}} – {{black}} of {{date}}",
    /** A row whose PGN will not parse has no pairing to name it by. */
    unreadableTitle: "the unreadable game of {{date}}",
    human: "Human",
    /** The engine (CTA-153): its own name, and how its strength was set — a Skill Level, or an Elo. */
    engineNamed: "{{name}} level {{level}}",
    engineElo: "{{name}} Elo {{elo}}",
    moves_one: "{{count}} move",
    moves_other: "{{count}} moves",
    variations_one: "{{count}} side line",
    variations_other: "{{count}} side lines",
    unreadable: "This game could not be read.",
    /** A row's two actions (CTA-109), each named by its row — the tooltip says the same. */
    continueRow: "Continue {{title}}",
    analyseRow: "Analyse {{title}}",
    /** The row's pick checkbox: tick it to mark the game for the header's delete. */
    pick: "Pick {{title}}",
    /** The pick column's select-all: the rows the table shows, on every page. */
    selectAll: "Select all the games the table shows",
    /** The header's delete of the ticked rows, saying how many are ticked. */
    deletePicked: "Delete picked ({{count}})",
    confirmDelete: {
      /** Asking before the ticked rows go — one game or many. */
      title_one: "Delete the picked game?",
      title_other: "Delete {{count}} picked games?",
      body_one: "It is removed from this browser, side lines and all.",
      body_other: "They are removed from this browser, side lines and all.",
      cancel: "Cancel",
      confirm: "Delete",
    },
    problem: {
      storage: "The game could not be saved — this browser's storage refused it.",
    },
  },
  /**
   * The **Saved analyses** screen — the boards the reader has worked on at the
   * Analysis Board (`views/tools/analysis/saved/`): how many side lines were
   * tried, and how far in the reader had got.
   */
  savedAnalyses: {
    title: "Saved analyses",
    count: "Analyses: {{count}}",
    loading: "Reading your saved analyses…",
    empty:
      "No saved analyses yet. Work on a board at the Analysis Board and save it, and it appears here.",
    hint: "Every analysis you save on the Analysis Board is kept here — side lines, comments and all — filed into your folders. Open one to pick it up where you left it.",
    /** Said plainly: this is a browser, not a backup — as the Uploads screen does. */
    storage:
      "Saved analyses are kept in this browser only. Clearing site data removes them, and they do not follow you to another device.",
    /**
     * A board that is not a game: one begun from an empty board or from a
     * position carries no players to name it by, so it is named for what it is.
     */
    untitled: "Analysis board",
    /** Plural forms, because a one-move analysis is a real row here. */
    moves_one: "{{count}} move",
    moves_other: "{{count}} moves",
    /** Every move past the mainline — the side lines the reader tried and kept. */
    variations_one: "{{count}} variation",
    variations_other: "{{count}} variations",
    /** Where the reader stopped, as a half-move count from the start position. */
    atPly: "at ply {{ply}}",
    /** A stored record whose PGN no longer parses: it can only be deleted. */
    unreadable: "This analysis could not be read.",
    /**
     * The three-way view toggle in the top bar: the list the screen shipped
     * with, and the library list screen's own two board sizes.
     */
    view: {
      label: "View",
      list: "List",
      compact: "Small boards",
      comfortable: "Big boards",
    },
    /** Opens it on the Analysis Board — the one destination (CTA-73). */
    open: "Open",
    /**
     * The top-bar button to the Analysis Board — the screen the sidebar's
     * single Analysis entry hides (CTA-58), so the board is reached from here.
     */
    new: "New",
    /**
     * The panel's new-analysis form (CTA-87): the shared position editor, and
     * the Start that opens the board on the edited position.
     */
    newAnalysis: {
      title: "New analysis",
      start: "Start",
      /** Above Start while the position in the editor cannot be analyzed. */
      illegal: "Start is off until the position in the board editor can be analyzed.",
      /** The editor's resets, in the form's header — the panel says "board", the buttons need not. */
      new: "New",
      clear: "Clear",
      flip: "Flip",
      /** The `.pgn` file pick beside the FEN field. */
      pgnFile: "PGN",
      /** The paste box under the editor — the file pick is above it, so no "or". */
      pasteLabel: "Paste PGN text",
    },
    /** Picking analyses and taking them out as one `.pgn`, side lines and all. */
    select: "Select this analysis",
    selectAll: "Select all analyses",
    selected: "{{count}} selected",
    /** The pager under the list and the table (CTA-113) — the design system's page sizes. */
    rowsPerPage: "Analyses per page",
    /**
     * The list view's games table (CTA-144): one row per analysis, its columns
     * the game's own fields read off its tags, every one a sort header.
     */
    table: {
      label: "Saved analyses in this folder",
      actions: "Actions",
      columns: {
        name: "Name",
        white: "White",
        whiteElo: "Elo",
        black: "Black",
        blackElo: "Elo",
        result: "Result",
        date: "Date",
        event: "Event",
        round: "Round",
        eco: "ECO",
        opening: "Opening",
        moves: "Moves",
        updated: "Updated",
      },
      /** The words box over the table — names, players, event, opening and notes. */
      filter: "Filter analyses",
      filterClear: "Clear the words",
      /** The filter leaves no row — told apart from an empty folder. */
      noMatch: "No analysis matches the filter.",
      clearFilter: "Clear the filter",
      /** A folder row's chevron — it opens or closes the folder in place. */
      expand: "Open {{name}}",
      collapse: "Close {{name}}",
      /** Read with the table: how its folders, sort and picks are worked. */
      hint: "Folders come first: a folder's arrow opens it in place, its name goes into it. Sort by a column from its header button. Tick an analysis' box to pick it; a folder's box picks its whole subtree with it.",
    },
    download: "Download selected as PGN",
    deleteSelected: "Delete selected",
    /**
     * Deleting the picks, asked first (CTA-147: a picked folder goes with
     * everything under it — its analyses, its sub-folders).
     */
    bulkDelete: {
      title_one: "Delete {{count}} analysis?",
      title_other: "Delete {{count}} analyses?",
      /** Only folders picked — empty ones or a whole folder tree with nothing readable in it. */
      titleFolders_one: "Delete {{count}} picked folder?",
      titleFolders_other: "Delete {{count}} picked folders?",
      text: "They are removed from this browser. This can't be undone.",
      /** Beside the analyses: what the picked folders take with them. */
      textWithFolders_one: "The picked folder goes too, with every analysis and sub-folder in it. This can't be undone.",
      textWithFolders_other: "The {{count}} picked folders go too, with every analysis and sub-folder in them. This can't be undone.",
      /** Only folders picked. */
      textFoldersOnly: "They go with every analysis and sub-folder in them. This can't be undone.",
      confirm: "Delete",
    },
    /**
     * The nested folders (CTA-73) — the `folder` keys the shared folder
     * components (`views/shared/folders/`) read through `labelKey`.
     */
    folder: {
      untitled: "Untitled folder",
      root: "All analyses",
      newFolder: "New folder",
      renameFolder: "Rename folder",
      moveFolder: "Move folder",
      /** Filing one analysis — the key the shared move dialog reads. */
      moveGame: "Move analysis",
      /** The folder list's name in the move dialog (CTA-113). */
      picker: "Folders",
      download: "Download this folder as PGN",
      unfiled: "Unfiled",
      topLevel: "Top level",
      name: "Name",
      save: "Save",
      cancel: "Cancel",
      count_one: "{{count}} analysis",
      count_other: "{{count}} analyses",
      empty: "This folder is empty.",
    },
  },
  analysis: {
    /** The Analysis Board's tabs (CTA-73; the Position tab CTA-87). */
    tabs: {
      moves: "Moves",
      map: "Map",
      load: "Load",
      export: "Export",
      engine: "Engine",
      arrows: "Arrows",
    },
    /**
     * The header's Play toggle (CTA-73): the engine plays the side not at
     * the bottom of the board, its best move each turn, until paused (or the
     * reader steps back). Disabled while the engine is off.
     */
    play: {
      start: "Let the engine play the other side",
      pause: "Pause the engine",
      engineOff: "Switch the engine on to let it play",
      /** The status line while Play is on: the engine searching, dots moving… */
      thinking: "Engine is thinking",
      /** …the depth its search has reached so far… */
      depth: "depth {{depth}}",
      /** …or the reader's turn. */
      yourMove: "Your move",
    },
    /** The header's engine switch — short, it sits beside three buttons. */
    engineSwitch: "Engine",
    /** Saving a board that is not a saved analysis yet: a name and a folder. */
    save: {
      open: "Save this analysis",
      title: "Save analysis",
      name: "Name",
      folder: "Folder",
      confirm: "Save",
    },
    /**
     * The changes strip over a saved analysis — the `ChangesStrip` block with
     * this block's words (no protection: an analysis has none).
     */
    changes: {
      title: "Unsaved changes",
      saveOpen: "Unsaved changes — save or discard them",
      saveNothing: "No unsaved changes",
      added_one: "{{count}} move added",
      added_other: "{{count}} moves added",
      edited: "Lines or comments edited",
      update: "Update analysis",
      updateHelp: "Make these changes part of this saved analysis.",
      copy: "Save as copy",
      copyHelp: "Keep the saved analysis as it is, and save a copy with your changes.",
      discard: "Discard",
      copyName: "{{name}} (copy)",
      problem: {
        storage: "It could not be saved — this browser's storage is full or unavailable.",
        "too-many": "There is no room for another analysis in this browser.",
      },
    },
    /** The Load tab: a PGN (file or paste) or a FEN onto the board, unsaved. */
    load: {
      pgnTitle: "Load a game",
      pgnHelp: "It opens as a new analysis; save it to keep it. A file of several games can be merged into one tree or saved as a games collection in the Library.",
      loaded: "Loaded — a new analysis, not saved yet.",
      /** The popup a PGN of several games opens (CTA-101). */
      popup: {
        title_one: "This PGN holds {{count}} game",
        title_other: "This PGN holds {{count}} games",
        explain:
          "Merge them into one tree on the board, keep them as a collection of games in the Library, or save each one as an analysis.",
        skipped_one: "{{count}} game has no moves or could not be read, and is left out of a merge.",
        skipped_other: "{{count}} games have no moves or could not be read, and are left out of a merge.",
        merge: "Merge games",
        mergeHelp:
          "One tree: the first game's line is the mainline, and wherever another game leaves it becomes a side line, each move there tagged with how many games played it. Comments and move marks are kept. Not saved until you save it.",
        mergeUnavailable:
          "These games start from different positions, so they cannot share one tree.",
        collection: "Save as games collection",
        collectionHelp:
          "Every game is kept as it is, in a new collection at the top of the Library, named after the games' event or the file; you go to its table.",
        /** The third choice (CTA-141): each game its own saved analysis, in a new folder. */
        analyses: "Save to Saved analyses",
        analysesHelp:
          "Every game — a position on its own too — becomes a saved analysis, comments, side lines and arrows kept, in a new folder of Saved analyses; you go to the folder.",
        folderTitle: "Save to Saved analyses",
        folderName: "Folder name",
        /** The folder's name when a pasted text's games share no event. */
        folderDefault: "Analysed games",
        folderCount_one: "{{count}} game will be saved as an analysis in a new folder.",
        folderCount_other: "{{count}} games will be saved as analyses in a new folder.",
        folderSkipped_one: "{{count}} game could not be read, and is left out.",
        folderSkipped_other: "{{count}} games could not be read, and are left out.",
        folderSave: "Save",
        folderBack: "Back",
        indexing: "Checking games… {{done}} of {{total}}",
        cancel: "Cancel",
        problem: {
          unreadable: "No game could be read in that.",
          index: "The games could not be checked. Nothing was saved.",
          /** The games were checked, then the write itself failed (CTA-141). */
          write: "The games were checked, but could not be written. Nothing was saved.",
          storage: "It could not be saved — this browser's storage is full or unavailable.",
          folder: "No new folder could be made — Saved analyses holds at most {{max}} folders. Nothing was saved.",
          tooMany: "Saved analyses holds at most {{max}} analyses, and these would pass it. Nothing was saved.",
          analysesStorage: "The browser refused to store the games — its storage may be full. Nothing was saved.",
        },
      },
      problem: {
        empty: "There is no PGN in that.",
        "too-large": "That is too large to load.",
        unreadable: "That could not be read as PGN.",
      },
    },
    /** The link to a saved analysis' settings — on the board's header and every list row. */
    settingsLink: {
      open: "Analysis settings",
      unsaved: "Save or discard your changes first",
    },
    /**
     * The workspace an analysis opened from the saved list opens in (CTA-145):
     * the list's tree beside the board, and the header's previous / next.
     */
    folderView: {
      /** The Close button — it goes back to the list. */
      close: "Close — back to Saved analyses",
      /** The header button that opens the tree, under a narrow window. */
      toggle: "Saved analyses",
      /** The drawer's name under a narrow window. */
      drawer: "Saved analyses",
      /** The panel's button that folds it to a rail at the start edge. */
      collapse: "Fold the panel away",
      /** The rail's button that opens the panel again. */
      expand: "Open the folder's analyses",
      previous: "Previous analysis in the folder",
      next: "Next analysis in the folder",
      /** Why the others cannot be opened while the board holds unsaved changes. */
      locked: "Save or discard your changes to open another analysis.",
      /** A folder's row that lists more of its analyses. */
      showMore: "Show {{count}} more",
    },
    /** A saved analysis' settings screen (`/tools/analysis/saved/<id>/settings`). */
    settingsScreen: {
      title: "Analysis settings",
      missing: "There is no such analysis in this browser.",
      back: "Back to saved analyses",
      sections: {
        general: "General",
        board: "Board",
        folder: "Folder",
      },
      name: "Title",
      description: "Description",
      descriptionHelp: "Your notes on this analysis — shown under its title on the board.",
      color: "Side",
      white: "White",
      black: "Black",
      colorHelp: "The side the board opens facing. Flipping the board while you work does not change it.",
      arrowsHelp: "Whether the board opens drawing the next moves' arrows. The board's own switch changes them for a session.",
      moveMarksHelp: "Whether the board opens drawing a move's mark (!!, !, !?, ?!, ?, ??) on its square. The board's own switch changes it for a session.",
      save: "Save",
      cancel: "Cancel",
    },
    /** The Export tab: what the PGN keeps. */
    export: {
      include: "Include in the PGN",
      comments: "Comments",
      nags: "Move marks (NAGs)",
      variations: "Side lines",
      download: "Download .pgn",
    },
    /**
     * The Arrows tab (CTA-98): the next-move arrows switch, what sizes them and
     * their colours. The same fields sit on a saved analysis' settings screen.
     */
    arrows: {
      showHelp:
        "Show or hide the arrows of the moves that follow the position on screen. Off, only the move you point at in the next-moves bar gets one.",
      moveMarksHelp:
        "Draw the mark of the move on screen (!!, !, !?, ?!, ?, ??) on the square it landed on. The move list shows the marks either way.",
      widthSource: "Next move arrows width source",
      sources: {
        none: "None",
        eval: "Evaluation",
        games: "Games",
        prc: "Play chance",
        lines: "Lines ahead",
      },
      sourceHelp: {
        none: "Colour only — the arrows every board draws.",
        eval: "The [%eval] in each move's comment: the best move is the widest, the others narrower by what they give up.",
        games: "The [%games N] in each move's comment: each move's share of the games.",
        prc: "The prc:N in each move's comment: the play chances, scaled to 100%.",
        lines: "How many lines follow each move within the next 8 plies — no tag needed.",
      },
      /** Under a width source no move in the tree carries. */
      unavailable: "No move in this analysis carries this tag.",
      drawnAsNone:
        "No move in this analysis carries the chosen tag, so the arrows are drawn as None until one does.",
      palette: "Next move arrows colours",
      palettes: {
        classic: "Classic",
        lichess: "Lichess",
        colorblind: "Colour-blind safe",
      },
      paletteHelp:
        "The main line, the side lines and the move you point at. A move without the chosen tag, where others have it, is drawn gray.",
    },
    /** The pinned next-moves bar under the moves list — a fork's choices (CTA-54). */
    nextMoves: "Next moves",
    /** The empty-tree hint of the flowing tree view (the Openings explorer, a Library repertoire line). */
    tree: {
      empty: "Play a move, or set a position up from the Position tab.",
    },
    settings: {
      title: "Analysis",
      engineOn: "Analyse with the engine",
      /** Said where the lines would be, when the engine is switched off. */
      engineOff: "The engine is off. Switch it on to analyse this position.",
      /** Infinite analysis (CTA-160): the engine deepens until the position changes. */
      infinite: "Infinite analysis",
      infiniteHelp: "Keep searching until the position changes. Off, a search stops at the depth and time below — and Play always does.",
      /** CTA-167: the Analysis Board's switch that writes each finished search into the PGN as [%eval]. */
      writeEvals: "Write evaluations into the game",
      writeEvalsHelp: "Each finished search is written on its move as [%eval score,depth] — a deeper search replaces a shallower one — and the engine is named in the Annotator tag.",
      depth: "Search depth",
      moveTime: "Move time",
      moveTimeValue: "{{seconds}}s",
      moveTimeNone: "No limit",
      multiPv: "Variations to show",
      threads: "Threads",
      hash: "Hash (MB)",
      evalBar: "Show evaluation bar",
      /** The arrows of the next moves from the position on screen. */
      arrows: "Show next-move arrows",
      /** The move on screen's mark (`!`, `??`, …) drawn on its square (CTA-168). */
      moveMarks: "Show move marks on the board",
      clear: "Clear the board",
    },
    /** The Load and Export tabs' shared words. */
    position: {
      chooseFile: "Choose a .pgn or .zip file",
      pasteLabel: "Or paste PGN text",
      /** The paste box's button: the text onto the board. */
      loadText: "Load",
      fenTitle: "Set a position up",
      fenLabel: "Paste a FEN",
      loadFen: "Set position",
      currentFen: "Current FEN",
      currentPgn: "PGN",
      errors: {
        fen: "Could not read this FEN. {{detail}}",
      },
    },
  },
  /**
   * The shared position editor (CTA-83, `views/shared/positionEditor/`) — top
   * level, like the other shared pieces' keys. Chrome only: the FEN, the PGN
   * and the square names are notation and stay language-independent.
   */
  positionEditor: {
    tabs: {
      label: "Forms",
      position: "Position",
      fen: "FEN",
      pgn: "PGN",
    },
    palette: {
      white: "White pieces",
      black: "Black pieces",
      /** On the trash in one palette — it empties that colour off the board. */
      clear: "Take the {{color}} pieces off the board",
      colors: {
        white: "white",
        black: "black",
      },
      /** How the other kind of deletion works, said once under the board. */
      removeHint: "Drag a piece off the board — onto a palette or the trash — to remove it.",
    },
    fields: {
      turn: "Side to move",
      white: "White",
      black: "Black",
      castling: "Castling",
      whiteKingside: "White 0-0",
      whiteQueenside: "White 0-0-0",
      blackKingside: "Black 0-0",
      blackQueenside: "Black 0-0-0",
      enPassant: "En passant target",
      enPassantNone: "None",
    },
    controls: {
      /** The standard chess start — a board to begin arranging from. */
      startingPosition: "New board",
      /**
       * Back to the editor's initial position — shown only when its host gave
       * one, so it never offers a position that does not exist.
       */
      initialPosition: "Reset",
      clearBoard: "Clear board",
      flip: "Flip board",
    },
    problems: {
      title: "This position cannot be played from yet:",
      noWhiteKing: "White has no king.",
      noBlackKing: "Black has no king.",
      extraKing: "One side has more than one king.",
      pawnOnBackRank: "A pawn is standing on the first or the last rank.",
      opponentInCheck: "The side not to move is already in check.",
      /** Under the FEN copy button, which an illegal position switches off. */
      blocked: "Fix the position to use this.",
    },
    fen: {
      title: "Set a position up",
      label: "Paste a FEN",
      load: "Set position",
      currentTitle: "This position",
      currentFen: "Current FEN",
      error: "Could not read this FEN. {{detail}}",
    },
    pgn: {
      title: "Load a game",
      chooseFile: "Choose a .pgn file",
      dropHint: "Drop a .pgn file here",
      pasteLabel: "Or paste PGN text",
      load: "Load game",
      /** What loading one does here, which is not what it does elsewhere. */
      hint: "The game's final position is loaded into the editor.",
      gamesTitle: "Games in this file",
      gameFallback: "Game {{number}}",
      versus: "vs",
      errors: {
        empty: "No PGN found in that input.",
        parse: "Could not read this PGN. {{detail}}",
        parseGame: "Could not read game {{number}} in this file. {{detail}}",
        file: "Could not read that file.",
      },
    },
  },
  /**
   * The Openings explorer (`/openings`, CTA-78) — a v2 board with the opening
   * book beside it. Chrome only: an opening's name and ECO code come from the
   * bundled eco.json data (`lib/openings.ts`), not from here. What it shares
   * with the Analysis Board (the Load tab's errors, the engine settings, the
   * export) is read from `analysis.*`.
   */
  openings: {
    tabs: {
      book: "Book",
      moves: "Moves",
      map: "Map",
      load: "Load",
      export: "Export",
      engine: "Engine",
    },
    current: {
      /** The book has loaded, but this position is not in it. */
      unknown: "No known opening yet.",
      /** The book itself is still loading. */
      loading: "Loading the opening book…",
      /** The ECO chip's accessible name — it is the link into the explorer. */
      open: "Explore {{eco}} in the Openings explorer",
      /** The one-line opening's accessible name (the Analysis Board): its name, its code, and that it opens in a new tab. */
      openInTab: "{{name}} ({{eco}}) — explore in the Openings explorer, in a new tab",
    },
    book: {
      /** The list's accessible name (CTA-113). */
      label: "Book moves",
      /** The explorer lists only moves the book names — this when it has none. */
      empty: "No known continuations from here.",
      /** Above the list — what a click on a row does. */
      help: "Click a move to play it here. A move from an earlier position starts a side line.",
    },
    engineSwitch: "Engine",
    controls: {
      /** Hand this position off to Play with Engine as `?fen=`. */
      playFromHere: "Play from here",
      /** Hand the whole explored tree to the Analysis Board, as a new board. */
      analysis: "Open on the Analysis Board — everything explored here, as a new unsaved board",
    },
    /** The Load tab's merge choice — no split: nothing on this screen is saved. */
    load: {
      choice: {
        title_one: "This PGN holds {{count}} game",
        title_other: "This PGN holds {{count}} games",
        explain: "Merge them into one tree on the board.",
        skipped_one: "{{count}} game has no moves or could not be read, and is left out.",
        skipped_other: "{{count}} games have no moves or could not be read, and are left out.",
        merge: "Merge onto the board",
        mergeHelp:
          "One tree: the first game's line is the mainline, and wherever another game leaves it becomes a side line. Comments and move marks are kept.",
        mergeUnavailable:
          "These games start from different positions, so they cannot share one tree.",
      },
    },
  },
  /**
   * The **Library** (CTA-75) — collections of games, each a table, each game
   * an analysis board. Chrome only: a collection is named from its file (or by
   * the reader, for an upload) and a game by its players, so dropping a
   * `.pgn` into `src/data/library/` never touches this catalog.
   */
  library: {
    filterClear: "Clear the filter",
    /** How the folder table is worked, read with it (CTA-113). */
    treeHint: "Tab through each row's chevron, which opens or closes a folder, its link and its actions. Sort by a column from its header button.",
    /** `/library` — the collections. */
    title: "Library",
    count_one: "{{count}} collection",
    count_other: "{{count}} collections",
    games_one: "{{count}} game",
    games_other: "{{count}} games",
    /** The fixed, read-only top-level folder of the shipped collections (CTA-88). */
    builtIn: "Built-in",
    /** The list's columns — a file manager's details view (CTA-88). */
    columns: {
      name: "Name",
      games: "Games",
      added: "Added",
      actions: "Actions",
    },
    /** The words box over the list — a collection's or a folder's name, or part of it. */
    filter: "Filter by name",
    shown: "{{shown}} of {{count}} collections",
    noMatches: "No collection's name matches.",
    add: "Add collection",
    /** A collection row's download — the whole collection, as one PGN. */
    download: "Download the whole collection as PGN",
    /** An uploaded collection's row — delete it, asked first. */
    delete: "Delete collection",
    hint: "A collection is one PGN file of many games — a tournament, a player's games. Open one to sort and filter its games, and open a game to analyse it: side lines, the engine, Play against it, the map and comments. File your collections in folders; the ones that ship with the app are in Built-in.",
    /**
     * The reader's folders (CTA-88) — the keys the shared folder dialogs read
     * (`views/shared/folders/`), and the rows' actions.
     */
    folder: {
      untitled: "Untitled folder",
      newFolder: "New folder",
      newSubFolder: "New sub-folder",
      renameFolder: "Rename folder",
      moveFolder: "Move folder",
      moveCollection: "Move collection",
      moveTo: "Move to…",
      deleteFolder: "Delete folder",
      download: "Download everything in this folder as one PGN",
      uploadHere: "Add a collection here",
      expand: "Open {{name}}",
      collapse: "Close {{name}}",
      topLevel: "Top level",
      name: "Folder name",
      save: "Save",
      cancel: "Cancel",
      deleteConfirm:
        "Deleting this folder keeps its contents: its collections and sub-folders move up to the folder it is in.",
      deleteCounts: "This folder holds {{games}} collections and {{subFolders}} sub-folders.",
      /** The folder list's name in the move dialog (CTA-113). */
      picker: "Folders",
    },
    /** The table screen — `/library/<collection>`. */
    table: {
      back: "All collections",
      /** The games table's accessible name (CTA-113). */
      label: "Games",
      filter: "Filter games",
      result: "Result",
      anyResult: "Any result",
      shown: "{{shown}} of {{count}} games",
      noMatches: "No games match the filter.",
      rowsPerPage: "Rows per page",
      /** An upload's table: its games from a file or a paste (CTA-77). */
      addGames: "Add games",
      addGamesHint: "Add games to this collection from a PGN file or pasted text",
      noGames: "This collection has no games yet — add some with Add games.",
      loading: "Reading the collection…",
      /**
       * The picks — a checkbox per row and the export bar in the top bar,
       * whose select-all takes every game the filters leave, on every page.
       */
      picks: {
        selectAll: "Select all games shown by the filters",
        selected: "{{count}} selected",
        download: "Download selected as one PGN",
        /** An uploaded collection's picked games, deleted from it. */
        deleteSelected: "Delete selected games from the collection",
        pick: "Select {{title}}",
        /**
         * The Analyse hand-off (CTA-77): the picked games saved to Saved
         * analyses, one analysis each, in a new folder named after the
         * collection, the count and the filters that are on.
         */
        analyse: "Analyse",
        analyseHint: "Save the selected games to Saved analyses, each its own analysis, in a new folder",
        analysing: "Saving the selected games to Saved analyses…",
        /** The side a player filter names, as the folder name carries it. */
        white: "white",
        black: "black",
        done_one: "{{count}} game added to Saved analyses, in “{{folder}}”.",
        done_other: "{{count}} games added to Saved analyses, in “{{folder}}”.",
        skipped_one: "{{count}} game could not be read and was left out.",
        skipped_other: "{{count}} games could not be read and were left out.",
        openFolder: "Open folder",
        problem: {
          read: "The games could not be read. Nothing was saved.",
          none: "None of the selected games can be read. Nothing was saved.",
          folder: "No new folder could be made — Saved analyses holds at most {{max}} folders. Nothing was saved.",
          tooMany: "Saved analyses holds at most {{max}} analyses, and these would pass it. Nothing was saved.",
          storage: "The browser refused to store the games — its storage may be full. Nothing was saved.",
        },
        /**
         * The Save-as-collection hand-off (CTA-122): the picked games written
         * as one new uploaded collection, each game exactly as stored, named
         * by the reader after a name derived like Analyse's folder name.
         */
        saveAs: "Save as collection",
        /** The name dialog (`SaveAsCollectionDialog`). */
        saveAsTitle: "Save as a collection",
        saveAsName: "Collection name",
        saveAsCount_one: "{{count}} game will be saved as a new collection of its own.",
        saveAsCount_other: "{{count}} games will be saved as a new collection of their own.",
        saveAsConfirm: "Create collection",
        saveAsCancel: "Cancel",
        saveAsReadProblem: "The games could not be read. Nothing was created.",
        saveAsProblem: "The collection could not be created — this browser's storage may be full or unavailable. Nothing was created.",
        savedCollection_one: "“{{name}}” created with {{count}} game.",
        savedCollection_other: "“{{name}}” created with {{count}} games.",
        openCollection: "Open collection",
      },
      /** The `#` cell's mark on a game the index could not parse. */
      unreadable: "This game could not be read — its moves have an error.",
      /** The column headers — `lib/libraryCollections.ts`'s `COLLECTION_COLUMNS`. */
      columns: {
        number: "#",
        white: "White",
        whiteElo: "Elo",
        black: "Black",
        blackElo: "Elo",
        result: "Result",
        date: "Date",
        round: "Round",
        event: "Event",
        eco: "ECO",
        opening: "Opening",
        moves: "Moves",
      },
      /** Deleting an uploaded collection's picked games — asked first. */
      confirmDeleteGames: {
        title_one: "Delete {{count}} game?",
        title_other: "Delete {{count}} games?",
        body: "They are removed from “{{name}}” in this browser, and the games after them move up. This cannot be undone.",
        problem: "They could not be deleted — this browser's storage is unavailable, or the games have changed.",
      },
      shippedNote: "This collection ships with the app. Its games are read-only: changes you make on a game are saved as a copy in Saved analyses.",
      uploadedNote: "You added this collection; it is kept in this browser only. Changes to a game can update it in place or be saved as a copy next to it.",
      /** The header's gear, to the collection's settings (CTA-121). */
      settings: "Collection settings",
    },
    /**
     * A collection's settings — `/library/<collection>/settings` (CTA-121):
     * the `CollectionSettingsForm` block's words, and the screen's own.
     */
    settings: {
      /** The screen's `h1`. */
      title: "Collection settings",
      general: "General",
      name: "Title",
      nameHelp: "What the collection is called in the Library.",
      description: "Description",
      descriptionHelp: "Shown under the collection's name, here and on its games screen.",
      tournamentSection: "Tournament",
      tournament: "Mark as tournament",
      tournamentHelp: "A tournament's games can be shown as standings and crosstables.",
      tournamentBlocked:
        "A collection can be marked as a tournament only when every game in it shares one Event. First narrow the collection to the games of one tournament event.",
      /** Arena (CTA-142): markable, its view showing no standings table yet. */
      comingLater: "no standings table yet",
      type: "Tournament type",
      save: "Save",
      cancel: "Cancel",
      problem: "The settings could not be saved — this browser's storage may be full or unavailable.",
      /** The formats (CTA-121; CTA-142 added the double elimination and the two team ones) — every one but Arena selectable. */
      formats: {
        swiss: "Swiss system",
        roundRobin: "Round robin",
        knockout: "Knockout (elimination)",
        doubleElimination: "Double elimination",
        match: "Match play",
        teamSwiss: "Team Swiss / round robin",
        teamKnockout: "Team knockout",
        arena: "Arena",
      },
      /** Each format's one-line description, under the type's radios. */
      formatDescriptions: {
        swiss:
          "players are paired each round against opponents with the same or similar score; no one is eliminated. Best for large open weekend tournaments.",
        roundRobin:
          "every participant plays every other once (or twice in a double round robin). Best for small, elite fields and championships.",
        knockout: "a loss eliminates a player from first prize. Best for high-stakes events (like the World Cup).",
        doubleElimination:
          "a player is out only after a second lost match: the losers of the winners' bracket play on in a losers' bracket. Best for esports-style events.",
        match: "a head-to-head series of games between two players. Best for World Championship matches.",
        teamSwiss:
          "teams meet on every board at once, a match a round, ranked by match points then board points. Best for Olympiads and team championships.",
        teamKnockout: "teams meet in matches of several legs, the loser of each out. Best for team cups and the final stages of team events.",
        arena: "continuous, time-based online pairing focused on volume and win streaks. Best for fast online play.",
      },
      /**
       * The type the games look like (CTA-142, `lib/tournamentKind.ts`): the
       * suggestion over the type's radios, Apply putting it in the draft.
       */
      suggestion: {
        title: "Suggested tournament type",
        /** The guess and why, in a line. */
        text: "{{type}}: {{reason}}.",
        apply: "Apply",
        applyName: "Apply the suggested type, {{type}}",
        /** The games table's close button (CTA-142): the collection is not a tournament, and is not asked again. */
        dismiss: "Not a tournament — don't suggest again",
        /** The games table's outcomes. */
        marked: "Marked as a tournament: {{type}}. Change it in the collection's settings.",
        /** The marked snackbar's action: the mark taken off again. */
        undo: "Undo",
        problem: "The mark could not be saved — this browser's storage may be full or unavailable.",
        /** Once the draft holds it. */
        selected: "Selected — press Save to keep it.",
        /** Why — the numbers the guess was read from. */
        reasons: {
          match: "{{games}} games, every one between the same two players",
          doubleElimination: "its rounds are numbered from 51 on — a losers' bracket, as The Week in Chess numbers it",
          knockout: "{{competitors}} players, fewer each round ({{sizes}})",
          teamKnockout: "{{competitors}} teams, fewer each round ({{sizes}})",
          roundRobin: "{{competitors}} players, every pair met",
          roundRobinTwice: "{{competitors}} players, every pair met twice",
          teamRoundRobin: "{{competitors}} teams, every pair met",
          swiss: "{{competitors}} players over {{rounds}} rounds, each meeting a few of the others",
          swissNoRounds: "{{competitors}} players, each meeting a few of the others",
          teamSwiss: "{{competitors}} teams over {{rounds}} rounds, each meeting a few of the others",
          teamSwissNoRounds: "{{competitors}} teams, each meeting a few of the others",
          /** CTA-142: no round numbers, more games than players — Lichess's arenas. */
          arena: "{{competitors}} players, {{games}} games and no rounds",
        },
      },
    },
    /**
     * A collection marked as a tournament (CTA-142): the list's mark, and
     * its own view at `/library/<collection>` — the Info, Participants and
     * Games tabs.
     */
    tournament: {
      /** The list's word for its icon, read with the collection's name. */
      mark: "Tournament",
      /**
       * A collection that could be one (CTA-142: never marked, its games one
       * event) — the list's warning icon among its actions: its tooltip and
       * name, a link to the collection, where the type is suggested.
       */
      potentialHint_one: "Potential tournament: {{name}}'s game shares one Event. Open it to choose a tournament type, or dismiss the suggestion.",
      potentialHint_other: "Potential tournament: {{name}}'s {{count}} games share one Event. Open it to choose a tournament type, or dismiss the suggestion.",
      tabs: {
        label: "The tournament",
        info: "Info",
        participants: "Participants",
        games: "Games",
      },
      /** The event card (the `TournamentInfo` block). */
      info: {
        title: "The event",
        type: "Type",
        event: "Event",
        site: "Site",
        dates: "Dates",
        rounds: "Rounds",
        players: "Players",
        teams: "Teams",
        games: "Games",
        unfinished_one: "{{count}} game unfinished",
        unfinished_other: "{{count}} games unfinished",
      },
      /** The Info tab's table, and what is said when the games do not fit its type. */
      table: {
        title: "The table",
        loading: "Reading the tournament's games…",
        unreadable: "This collection's games could not be read.",
        misfit: "The games do not read as {{type}}.",
        misfitSuggest: "The games do not read as {{type}} — they look like {{guess}}: {{reason}}.",
        changeType: "Change the type",
        noTable: "{{type}} has no standings table yet — every player's record is on the Participants tab.",
      },
      /** The Participants tab. */
      participants: {
        title: "Participants",
        teams: "Teams",
        players: "Players",
        top: "Statistics",
        empty: "No players in these games.",
        columns: {
          player: "Player",
          team: "Team",
          rating: "Rtg",
          ratingName: "Rating",
          score: "Pts",
          scoreName: "Points",
          games: "G",
          gamesName: "Games",
          wins: "W",
          winsName: "Wins",
          draws: "D",
          drawsName: "Draws",
          losses: "L",
          lossesName: "Losses",
          performance: "Perf",
          performanceName: "Performance",
        },
        /** The top players' summary (the `TopPlayers` block). */
        standouts: {
          score: "Best score",
          scoreValue: "{{points}} of {{games}}",
          performance: "Best performance",
          wins: "Most wins",
          winsValue_one: "{{count}} win",
          winsValue_other: "{{count}} wins",
          unbeaten: "Longest unbeaten run",
          unbeatenValue_one: "{{count}} game",
          unbeatenValue_other: "{{count}} games",
        },
        /** A team and its players (the `TeamRosters` block). */
        teamPoints: "{{matchPoints}} match points, {{boardPoints}} board points",
        playersOf: "{{team}}'s players",
        sortHint: "Sort by a column's header.",
      },
    },
    /**
     * The table's filters, in the right-hand panel — each shown only where
     * the collection's games carry that field.
     */
    filters: {
      title: "Filters",
      clear: "Clear",
      player: "Player",
      color: "Played as",
      anyColor: "Either",
      asWhite: "White",
      asBlack: "Black",
      opening: "Opening",
      openingHelp: "A name, or the start of an ECO code (B9)",
      event: "Event",
      from: "From",
      to: "To",
      /** The opening-moves board at the foot of the panel (CTA-76). */
      moves: {
        title: "Opening moves",
        back: "Take back a move",
        reset: "Back to the start",
        flip: "Flip the board",
        start: "Play a move to keep the games that began with it",
        end: "No game in the collection goes further here",
        /** Where the tree's cut landed (CTA-92): one game does go on, alone. */
        single: "Only one game in the collection goes further here",
        none: "No game the other filters leave was played this way",
        /** Save tree as PGN (CTA-99): the tree below the board's position, as one PGN file. */
        save: "Save tree as PGN",
        saveDialog: {
          title: "Should we add games number as tag?",
          mode: "The games' counts",
          no: "No",
          tags: "Add tags",
          games: "\"games\" tag",
          gamesHelp: "How many of the games played each move: [%games 12]",
          prc: "\"prc\" tag",
          prcHelp: "Each move's share of its position's games, in percent: [%prc 40]",
          cancel: "Cancel",
          save: "Save",
        },
      },
    },
    confirmDelete: {
      title: "Delete {{name}}?",
      body_one: "Its {{count}} game is removed from this browser. This cannot be undone.",
      body_other: "Its {{count}} games are removed from this browser. This cannot be undone.",
      cancel: "Cancel",
      confirm: "Delete",
    },
    /** `/library/new` — a PGN file or a paste becomes a collection. */
    upload: {
      title: "Add a collection",
      intro: "A collection is one PGN text of many games — a tournament export, a player's games. It becomes a table of its own in the Library.",
      name: "Name",
      /** The folder the new collection is filed in (CTA-88). */
      folder: "Folder",
      chooseFile: "Choose a .pgn or .zip file",
      pasteLabel: "Or paste PGN text",
      read_one: "{{count}} game found",
      read_other: "{{count}} games found",
      /** A collection made with no games — filled later from its table (CTA-77). */
      empty: "Create empty collection",
      emptyName: "New collection",
      /** The same screen adding games to one of the reader's collections — `?into=<id>`. */
      intoTitle: "Add games to {{name}}",
      intoIntro: "A .pgn file (or a .zip of them) or pasted PGN text of one game or many. Every game is checked, then added at the end of the collection.",
      intoSave: "Add games",
      save: "Add collection",
      pastedName: "Pasted collection",
      storage: "Collections you add are kept in this browser only. Clearing site data removes them, and they do not follow you to another device. Every game is checked when it is added — a few seconds for a tournament, a minute or more for 10,000 games, and some twenty minutes for the largest collections.",
      /** The index pass over an upload's games, before it is kept. */
      indexing: "Checking games… {{done}} of {{total}}",
      cancel: "Cancel",
      /**
       * The import-options popup (CTA-103): what was read, and the filters
       * applied before the index pass.
       */
      options: {
        title: "Import options",
        intoTitle: "Add games to {{name}}",
        pasted: "Pasted text",
        games_one: "{{count}} game",
        games_other: "{{count}} games",
        fileKept_one: "{{kept}} of {{count}} game kept",
        fileKept_other: "{{kept}} of {{count}} games kept",
        players_one: "{{count}} player",
        players_other: "{{count}} players",
        eloSpan: "Elo",
        dateSpan: "Dates",
        events_one: "{{count}} event",
        events_other: "{{count}} events",
        filters: "Import only",
        minElo: "Min Elo",
        maxElo: "Max Elo",
        eloHelp: "Both players' Elo within the range. A thumb at its end sets no bound; while one is moved, a game without an Elo is left out.",
        dateHelp: "A game without a date is left out.",
        playerFilter: "Players",
        playersHelp: "Games of any of them — pick from the list or type part of a name.",
        several: "Each file becomes a collection of its own, named by the Event its games share, else by the file's name.",
        severalInto: "Every file's games are added to this collection.",
        /** What a split import makes of a zip's several files (CTA-127). */
        severalSplit: "Each file becomes a folder of its own, holding one collection per event.",
        count_one: "{{kept}} of {{count}} game will be imported",
        count_other: "{{kept}} of {{count}} games will be imported",
        import: "Import",
        /** The *Split by event* option of a new-collection import (CTA-127). */
        split: "Split by event",
        splitHelp: "A folder named after the file, holding one collection per event. Games with no Event go into one \"Unknown\" collection.",
        /** CTA-142: on a split, each event's collection marked with the type its games look like. */
        autoType: "Mark each event's tournament type",
        autoTypeHelp: "Each event's games are read for the kind of tournament they look like — before anything is imported. Change any event's type below, or set it to \"Not a tournament\", then import.",
        autoTypeNone: "No events to mark.",
        /** The events table: its name, its columns, and the select's "none". */
        eventTypes: "Each event's tournament type",
        eventColumns: {
          event: "Event",
          games: "Games",
          players: "Players",
          dates: "Dates",
          type: "Type",
        },
        notTournament: "Not a tournament",
        splitOneEvent: "Nothing to split — the games kept of each file share one Event.",
        splitNoEvents: "Nothing to split — no game kept has an Event.",
        splitNothingKept: "Nothing to split — no game will be imported.",
      },
      /** The collection the games with no Event go into, when an import splits by event (CTA-127). */
      unknown: "Unknown",
      problem: {
        empty: "There is no PGN in that.",
        unreadable: "No game could be read in that.",
        "too-large": "That is too large — a collection can be up to about 100 million characters (some 100,000 games).",
        index: "The games could not be checked. Nothing was added.",
        storage: "It could not be saved — this browser's storage is full or unavailable.",
        missing: "That collection is gone.",
        file: "Could not read that file.",
        zip: "That zip could not be read.",
        "zip-empty": "There is no .pgn file in that zip.",
        folder: "The folder could not be created — this browser's storage is full or unavailable, or there is no room for another folder.",
      },
    },
    /** A path the Library does not have. */
    notFound: {
      collection: "There is no such collection.",
      game: "There is no such game in this collection.",
      back: "Back to the Library",
    },
    /** A game's board — `/library/<collection>/<game>`. */
    game: {
      tabs: {
        moves: "Moves",
        map: "Map",
        info: "Info",
        export: "Export",
        engine: "Engine",
      },
      of: "Game {{number}} of {{count}}",
      back: "Back to {{name}}",
      previous: "Previous game",
      next: "Next game",
      engineSwitch: "Engine",
      arrows: "Next-move arrows",
      moveMarks: "Move marks on the board",
      unreadable: "This game could not be read.",
      /** The Export tab's hand-off to the Analysis Board. */
      openAnalysis: "Open in Analysis Board",
      openAnalysisHelp: "Opens this game on the Analysis Board, at the position on screen.",
      openAnalysisChanged: "Opens the game as the collection holds it, at the position on screen — your unsaved changes stay here.",
    },
    /**
     * The changes strip over a game of an **uploaded** collection — Update
     * writes it in place, Save as copy puts a copy right after it.
     */
    changes: {
      title: "Unsaved changes",
      saveOpen: "Unsaved changes — save or discard them",
      saveNothing: "No unsaved changes",
      added_one: "{{count}} move added",
      added_other: "{{count}} moves added",
      edited: "Lines or comments edited",
      update: "Update game",
      updateHelp: "Make these changes part of this game in the collection.",
      copy: "Save as copy",
      copyHelp: "Keep this game as it is, and add a copy with your changes right after it.",
      discard: "Discard",
      problem: {
        storage: "It could not be saved — this browser's storage is full or unavailable.",
        "too-large": "The collection would be too large to keep in this browser.",
        missing: "The collection or the game is gone.",
        "too-many": "There is no room for another analysis in this browser.",
      },
    },
    /**
     * The same strip over a game of a **shipped** collection, which is
     * read-only: its changes are kept only as a copy in Saved analyses.
     */
    shippedChanges: {
      title: "Unsaved changes",
      readOnly: "This game ships with the app and cannot be changed: save your changes as a copy in Saved analyses.",
      copy: "Save as copy",
      copyHelp: "Save this game with your changes as a new analysis in Saved analyses.",
      copyName: "{{name}} (copy)",
      discard: "Discard",
      problem: {
        storage: "It could not be saved — this browser's storage is full or unavailable.",
        "too-many": "There is no room for another analysis in this browser.",
        "too-large": "That is too large to keep in this browser.",
        missing: "The collection or the game is gone.",
      },
    },
  },
  /**
   * The **tournament tables** (CTA-120) — the Swiss standings and the
   * round-robin crosstable (`src/blocks/tables/`). Built ahead of the
   * tournaments section; the Blog's articles embed them (CTA-128, `embed`).
   */
  tournament: {
    /** The headings: an abbreviation in view, its `…Name` read in its place and shown on hover. */
    columns: {
      rank: "#",
      rankName: "Rank",
      player: "Player",
      rating: "Rtg",
      ratingName: "Rating",
      points: "Pts",
      pointsName: "Points",
      buchholz: "BH",
      buchholzName: "Buchholz",
      sonnebornBerger: "SB",
      sonnebornBergerName: "Sonneborn-Berger",
      /** A team event's (CTA-128). */
      team: "Team",
      matchPoints: "MP",
      matchPointsName: "Match points",
      boardPoints: "BP",
      boardPointsName: "Board points",
    },
    /** A round column's full name — its header shows the number alone. */
    round: "Round {{round}}",
    /**
     * A result's words, read in its glyph's place: the round, the colour
     * played, the opponent and the result. `…NoRound` is a game whose Round
     * tag names none.
     */
    game: {
      white: "Round {{round}}, White against {{opponent}}: {{result}}",
      black: "Round {{round}}, Black against {{opponent}}: {{result}}",
      whiteNoRound: "White against {{opponent}}: {{result}}",
      blackNoRound: "Black against {{opponent}}: {{result}}",
    },
    result: {
      win: "win",
      draw: "draw",
      loss: "loss",
      unfinished: "unfinished",
    },
    /** A round, or a pair, the file holds no game of — not a bye: the tables show what the file has. */
    noGame: "Round {{round}}: no game in the file",
    noGameAgainst: "No game against {{opponent}} in the file",
    /** Under the table: what the two glyphs that are not numbers mean. */
    legend: {
      unfinished: "unfinished game",
      none: "no game in the file",
    },
    loading: "Reading the tournament…",
    empty: "No games to show.",
    /** A paged table's pager (CTA-128). */
    rowsPerPage: "Rows per page",
    /** The FIDE titles, read in place of their chips' letters (CTA-128). */
    titles: {
      GM: "Grandmaster",
      IM: "International Master",
      FM: "FIDE Master",
      CM: "Candidate Master",
      WGM: "Woman Grandmaster",
      WIM: "Woman International Master",
      WFM: "Woman FIDE Master",
      WCM: "Woman Candidate Master",
    },
    /** The MDX embeds (CTA-128): `<SwissStandingsTable>` and `<RoundRobinCrossTable>` in an article. */
    embed: {
      /** The table's accessible name, after the games' Event tag. */
      standings: "{{event}} — standings",
      crosstable: "{{event}} — crosstable",
      /** The event's name where no game carries an Event tag. */
      untitled: "The tournament",
      unreadable: "This tournament's PGN holds no game.",
      /** The other formats' embeds (CTA-128). */
      bracket: "{{event}} — bracket",
      match: "{{event}} — the match",
      notAMatch: "This PGN is not a match: its games are not all between the same two players.",
      /** <CollectionTournamentTable> naming a collection this browser's Library does not hold. */
      collectionMissing: "This collection is not in this browser's Library.",
      /** <CollectionTeamStandingsTable> over a collection whose games name no teams. */
      notATeamEvent: "This collection is not a team event: its games name no teams.",
      /** A table over an analysis, a played game or a repertoire (CTA-140) that this browser does not hold. */
      sourceMissing: "This is not in this browser — it is a reader's own, kept where it was made.",
    },
    /** A knockout's bracket (CTA-128): the rounds' names, a match in words. */
    knockout: {
      round: "Round {{round}}",
      final: "Final",
      semiFinals: "Semi-finals",
      quarterFinals: "Quarter-finals",
      winners: "Winners' bracket",
      losers: "Losers' bracket",
      /** One side of a match, read: the name and the score — a team's board points after it. */
      side: "{{name}} {{score}}",
      teamSide: "{{name}} {{score}} ({{boardPoints}} board points)",
      through: "{{name}} goes through",
      /** The caption over a match for third place, and the words it is read with. */
      thirdPlace: "Match for third place",
      loading: "Reading the bracket…",
      empty: "No matches to show.",
      /** A match's games as links under it (CTA-128): the list's name, and each link's words. */
      games: "Games",
      game: "Game {{number}}: {{white}} – {{black}}, {{result}}",
      /** A team match's legs as links, each opening the leg's first board. */
      legs: "Legs",
      leg: "Leg {{leg}}: {{first}} {{own}}, {{second}} {{other}} — opens its first board",
    },
    /** A match between two players (CTA-128): a column per game. */
    match: {
      game: "Game {{game}}",
      result: {
        white: "Game {{game}}, White against {{opponent}}: {{result}}",
        black: "Game {{game}}, Black against {{opponent}}: {{result}}",
      },
    },
    /** A team tournament's standings (CTA-128): a round's cell is the team's board points in its match. */
    team: {
      match: "Round {{round}} against {{opponent}}: {{own}}–{{other}}, {{outcome}}",
      outcome: {
        win: "won",
        draw: "drawn",
        loss: "lost",
        unfinished: "unfinished",
      },
      noMatch: "Round {{round}}: no match in the file",
      legend: {
        unfinished: "a match with a game unfinished",
      },
    },
  },
  /**
   * The **Repertoires** section (CTA-61) — the reader's own opening
   * repertoires, brought in as a `.pgn` file or pasted text, listed like the
   * saved screens and read on the unified v2 board. The list reuses the
   * saved-list machinery, which reads `view.*`, `remove`, `select`,
   * `selectAll`, `selected` and `download` out of this block.
   */
  repertoires: {
    title: "Repertoires",
    count: "Repertoires: {{count}}",
    loading: "Reading your repertoires…",
    empty:
      "No repertoires yet. Add one from a .pgn file, or paste its PGN, and it appears here.",
    hint: "Your own opening repertoires. Open one to read its lines on the board, side lines and all, with the engine beside you.",
    /** The right-hand panel's heading (CTA-113) — the page's outline has one under the list's title. */
    panelTitle: "About repertoires",
    storage:
      "Repertoires are kept in this browser only. Clearing site data removes them, and they do not follow you to another device.",
    /** A repertoire whose tags carry no name and the reader typed none. */
    untitled: "Untitled repertoire",
    /** A repertoire's size: its mainline, and the side lines off it. */
    moves_one: "{{count}} move",
    moves_other: "{{count}} moves",
    variations_one: "{{count}} variation",
    variations_other: "{{count}} variations",
    /** A record from before the one-game rule, which opens on the choice. */
    needsChoice: "Several games — open to merge or split",
    view: {
      label: "View",
      list: "List",
      compact: "Small boards",
      comfortable: "Big boards",
    },
    open: "Open",
    add: "Add",
    select: "Select this repertoire",
    selectAll: "Select all repertoires",
    selected: "{{count}} selected",
    download: "Download selected as PGN",
    deleteSelected: "Delete selected",
    /** The bulk delete's confirm (CTA-68). */
    bulkDelete: {
      title_one: "Delete {{count}} repertoire?",
      title_other: "Delete {{count}} repertoires?",
      text: "They are removed from this browser. This can't be undone.",
      confirm: "Delete",
    },
    /** The screen a repertoire is brought in on. */
    upload: {
      title: "Add a repertoire",
      intro:
        "Choose a .pgn file, or paste its text below. Both are read the same way: every line is checked before anything is kept.",
      name: "Name",
      nameHelp: "Leave empty to take the name from the file's own tags.",
      pick: "Choose a .pgn file",
      paste: "…or paste PGN here",
      save: "Add pasted PGN",
      reading: "Reading…",
      problem: {
        empty: "That holds no PGN.",
        "too-large": "That is too large to keep in this browser.",
        unreadable: "No line in it could be read.",
        storage:
          "It could not be saved — this browser's storage is full or unavailable.",
      },
    },
    /**
     * The per-repertoire settings screen (`/repertoires/<id>/settings`). One
     * key per control; a new option adds its own here and in `he.ts`
     * (see `lib/repertoireSettings.ts`, "Adding an option").
     */
    settings: {
      title: "Repertoire settings",
      open: "Settings",
      sections: {
        general: "General",
        board: "Board",
        folder: "Folder",
      },
      folder: "Folder",
      folderHelp: "Where it is filed in the list.",
      folderNone: "No folders yet — make one from the list's New folder.",
      name: "Title",
      nameHelp: "Shown in the list and above the board.",
      description: "Description",
      descriptionHelp: "Your own notes: what this repertoire covers, what to remember.",
      color: "Main color",
      colorHelp: "The side you play this repertoire as. Its board opens facing it.",
      protected: "Protected",
      protectedHelp:
        "Changes made on its board can't be written into it — only saved as a copy — until this is off. Copies are never protected.",
      showArrows: "Show next-move arrows",
      showArrowsHelp:
        "The board opens with arrows for the moves that follow the position on it: the main line in green, side lines in blue. You can still switch them for a session. Games always start without them.",
      chanceArrows: "Show play chances",
      chanceArrowsHelp:
        "At the branches that carry play-chance marks, each arrow is drawn white with a magenta border — the likelier the move, the wider its arrow — and the moves bar prints each move's percentage. Unmarked branches keep the green and blue. You can still switch this for a session. Games always start without it.",
      white: "White",
      black: "Black",
      save: "Save",
      cancel: "Cancel",
      problem: "It could not be saved — this browser's storage is full or unavailable.",
    },
    /**
     * A text of several games: a repertoire is one game (a mainline with side
     * lines), so the reader merges them into one or splits them into many.
     */
    choice: {
      title_one: "This PGN holds {{count}} game",
      title_other: "This PGN holds {{count}} games",
      explain:
        "A repertoire is one game: a mainline with its side lines. Choose how to bring these in.",
      skipped_one: "{{count}} game has no moves or could not be read, and is left out.",
      skipped_other: "{{count}} games have no moves or could not be read, and are left out.",
      merge: "Merge into one repertoire",
      mergeHelp:
        "One tree: the first game's line is the mainline, and wherever another game leaves it becomes a side line. The file's comments and move marks are kept.",
      mergeUnavailable:
        "These games start from different positions, so they cannot share one tree.",
      split_one: "Keep as {{count}} repertoire",
      split_other: "Split into {{count}} repertoires",
      splitHelp:
        "Each game becomes a repertoire of its own, named after the game, all in a new folder named after the file.",
      folderFailed:
        "Could not make a folder for them — the limit is {{max}} folders, or this browser's storage is full.",
      tooMany: "That would pass the limit of {{max}} repertoires in this browser.",
      legacy:
        "This was saved as several games. A repertoire is one game with side lines — choose how to keep it.",
    },
    /**
     * The folders repertoires are filed under — one level: a folder holds
     * repertoires, never another folder.
     */
    folder: {
      unfiled: "Unfiled",
      back: "All repertoires",
      new: "New folder",
      newTitle: "New folder",
      rename: "Rename folder",
      delete: "Delete folder",
      download: "Download this folder as PGN",
      name: "Folder name",
      save: "Save",
      cancel: "Cancel",
      count_one: "{{count}} repertoire",
      count_other: "{{count}} repertoires",
      deleteConfirm_one: "Its {{count}} repertoire moves to Unfiled; nothing is deleted.",
      deleteConfirm_other: "Its {{count}} repertoires move to Unfiled; nothing is deleted.",
      empty: "This folder is empty. Move repertoires here from their settings.",
    },
    /**
     * Playing a repertoire against the trainer (`/repertoires/<id>/play`,
     * CTA-63) — a scripted opponent that answers only from the repertoire.
     */
    /** The games a repertoire is played as (CTA-63) — `lib/repertoireGames.ts`. */
    games: {
      open: "Games",
      /** The button on a list's row or card, named for its repertoire (CTA-113). */
      openNamed: "Games of {{name}}",
      end: { title: "Get to the end" },
      backtrack: { title: "Backtracking" },
    },
    play: {
      side: "Your side",
      white: "White",
      black: "Black",
      restart: "Restart from the start position",
      /** The header's Autoplay toggle: the label says what a click does. */
      autoplayOn: "Play — the trainer answers your moves",
      autoplayOff: "Pause — you move both sides",
      download: "Download with your additions as PGN",
      back: "Back to the board",
      /** The engine's switch — off by default: a drill does not show the answer. */
      engine: "Engine",
      engineHelp:
        "Shows the engine's best lines above the tabs and the evaluation bar. It never plays a move; its settings are in the Engine tab.",
      sideHelp:
        "The trainer plays the other side. Changing it starts again from the first move; what you added is kept.",
      /** The switch that draws the next-move arrows — off by default. */
      arrows: "Show next-move arrows",
      arrowsHelp:
        "Arrows for the moves that follow the position on the board: the main line in green, side lines in blue.",
      /** The switch that shows the play chances — off by default. */
      chanceArrows: "Show play chances",
      chanceArrowsHelp:
        "Where the position's branch carries play-chance marks: the arrows are drawn white with a magenta border — the likelier the move, the wider its arrow — and the bar prints each move's percentage.",
      autoplay: "Autoplay",
      autoplayHelp:
        "The trainer answers your moves from the repertoire, picking among its lines at random. Off, you move both sides.",
      tabs: {
        settings: "Settings",
        score: "Score",
        map: "Map",
      },
      /** Game mode's tally — this session only. */
      score: {
        successes: "Right",
        failures: "Wrong",
        accuracy: "Accuracy",
        help: "Each position counts once: your first try there. Retries after a wrong move don't count again. The score is for this session only.",
        reset: "Reset score",
        startOver: "Start over",
        finished_one: "{{count}} line finished",
        finished_other: "{{count}} lines finished",
        covered: "Lines covered: {{covered}} of {{total}}",
      },
      status: {
        thinking: "The trainer is choosing a move…",
        yourMove: "Your move.",
        outOfBook:
          "The repertoire ends here. Every move you play now adds to it.",
        tryAgain: "That move isn't in the repertoire. Try again.",
        lineComplete: "You reached the end of this line. Restart for another.",
        lineCovered: "Line covered. Going back to the next line to cover…",
        allCovered: "Every line is covered. Well done!",
        required: "Play the marked move: the other lines from here are already covered.",
      },
    },
    /**
     * What to do with a session's changes to a repertoire (CTA-63) — the strip
     * the player shows while there are any.
     */
    changes: {
      title: "Unsaved changes",
      /** The header's Save button: opens the strip; disabled with nothing to save. */
      saveOpen: "Unsaved changes — save or discard them",
      saveNothing: "No unsaved changes",
      added_one: "{{count}} move added",
      added_other: "{{count}} moves added",
      /** The changes are edits alone — lines promoted or deleted, none added. */
      edited: "Lines or comments edited",
      update: "Update repertoire",
      updateHelp: "Make these changes part of this repertoire.",
      copy: "Save as copy",
      copyHelp: "Keep this repertoire as it is, and save a copy with your changes.",
      discard: "Discard",
      copyName: "{{name}} (copy)",
      /** The strip on a protected repertoire: no Update, its settings instead. */
      protected: {
        note: "This repertoire is protected: save your changes as a copy, or switch protection off in its settings (leaving this board loses the changes).",
        settings: "Open settings",
      },
      problem: {
        storage: "It could not be saved — this browser's storage is full or unavailable.",
        "too-many": "There is no room for another repertoire in this browser.",
      },
    },
    /** The board a repertoire is read on. */
    detail: {
      missing: "There is no such repertoire in this browser.",
      back: "Back to repertoires",
      loading: "Reading this line…",
      unreadable: "This repertoire could not be read.",
      tabs: {
        moves: "Moves",
        tree: "Tree",
        engine: "Engine",
      },
    },
  },
  /** Settings (`/settings/<tab>`, CTA-86) — one tab per concern. */
  settings: {
    title: "Settings",
    tabs: {
      export: "Export",
      import: "Import",
      storage: "Storage",
      appearance: "Appearance",
      engine: "Engine",
      support: "Support",
    },
    /** The Export tab: the reader's data as PGN files and a manifest, in one zip. */
    export: {
      intro:
        "Download your data as one .zip: PGN files that any chess program reads, and a manifest.json saying how they fit back together.",
      categories: {
        collections: "Collections",
        games: "Games",
        analyses: "Analyses",
        repertoires: "Repertoires",
      },
      includeShipped_one: "Include the {{count}} shipped collection",
      includeShipped_other: "Include the {{count}} shipped collections",
      run: "Export",
      working: "Exporting…",
      done: "Downloaded {{fileName}}.",
      failed: "The export could not be saved. Nothing was downloaded.",
      unreadable: "The games of “{{name}}” could not be read. Nothing was downloaded.",
      panel:
        "Games and Analyses are one PGN file each; every collection is a file of its own; repertoires are one file per folder, plus one for the unfiled ones. Your uploaded collections always go with Collections — the ones the app ships only when you ask. Nothing is changed or removed.",
    },
    /** The Import tab (CTA-89): an Export's zip read back into the app. */
    import: {
      intro:
        "Bring back a .zip made by Export — here or in another browser. You choose what to import and what happens where a folder is already here; nothing is written until you confirm.",
      choose: "Choose a .zip",
      /** The import's progress bar, named for a screen reader (CTA-109). */
      progress: "Import progress",
      reading: "Reading the file…",
      working: "Importing…",
      indexing: "Indexing “{{name}}”: {{done}} of {{total}} games",
      panel:
        "A clash is a folder that is both in the file and here (Unfiled always is; played games clash as a whole). Merge puts the file's items into it and keeps an item that is already here as it is — importing the same file twice changes nothing. Override replaces what the folder holds with the file's. Skip leaves the folder as it is. Folders that are not here yet are created, empty ones too.",
      /** The choice dialog. */
      dialog: {
        title: "Import {{fileName}}",
        from: "Exported on {{date}} by version {{version}}.",
        run: "Import",
        cancel: "Cancel",
        shipped_one: "The file holds {{count}} built-in collection. It is not imported: it ships with the app.",
        shipped_other: "The file holds {{count}} built-in collections. They are not imported: they ship with the app.",
        conflicts_one: "{{count}} folder is already here:",
        conflicts_other: "{{count}} folders are already here:",
        counts: "{{incoming}} in the file · {{existing}} here",
        folderChoice: "For this folder:",
        toggle: "Choose for this folder",
        preview: "Will add {{added}}, replace {{replaced}}, skip {{skipped}}, create {{folders}} folders.",
        refusedRecords: "Not imported: it would come to {{total}}, past the limit of {{max}}.",
        refusedFolders: "Not imported: it would need {{total}} folders, past the limit of {{max}}.",
        dropsOldest_one: "Played games are kept up to {{max}}: the oldest game will be dropped.",
        dropsOldest_other: "Played games are kept up to {{max}}: the {{count}} oldest games will be dropped.",
      },
      choices: {
        merge: "Merge",
        override: "Override",
        skip: "Skip",
      },
      choiceHelp: {
        merge: "The file's items go into the folder; an item already here stays as it is.",
        override: "What the folder holds is replaced by the file's items.",
        skip: "Nothing from the file goes into the folder.",
      },
      /** How the top level is named in each category's clash list. */
      top: {
        collections: "Top level",
        games: "Your played games",
        analyses: "Unfiled",
        repertoires: "Unfiled",
      },
      /** The report, one line per category. */
      result: {
        done: "{{category}}: {{added}} added, {{replaced}} replaced, {{skipped}} skipped, {{folders}} folders created.",
        refusedRecords: "{{category}}: not imported — it would come to {{total}}, past the limit of {{max}}.",
        refusedFolders: "{{category}}: not imported — it would need {{total}} folders, past the limit of {{max}}.",
        storage: "{{category}}: the browser refused to store it. Part of it may have been written.",
        tooMany: "{{category}}: not imported — the limit was reached while importing.",
        indexing: "{{category}}: a collection's games could not be indexed. The collections before it were imported.",
      },
      /** The dialog for a file that cannot be imported. */
      incompatible: {
        title: "This file cannot be imported",
        problem: {
          "not-zip": "“{{fileName}}” is not a .zip file.",
          "no-manifest": "“{{fileName}}” has no manifest.json, so it was not made by Export.",
          malformed: "The manifest.json in “{{fileName}}” cannot be read.",
          foreign: "The manifest.json in “{{fileName}}” is not this app's.",
          newer: "“{{fileName}}” was made by a newer version of the app (format {{version}}). Update the app to import it.",
          "missing-file": "“{{fileName}}” does not hold {{path}}, which its manifest names.",
          unreadable: "{{path}} in “{{fileName}}” does not match its manifest.",
        },
        advice: "You can still bring its PGN files in by hand:",
        collections: "a collection — the Library's upload",
        analyses: "analyses and played games — the Analysis Board's Load tab",
        repertoires: "repertoires — Add repertoire",
        files: "The PGN files in it:",
        noFiles: "It holds no PGN files.",
        close: "Close",
      },
    },
    /** The Storage tab (CTA-94): how much space the app's data takes. */
    storage: {
      intro:
        "How much space this app's data takes on this device: the browser's own estimates for the whole origin, and your records — counted exactly, and sized by this app's own estimate, per category.",
      browser: {
        title: "Browser storage",
        usage: "Origin usage (estimate)",
        indexedDb: "IndexedDB usage (estimate)",
        /** The two columns' headers (CTA-109) — every column of a table is named. */
        measure: "Measure",
        size: "Size",
        /** Where the quota went: the reader's own look-up. */
        quotaNote: "The storage quota is not shown here; to see it, open your browser's developer tools.",
      },
      /** Where the browser reports no number at all. */
      notAvailable: "Not available",
      data: {
        title: "Your data",
        category: "Category",
        records: "Records",
        payload: "Estimated payload",
        categories: {
          playedGames: "Engine games",
          analyses: "Analyses",
          repertoires: "Repertoires",
          collectionGames: "Library games",
          jobs: "Background jobs",
        },
      },
      note:
        "Payload sizes are this app's own estimate of what its records hold — not disk usage. The browser may compress, deduplicate and add index overhead, so they do not sum to the storage it reports.",
      panel:
        "Nothing here is written or removed. The browser's figures are its own estimates for the whole origin; the per-category sizes are this app's estimate of what your records hold, which the browser may store differently on disk. The built-in collections are files fetched over the network, not records in your browser, so they count towards the origin usage only.",
    },
    /** The Appearance tab (CTA-107): the reader's theme. */
    appearance: {
      intro:
        "Choose how the app looks. A theme restyles every screen and every board at once, and is remembered on this device.",
      theme: "Theme",
      /** Light and dark are not a theme: they are the header's switch, under every theme. */
      modeNote: "Light and dark are the switch in the header; every theme has both.",
    },
    /** The Engine tab (CTA-153): which engine every board runs. */
    engine: {
      intro:
        "Choose the engine the boards use. It applies to every board from its next search and is remembered on this device. A game against the engine is played by the engine it began with, and a saved game goes on with its own.",
      note: "An engine that cannot run on this host is listed anyway, with what it needs.",
      /** Where the engines run — the tab's two inner tabs. */
      tabs: { label: "Where the engine runs", browser: "Browser", api: "API" },
      /** The right-hand panel: what the chosen engine-server engine declared. */
      uci: {
        title: "UCI defaults — {{name}}",
        note: "What the engine declared in its uci reply, as the server sent it. Threads and Hash are capped by the server; a search goes no deeper than {{maxDepth}}.",
        none: "Choose an engine on the API tab to see the UCI options it declares.",
      },
      /** The panel on the API tab while no server engine is chosen: a pointer to the Blog's guide. */
      setup: {
        title: "Add an engine on this computer",
        intro: "Any UCI engine — Stockfish 18 or 19, native — can run on your own machine and serve every board here.",
        guide: "Read the guide.",
      },
      /** The engine server on the reader's own computer (`lib/engineServer.ts`, `yarn api:start`) — off unless turned on. */
      server: {
        title: "Engine server on this computer",
        description:
          "Stockfish running natively on your own computer, with all its threads — faster than in the browser. Start it from the app's source with yarn api:start; its engines are then listed here.",
        enable: "Use an engine server",
        enableHelp: "While this is off, the app never contacts it.",
        address: "Server address",
        addressHelp: "Where the server listens — {{example}} unless you moved it.",
        addressInvalid: "Enter an address like {{example}}.",
        connect: "Connect",
        /** The legend of the server's engines, listed in the panel. */
        engines: "Engines on this server",
        /** The chip beside the switch — the connection at a glance. */
        indicator: {
          connecting: "Connecting…",
          online: "Connected · {{ms}} ms",
          offline: "Not connected",
        },
        retry: "Try again",
        status: {
          connecting: "Connecting to {{url}}…",
          unreachable:
            "Can't reach {{url}}. Is the server running? Your browser may also ask whether this site may reach your computer — allow it.",
          "not-an-engine-server": "{{url}} answered, but not as an engine server.",
          checkedAt: "Checked at {{time}}.",
        },
      },
    },
    /** The Support tab (CTA-155): how to reach us — a numbered list, the preferred way first. */
    support: {
      title: "Need help with {{name}}?",
      intro: "Found a bug, have an idea or a question? We would like to hear from you.",
      heading: "How to reach us",
      items: {
        issue: { title: "Raise a GitHub issue (preferred)", text: "Bugs, ideas and questions, in the open — others can follow along and add to them." },
        email: { title: "Send an email", text: "If GitHub is not for you, write to us at:" },
      },
    },
  },
  /** The engine picker (`src/blocks/forms/EnginePicker`, CTA-153): the engines to choose between. */
  enginePicker: {
    legend: "Engine",
    version: "Version",
    threading: { single: "Single-thread", multi: "Multi-thread" },
    /** How the engine's strength can be limited — what its build declares. */
    strength: {
      skill: "Strength by Skill Level",
      elo: "Strength by Elo",
      both: "Strength by Skill Level or Elo",
    },
    /** Why an engine is disabled here, by reason (`EngineUnavailableReason`). */
    unavailable: {
      "cross-origin-isolation": "Needs cross-origin isolation — not available on this host",
    },
    /** An engine on the engine server, before its address (`EngineDescriptor.server`). */
    server: "On the engine server",
  },
  /** The `EngineOptionsTable` block: an engine's `uci` options. */
  engineOptionsTable: {
    columns: { name: "Option", type: "Type", default: "Default", range: "Range" },
    none: "—",
    empty: "The engine declared no options.",
  },
  /** The registered themes' names (`src/design-system/themes/`, CTA-107). */
  appearance: {
    themes: {
      default: "Default",
      brown: "Brown",
      green: "Green",
      "high-contrast": "High contrast",
      console: "Console",
    },
  },
  /**
   * **A game's computer analysis** (CTA-171): the words of its report and eval
   * graph (`blocks/panels/ComputerAnalysisReport`, `EvalGraph` — CTA-173),
   * shared by the Jobs screen and the Analysis Board.
   */
  computerAnalysis: {
    variants: {
      light: "Light",
      medium: "Medium",
      full: "Full",
    },
    verdicts: {
      inaccuracy: "Inaccuracy",
      mistake: "Mistake",
      blunder: "Blunder",
      missedMate: "Missed mate",
    },
    report: {
      title: "Computer analysis report",
      measure: "Per player",
      white: "White",
      black: "Black",
      notAnalysed: "Not analysed",
      step: "{{measure}} by {{player}}: {{count}}. Go to the next one",
      measures: {
        inaccuracies: "Inaccuracies",
        mistakes: "Mistakes",
        blunders: "Blunders",
        missedMates: "Missed mates",
        acpl: "Average centipawn loss",
        accuracy: "Accuracy",
      },
    },
    graph: {
      title: "Evaluation graph",
      start: "Start position",
      empty: "No move has an evaluation to draw.",
      hint: "Left and right arrows to move through the moves, Home and End to either end, Enter to go to the move.",
      hintRead: "Left and right arrows to move through the moves, Home and End to either end.",
    },
    /** The Analysis Board's Computer analysis tab's form (CTA-174, `ComputerAnalysisForm`). */
    form: {
      engine: "Engine",
      engineName: "The job runs {{name}} — the engine chosen in Settings.",
      threads: "Threads",
      hash: "Hash (MB)",
      depth: "Depth",
      moveTime: "Time per move",
      noTimeLimit: "No time limit",
      noTimeLimitHelp: "Each position is searched to the full depth, however long that takes — a deep search can take minutes a move.",
      moveTimeNone: "No limit",
      seconds: "{{seconds}} s",
      lines: "Lines",
      minDepth: "Early stop from depth",
      minDepthHelp: "From this depth a search stops as soon as another line falls more than the variation range below the best. At the full depth it never stops early.",
      moves: "Moves",
      side: "Analyse the moves of",
      sides: {
        both: "Both sides",
        w: "White",
        b: "Black",
      },
      fromMove: "From move",
      fromMoveHelp: "The first move analysed.",
      toMove: "To move",
      toMoveHelp: "Empty: to the end of the game.",
      moveRange: "A move number from 1 to {{max}}.",
      fromColour: "The first move analysed is",
      fromWhite: "White's",
      fromBlack: "Black's",
      advanced: "Advanced",
      advancedToggle: "Advanced options",
      thresholdsHelp: "A move is marked when it loses more than these, in centipawns.",
      inaccuracy: "Inaccuracy above",
      mistake: "Mistake above",
      blunder: "Blunder above",
      cp: "{{cp}} cp",
      range: "Variation range",
      rangeHelp: "How far below the best line another line may score and still be kept.",
      variants: "Variants to save",
      variantsHelp: "Each one ticked is saved as a new saved analysis, all from one run of the engine.",
      variantHelp: {
        light: "The best alternative on each inaccuracy, mistake and blunder.",
        medium: "Every alternative within the variation range, on each inaccuracy, mistake and blunder.",
        full: "Every alternative within the variation range, on every analysed move.",
      },
      start: "Start computer analysis",
      noVariant: "Tick at least one variant to start.",
      noMoves: "The board has no moves to analyse.",
      noRange: "No move of the game is in the chosen range.",
      problem: {
        invalid: "There is nothing to analyse in the chosen moves.",
        storage: "The job could not be kept — the browser refused the write.",
        "too-many": "Too many jobs are waiting. Let some finish, or cancel them on the Jobs screen.",
      },
    },
    /**
     * The report and graph at the top of the Analysis Board's Moves tab
     * (CTA-177, the Computer analysis tab's before), and a job's results so
     * far (`jobLiveAnalysis`, CTA-174 — the Jobs screen's since CTA-178).
     */
    board: {
      liveGraph: "Evaluation graph so far",
      latest: "Latest: after",
      latestStart: "Latest: the start position",
      depth: "depth {{depth}}",
      reportTitle: "Report",
      reportToggle: "Show or hide the report",
    },
    /** The New Job dialog and the Analyse icons that open it (CTA-177, `NewJobDialog`). */
    newJob: {
      analyse: "Analyse with the computer",
      analyseNamed: "Analyse {{name}} with the computer",
      title: "New job",
      game: "Game:",
      intro: "The engine goes over the game's main line in the background, while you go on with anything else.",
      cancel: "Cancel",
      queued: "Computer analysis of {{name}} queued.",
      openJob: "Open in Jobs",
      existing: {
        text: "{{name}} already has a computer analysis — the job: {{status}}. Start a new one, or check the existing one on the Jobs screen?",
        startNew: "Start a new analysis",
        check: "Check existing",
      },
    },
  },
  /**
   * **The Jobs screen** (`/jobs`, CTA-173): the background jobs — a game's
   * computer analysis — their progress, and the shell's indicator of the one
   * running.
   */
  jobs: {
    title: "Jobs",
    count: "Jobs: {{count}}",
    intro: "A computer analysis runs here in the background, one at a time, while you go on with anything else. Each finished position is kept, so a job a reload cut short resumes where it stopped.",
    loading: "Reading your jobs…",
    empty: "No jobs yet. Send a game to computer analysis from the Analysis Board.",
    untitled: "Untitled game",
    progress: "{{done}} of {{total}} positions",
    noneSelected: "Pick a job to see its details, its report and its evaluation graph.",
    missing: "There is no such job — it may have been deleted.",
    links: "Links",
    openSource: "Open the analysed game",
    openOutput: "Open the {{variant}} analysis",
    resume: "Resume",
    pause: "Pause",
    cancel: "Cancel",
    delete: "Delete",
    resumeNamed: "Resume {{name}}",
    pauseNamed: "Pause {{name}}",
    cancelNamed: "Cancel {{name}}",
    deleteNamed: "Delete {{name}}",
    confirmDelete: {
      title: "Delete this job?",
      body: "The job “{{name}}” and its progress go. The analyses it saved stay in Saved analyses.",
      confirm: "Delete",
      cancel: "Keep it",
    },
    reportTitle: "Report",
    reportReading: "Reading the report…",
    reportMissing: "The saved analyses this job made are gone, so its report cannot be shown.",
    /** A job not done: its results so far (CTA-178, `JobLiveReport`). */
    liveTitle: "Results so far",
    kinds: {
      "computer-analysis": "Computer analysis",
    },
    status: {
      queued: "Queued",
      running: "Running",
      paused: "Paused",
      interrupted: "Interrupted",
      done: "Done",
      failed: "Failed",
      cancelled: "Cancelled",
    },
    errors: {
      source: "The game sent for analysis could not be read again.",
      engine: "The engine stopped answering. Resume to try again from the last finished position.",
      storage: "The analyses could not be saved — the browser refused the write. Free some space, then resume.",
      "too-many": "Saved analyses is full, so the results could not be saved. Delete some, then resume.",
    },
    sides: {
      both: "Both sides",
      w: "White only",
      b: "Black only",
    },
    table: {
      source: "Game",
      status: "Status",
      progress: "Progress",
      started: "Started",
      finished: "Finished",
      actions: "Actions",
      open: "Show the job {{name}}",
      progressOf: "Progress of {{name}}",
    },
    facts: {
      title: "The job's options",
      kind: "Kind",
      engine: "Engine",
      depth: "Depth",
      time: "Time per move",
      seconds: "{{count}} s",
      noTimeLimit: "No limit",
      lines: "Lines",
      threads: "Threads",
      hash: "Hash",
      side: "Analysed",
      moves: "Moves",
      fromMove: "From move {{move}} to the end",
      moveRange: "Moves {{from}} to {{to}}",
      variants: "Outputs",
      created: "Asked for",
      started: "Started",
      finished: "Finished",
    },
    /** The shell's indicator (the header): the job running, linking to the screen. */
    indicator: {
      running: "Analysing {{done}}/{{total}}",
      queued: "{{count}} queued",
      label: "Jobs: {{name}}, {{done}} of {{total}} positions",
      labelQueued: "Jobs: {{count}} queued",
      started: "Computer analysis started: {{name}}.",
      paused: "Computer analysis paused: {{name}}.",
      done: "Computer analysis finished: {{name}}.",
      failed: "Computer analysis failed: {{name}}.",
      cancelled: "Computer analysis cancelled: {{name}}.",
    },
  },
  footer: {
    /** Label on the link out to the project's source repository. */
    source: "Source",
    /** The legal pages' links (CTA-159). */
    privacy: "Privacy Policy",
    cookies: "Cookies Notice",
  },
};

export default en;
