> [!WARNING]
> **This project is still in development — use it with caution.** It is an early
> beta: things may change or break from one release to the next. What you save
> (games, analyses, repertoires, collections) lives **in your browser only**, on
> your device — export it from *Settings → Export* now and then, so it is not lost.

# chessapp.dev

A chess trainer that runs entirely in the browser — no account, no server of its
own. Live at **[chessapp.dev](https://chessapp.dev)**.

- **Play with Engine** — a game against Stockfish, with a strength setting, and **Masked Pieces**, the same game with the pieces disguised.
- **Analysis Board** — a game tree with side lines, comments and engine lines; saved analyses.
- **Openings explorer** — the opening book, move by move.
- **Repertoires** — build your lines, then drill them against a trainer.
- **Library** — collections of master games and tournaments, from your own PGN files.
- **Blog** — articles with live boards, games and tournament tables embedded in them.
- **Your data is yours** — export everything as one zip, import it back, see how much space it takes.
- **Themes**, light and dark, and **English and Hebrew** (Hebrew reads right to left; the board never mirrors).

## Stack

[Vite](https://vite.dev), [React](https://react.dev) 19, TypeScript,
[react-chessboard](https://github.com/Clariity/react-chessboard) v5,
[chess.js](https://github.com/jhlywa/chess.js) and a Stockfish WebAssembly engine
in a Web Worker, over [MUI](https://mui.com). The reader's data is kept in the
browser's IndexedDB. Tests are Vitest and Testing Library, with a Playwright and axe
accessibility pass.

## Hosts

Every page is pre-rendered as static HTML, per language, and served from:

- **[chessapp.dev](https://chessapp.dev)** — Azure Static Web Apps.
- **[GitHub Pages](https://pgntools.github.io/chess-trainer-app/)** — under the `/chess-trainer-app/` sub-path.

## Quick start

You need **Node 24** (the maintainers use [fnm](https://github.com/Schniz/fnm)) and **Yarn 1**.

```sh
yarn install
yarn dev            # the dev server
yarn build          # type-check, production build and the pre-render
yarn test:run       # the unit and component tests
yarn lint           # the import rules, the accessibility rules, React's rules
```

The dev server serves the app under `/chess-trainer-app/` (the GitHub Pages sub-path);
`yarn dev` prints the address.

## More

- [CONTRIBUTING.md](CONTRIBUTING.md) — running it, how the code is organised, what a change has to pass, adding a theme.
- [ACCESSIBILITY.md](ACCESSIBILITY.md) — the accessibility target (WCAG 2.2 AA), how it is checked and the known gaps.
- [GitHub issues](https://github.com/pgntools/chess-trainer-app/issues) — bugs, ideas and questions.
