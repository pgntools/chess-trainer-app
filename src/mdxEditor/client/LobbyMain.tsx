import Box from "@mui/material/Box";

import { useOwnPageHeading } from "../../views/main/pageTitle";
import ArticlesLobby from "./ArticlesLobby";

/**
 * Layout-only wrapper, as on every other screen — the MDX editor's lobby
 * (`/dev/mdx-editor`): the Blog's files as a tree, each with its actions.
 * Reached only under `yarn mdx-editor:start`, so it never ships.
 */
const LobbyMain = () => {
  // The lobby's own title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  return (
    <Box data-testid="mdx-lobby-wrapper" sx={{ height: { md: "100%" } }}>
      <ArticlesLobby />
    </Box>
  );
};

export default LobbyMain;
