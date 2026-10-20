import { useSyncExternalStore } from "react";

import { runningEngineJobOf } from "../../lib/engineGate";
import { searchingTabs } from "../../lib/searchingTabs";
import { useEngineGateJobs } from "../board/core/engineGateJobs";
import { useBoardEngineState } from "./boardEngineState";

/**
 * **Is an engine searching anywhere** (CTA-242) — what the top bar's Engine
 * button breathes for: the board on this screen searching
 * (`useBoardEngineState`), a board in another tab searching
 * (`lib/searchingTabs.ts`), or an engine-lane job running in any tab
 * (`runningEngineJobOf` over the runtime's records, which every tab shares).
 * One engine runs app-wide (CTA-237), so these are one yes / no; the first
 * that holds is the reason given — the job named, for the button's name.
 */
export type EngineSearching =
  | { searching: false }
  | { searching: true; source: "board" | "tab" }
  | { searching: true; source: "job"; job: string };

const subscribeTabs = (listener: () => void) => searchingTabs().subscribe(listener);
const othersSearching = () => searchingTabs().othersSearching();

export const useEngineSearching = (): EngineSearching => {
  const board = useBoardEngineState();
  const otherTab = useSyncExternalStore(subscribeTabs, othersSearching, () => false);
  const job = runningEngineJobOf(useEngineGateJobs());
  if (board === "searching") return { searching: true, source: "board" };
  if (job !== undefined) return { searching: true, source: "job", job: job.title };
  if (otherTab) return { searching: true, source: "tab" };
  return { searching: false };
};
