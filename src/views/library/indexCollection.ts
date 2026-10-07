import {
  buildCollectionIndexAsync,
  loadOpeningLookup,
  type IndexedRow,
} from "../../lib/collectionIndex";

type Progress = (done: number, total: number) => void;

/** The pass on the page itself, in batches that yield between them. */
const indexInThread = (games: readonly string[], onProgress: Progress, signal?: AbortSignal): Promise<IndexedRow[]> =>
  loadOpeningLookup().then((lookup) =>
    buildCollectionIndexAsync(games, { lookup, onProgress, signal }).then((index) => index.rows),
  );

/**
 * What a failed worker says. A script that would not load (a 404, a module
 * that will not evaluate) fires a bare `Event` with no message at all.
 */
const workerErrorOf = (event: Event): Error => {
  if (event instanceof ErrorEvent && event.message) {
    const where = event.filename ? ` (${event.filename}:${event.lineno}:${event.colno})` : "";
    return new Error(`The indexing worker failed: ${event.message}${where}`, { cause: event.error });
  }
  return new Error("The indexing worker could not be started (lib/collectionIndex.worker.ts)");
};

/** The pass in a module worker, terminated to cancel. */
const indexInWorker = (games: readonly string[], onProgress: Progress, signal?: AbortSignal): Promise<IndexedRow[]> =>
  new Promise((resolve, reject) => {
    // Written out in full: Vite bundles a worker only from this exact shape.
    const worker = new Worker(new URL("../../lib/collectionIndex.worker.ts", import.meta.url), {
      type: "module",
    });
    const finish = () => {
      worker.terminate();
      signal?.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      finish();
      reject(new DOMException("Indexing cancelled", "AbortError"));
    };
    if (signal?.aborted) {
      cancel();
      return;
    }
    signal?.addEventListener("abort", cancel);
    worker.onmessage = (
      event: MessageEvent<
        | { type: "progress"; done: number; total: number }
        | { type: "done"; rows: IndexedRow[] }
        | { type: "error"; message: string }
      >,
    ) => {
      const message = event.data;
      if (message.type === "progress") onProgress(message.done, message.total);
      else if (message.type === "done") {
        finish();
        resolve(message.rows);
      } else {
        finish();
        reject(new Error(`The indexing worker failed: ${message.message}`));
      }
    };
    worker.onmessageerror = () => {
      finish();
      reject(new Error("The indexing worker's answer could not be read"));
    };
    worker.onerror = (event) => {
      finish();
      reject(workerErrorOf(event));
    };
    worker.postMessage({ games: [...games] });
  });

/**
 * **Index an upload's games before it is kept** (CTA-75) — the full
 * `chess.js` pass of `lib/collectionIndex.ts`, about 8 ms a game, so a
 * 10,000-game upload is over a minute of work. It runs in a **Web Worker**
 * (`lib/collectionIndex.worker.ts`), so the page stays responsive and paints
 * the progress; where there is no worker (a test's jsdom) it runs here, in
 * batches that yield between them.
 *
 * **A worker that fails is not the games' fault** (CTA-141): one that will
 * not start, throws, or answers what cannot be read is logged with its cause
 * (`console.error`) and the pass runs here instead — slower, but the games
 * are checked by the same code either way.
 *
 * `signal` cancels: the worker is terminated and the promise rejects with an
 * `AbortError`.
 */
export const indexCollection = (
  games: readonly string[],
  onProgress: Progress,
  signal?: AbortSignal,
): Promise<IndexedRow[]> => {
  if (typeof Worker === "undefined") return indexInThread(games, onProgress, signal);
  return indexInWorker(games, onProgress, signal).catch((error: unknown) => {
    if (signal?.aborted) throw error;
    console.error("indexCollection: indexing on the page instead.", error);
    return indexInThread(games, onProgress, signal);
  });
};
