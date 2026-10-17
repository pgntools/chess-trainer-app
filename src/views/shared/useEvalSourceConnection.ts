import { useEffect, useSyncExternalStore } from "react";

import type { EvalSourceConnection, EvalSourceConnectionState } from "../../lib/evalSources";

const NO_CONNECTION = (): EvalSourceConnection => "disabled";
const NO_SUBSCRIPTION = () => () => {};

/**
 * **An eval source's connection, followed** (CTA-199) — `undefined` for a
 * source that tells none. Checks it once where the reader turned it on, so
 * its dot is true wherever it is first shown (Settings → Engine's tab, the
 * top bar's Engine menu).
 */
export function useEvalSourceConnection(connection: EvalSourceConnectionState | undefined): EvalSourceConnection | undefined {
  const state = useSyncExternalStore(connection?.subscribe ?? NO_SUBSCRIPTION, connection?.read ?? NO_CONNECTION, NO_CONNECTION);
  useEffect(() => connection?.ensureChecked(), [connection]);
  return connection === undefined ? undefined : state;
}
