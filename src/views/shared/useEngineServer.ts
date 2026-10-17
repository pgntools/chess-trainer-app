import { useEffect, useSyncExternalStore } from "react";

import {
  engineServerStatus,
  ensureEngineServerChecked,
  subscribeEngineServer,
  type EngineServerStatus,
} from "../../lib/engineServer";

const OFF: EngineServerStatus = { state: "off" };

/**
 * **The engine server's status, live** (`lib/engineServer.ts`) — what
 * Settings → Engine shows, and the first check where the reader turned the
 * server on. The pre-render reads it off: nothing there asks a server.
 */
export const useEngineServer = (): EngineServerStatus => {
  const status = useSyncExternalStore(subscribeEngineServer, engineServerStatus, () => OFF);
  useEffect(ensureEngineServerChecked, []);
  return status;
};
