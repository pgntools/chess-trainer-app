import type { UciTransport } from "./engineTypes";

/**
 * **A local Web Worker as a {@link UciTransport}** — the one place in the app
 * that makes a `Worker` for an engine. Nothing else may assume one: a hosted
 * engine would be a socket behind the same three methods.
 *
 * `url` is the worker script, built by the caller from
 * `import.meta.env.BASE_URL` (the descriptors in `lib/engines/builtin.ts` do):
 * Vite serves `public/` under the configured `base` — `/chess-trainer-app/` on
 * the GitHub Pages project site, `/` on chessapp.dev and under Vitest — so a
 * bare `/stockfish/…` 404s under a sub-path deployment, and `new Worker()`
 * reports that only as an async `error` event, so the board goes quiet instead
 * of throwing.
 *
 * One dedicated worker per transport. Do NOT hoist one to module scope: a
 * shared worker leaks across route changes and cannot be torn down — and the
 * pre-render imports this module under Node, where there is no `Worker`.
 */
export class WorkerTransport implements UciTransport {
  private readonly worker: Worker;

  constructor(url: string) {
    this.worker = new Worker(url);
    // A worker that fails to load (wrong path, bad MIME type) never throws —
    // it just never answers. Say so, so the next silent board is one search away.
    this.worker.addEventListener("error", (event) => {
      console.error(
        `Engine worker failed to load from ${url}`,
        event.message || event,
      );
    });
  }

  send(line: string): void {
    this.worker.postMessage(line);
  }

  onLine(callback: (line: string) => void): () => void {
    const listener = (event: MessageEvent<string>) => callback(event.data);
    this.worker.addEventListener("message", listener);
    return () => this.worker.removeEventListener("message", listener);
  }

  close(): void {
    this.worker.terminate();
  }
}
