/**
 * **The databases the app no longer keeps** (CTA-192) — the legacy Analysis
 * Board's saved analyses (`chessapp.analyses`) and the legacy Jobs
 * (`chessapp.jobs`), removed with their module when Analysis V2 shipped in
 * its place. Nothing reads them any more, so each page load deletes them
 * (`src/main.tsx`): a reader who had them gets the space back, and the
 * legal pages need not list them.
 */
export const RETIRED_DATABASES = ["chessapp.analyses", "chessapp.jobs"] as const;

/**
 * Delete every retired database — a no-op where there is none, or no
 * IndexedDB at all (the pre-render). Never rejects; resolves once each
 * delete has answered (or is blocked by another tab, which deletes it in
 * turn when it closes).
 */
export const deleteRetiredDatabases = async (): Promise<void> => {
  if (typeof indexedDB === "undefined") return;
  await Promise.all(
    RETIRED_DATABASES.map(
      (name) =>
        new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = request.onerror = request.onblocked = () => resolve();
        }),
    ),
  );
};
