/**
 * What the MDX editor opens with — a short article showing the three things
 * one is made of: Markdown, an embed reading the Library (a shipped
 * collection, so it draws on every machine), and a PGN of the article's own.
 */
export const STARTER_DOCUMENT = `export const opera = \`[Event "Paris"]
[White "Morphy, Paul"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5! cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7! Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+! Nxb8 17. Rd8# 1-0\`

## A draft

Type on the left: **Markdown**, and the article components by name — no \`import\`.

## From the Library

<CollectionTournamentTable _id="/library/candidates2026" format="roundRobin" />

<BoardRow>
  <CollectionGameBoard game="/library/fischer/50" startMove="17" />
  <CollectionGameBoard game="/library/capablanca/442" startMove="8" />
</BoardRow>

## A game of the article's own

<InlinePgnGame pgn={opera} from="9" to="17" start="12" caption="Morphy's Opera Game, before 13. Rxd7!" />
`;
