import Box from "@mui/material/Box";

import SessionsLobby from "./SessionsLobby";

/** Layout-only wrapper, as on every other screen — the sessions lobby (CTA-239): the table in the board square, the New session form beside it. */
const LobbyMain = () => (
  <Box data-testid="find-best-move-sessions-wrapper" sx={{ height: "100%" }}>
    <SessionsLobby />
  </Box>
);

export default LobbyMain;
