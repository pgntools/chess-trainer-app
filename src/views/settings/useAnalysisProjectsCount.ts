import { useEffect, useState } from "react";

import { analysisProjectStores } from "../../lib/analysisProjectsEnabled";

/**
 * How many Analysis V2 Projects there are (CTA-186) — the Export tab's count
 * for the category, `undefined` while the store is read. The store comes
 * through `analysisProjectStores` (`analysisProjectsEnabled.ts`), which a
 * build without the module leaves out: there the category is not offered and
 * this stays `undefined`.
 */
export const useAnalysisProjectsCount = (): number | undefined => {
  const [count, setCount] = useState<number | undefined>(undefined);
  useEffect(() => {
    let live = true;
    let unsubscribe: (() => void) | undefined;
    void analysisProjectStores().then((stores) => {
      if (!live || stores === undefined) return;
      const { projects } = stores;
      const update = () => setCount(projects.analysisProjectsSnapshot()?.length);
      unsubscribe = projects.subscribeAnalysisProjects(update);
      update();
    });
    return () => {
      live = false;
      unsubscribe?.();
    };
  }, []);
  return count;
};
