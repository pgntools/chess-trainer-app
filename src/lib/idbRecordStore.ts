import { committed, done } from "./idb";

/**
 * **The IndexedDB record-store factory** (CTA-77) — every store of the
 * reader's data but the Library's: the played games, the saved analyses and
 * their folders, the repertoires and theirs.
 *
 * A store is a **list** of rows — the screens read it in
 * order, newest first or oldest first — kept as **one IndexedDB record per
 * row**, so a write puts only the rows it changed rather than the whole list.
 * What the list's order is, is a `seq` number kept beside each row: the
 * factory assigns it, and a row keeps its own whenever the new order allows,
 * so an edit in place rewrites one record and a new row at the top one more.
 *
 * ### Reads are promises; what was read is kept
 *
 * The first subscriber (or {@link IdbRecordStore.load}) reads every row once.
 * From then on the list lives here and is handed out **synchronously**
 * ({@link IdbRecordStore.snapshot} — `undefined` only until that first read
 * lands), so `useSyncExternalStore` renders it on the first frame of every
 * later visit; a screen that needs the rows at its first render waits for
 * the read rather than reporting "not found" before it lands.
 *
 * ### Writes are queued, and say whether they landed
 *
 * A write is an update of the list (`rows → rows`), run after every write
 * before it — so two writes issued back to back (a folder removed, then its
 * analyses unfiled) each see the other's result — and answered only once the
 * transaction has committed: `undefined`, or `"storage"` when IndexedDB
 * refused it (the quota, a browser with it disabled). The kept list changes
 * only after the commit, so a refused write leaves the screen as it was.
 * Nothing here throws.
 *
 * ### Other tabs
 *
 * Each write is announced on a `BroadcastChannel`, and a tab that hears one
 * reads the store again (queued behind its own writes).
 *
 * ### A quiet write (CTA-222)
 *
 * A write may be **quiet**: committed, kept and announced to other tabs like
 * any other, but this tab's subscribers are not called — so a write the screen
 * on view already shows (the Case board's move on screen, on every arrow
 * press) costs it no re-render. The kept list is the new one all the same, so
 * the next render that reads the snapshot for any reason reads it, and the
 * next write that is not quiet tells every subscriber.
 */

/** What went wrong with a write. */
type IdbRecordStoreProblem = "storage";

/** One stored row: the row itself, and its place in the list. */
type Stored = { id: string; seq: number; value: unknown };

export interface IdbRecordStore<Row extends { id: string }> {
  /** The rows in list order — `undefined` until the first read lands. Stable between changes. */
  snapshot: () => readonly Row[] | undefined;
  /** Subscribe to changes. The first subscriber starts the first read. */
  subscribe: (onChange: () => void) => () => void;
  /** The rows, read now if they have not been. */
  load: () => Promise<readonly Row[]>;
  /**
   * Change the list: `update` gets the current rows and answers the next ones
   * (the same array for "nothing to do"). Queued behind every earlier write.
   */
  write: (
    update: (rows: readonly Row[]) => readonly Row[],
    options?: IdbRecordStoreWriteOptions,
  ) => Promise<IdbRecordStoreProblem | undefined>;
  /** Resolves once every write issued so far has landed (or been refused). Never rejects. */
  settled: () => Promise<void>;
  /**
   * The browser's own words for the last write it refused (CTA-208) —
   * `"QuotaExceededError: …"` — so a screen can say exactly why; `undefined`
   * before any refusal.
   */
  lastWriteError: () => string | undefined;
  /** **For tests**: forget everything read — the database itself is the caller's to delete. */
  reset: () => void;
}

/** How a write tells of itself — absent, as every write always has. */
export type IdbRecordStoreWriteOptions = {
  /**
   * Whether this write is **quiet** (CTA-222): its subscribers in this tab are
   * not called, other tabs are still told. Asked once the update has run, so
   * the update can decide it from the rows it found. Absent: not quiet.
   */
  quiet?: () => boolean;
};

export type IdbRecordStoreOptions<Row> = {
  /** The database the store lives in — opened once, and shared by its stores. */
  db: () => Promise<IDBDatabase>;
  /** The object store (`keyPath: "id"`). */
  store: string;
  /** A stored value back to a row, or `undefined` for one to drop — the record's normaliser. */
  normalise: (value: unknown) => Row | undefined;
  /** Which end of the list new rows usually go: the top (`newest-first`) or the bottom. */
  order: "newest-first" | "oldest-first";
  /** The `BroadcastChannel` other tabs hear this store's writes on. */
  channel: string;
  /**
   * **The whole list mended after every read** (CTA-203) — what one row's
   * normaliser cannot do because it needs the others (the Cases' order, given
   * to a record from before by its Project's). It keeps the list's ids and
   * their order, answering the same array when there is nothing to mend; a
   * row it replaces is written back before the read lands (a refusal is
   * ignored — the next read mends it again). Absent, nothing is mended.
   */
  repair?: (rows: readonly Row[]) => readonly Row[];
};

/**
 * Rows arriving from elsewhere (an import) merged into a newest-first list
 * **by date**: the arriving rows newest first among themselves (a stable
 * sort, so rows of one date keep the order they came in), each going before
 * the first kept row last changed earlier than it. The kept rows are never
 * re-ordered.
 */
export const mergedNewestFirst = <Row extends { updatedAt: string }>(
  kept: readonly Row[],
  incoming: readonly Row[],
): Row[] => {
  const arriving = [...incoming].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const merged: Row[] = [];
  let at = 0;
  for (const row of kept) {
    while (at < arriving.length && arriving[at].updatedAt > row.updatedAt) merged.push(arriving[at++]);
    merged.push(row);
  }
  while (at < arriving.length) merged.push(arriving[at++]);
  return merged;
};

const isStored = (value: unknown): value is Stored => {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.seq === "number" && Number.isFinite(row.seq);
};

export const idbRecordStore = <Row extends { id: string }>({
  db: openDb,
  store,
  normalise,
  order,
  channel: channelName,
  repair,
}: IdbRecordStoreOptions<Row>): IdbRecordStore<Row> => {
  let rows: readonly Row[] | undefined;
  /** Each row's `seq`, by id — what a write keeps where it can. */
  let seqs = new Map<string, number>();
  let queue: Promise<unknown> = Promise.resolve();
  let reading: Promise<readonly Row[]> | undefined;
  const listeners = new Set<() => void>();
  let channel: BroadcastChannel | undefined;

  const emit = () => {
    for (const listener of listeners) listener();
  };

  /** List order from `seq`: the high end is where new rows usually go. */
  const inOrder = (stored: Stored[]): Stored[] =>
    stored.sort((a, b) => (order === "newest-first" ? b.seq - a.seq : a.seq - b.seq));

  /** Every row, read from IndexedDB — none when it cannot be opened. */
  const readAll = async (): Promise<readonly Row[]> => {
    let stored: Stored[];
    try {
      const db = await openDb();
      stored = inOrder((await done(db.transaction(store).objectStore(store).getAll())).filter(isStored));
    } catch {
      seqs = new Map();
      return [];
    }

    const nextSeqs = new Map<string, number>();
    const read: Row[] = [];
    for (const record of stored) {
      const row = normalise(record.value);
      if (row === undefined || nextSeqs.has(row.id)) continue;
      nextSeqs.set(row.id, record.seq);
      read.push(row);
    }
    seqs = nextSeqs;
    if (repair === undefined) return read;

    const mended = repair(read);
    const mendedRows = mended.filter((row, index) => row !== read[index]);
    if (mendedRows.length > 0) {
      try {
        const db = await openDb();
        const tx = db.transaction(store, "readwrite");
        const objects = tx.objectStore(store);
        for (const row of mendedRows) objects.put({ id: row.id, seq: nextSeqs.get(row.id) ?? 0, value: row } satisfies Stored);
        await committed(tx);
      } catch {
        // Kept mended in memory; the next read mends it again.
      }
    }
    return mended;
  };

  const settleRead = (read: readonly Row[]) => {
    rows = read;
    emit();
    return read;
  };

  const load = (): Promise<readonly Row[]> => {
    if (rows !== undefined) return Promise.resolve(rows);
    reading ??= readAll()
      .then(settleRead)
      .finally(() => {
        reading = undefined;
      });
    return reading;
  };

  /**
   * The `seq` every row of `next` takes: its own where the order still allows,
   * else one past the row below it in `seq` terms — walking from the low end,
   * so a row added at the high end, or moved there, is the only one written.
   */
  const seqsOf = (next: readonly Row[]): Map<string, number> => {
    const fromLow = order === "newest-first" ? [...next].reverse() : next;
    const assigned = new Map<string, number>();
    let floor = -Infinity;
    for (const row of fromLow) {
      const own = seqs.get(row.id);
      const seq = own !== undefined && own > floor ? own : floor === -Infinity ? 0 : floor + 1;
      assigned.set(row.id, seq);
      floor = seq;
    }
    return assigned;
  };

  const announce = () => channel?.postMessage({ store });

  let lastError: string | undefined;
  /** An error as the browser names it: `name: message`, or what it says of itself. */
  const describe = (error: unknown): string =>
    error instanceof Error || (typeof DOMException !== "undefined" && error instanceof DOMException)
      ? [error.name, error.message].filter((part) => part !== "").join(": ")
      : String(error);

  const write = (
    update: (rows: readonly Row[]) => readonly Row[],
    { quiet }: IdbRecordStoreWriteOptions = {},
  ): Promise<IdbRecordStoreProblem | undefined> => {
    const run = queue.then(async (): Promise<IdbRecordStoreProblem | undefined> => {
      const current = await load();
      const next = update(current);
      if (next === current) return undefined;

      const before = new Map(current.map((row) => [row.id, row]));
      const nextSeqs = seqsOf(next);
      const puts = next.filter((row) => before.get(row.id) !== row || seqs.get(row.id) !== nextSeqs.get(row.id));
      const gone = current.filter((row) => !nextSeqs.has(row.id)).map((row) => row.id);
      if (puts.length > 0 || gone.length > 0) {
        try {
          const db = await openDb();
          const tx = db.transaction(store, "readwrite");
          const objects = tx.objectStore(store);
          for (const id of gone) objects.delete(id);
          for (const row of puts) objects.put({ id: row.id, seq: nextSeqs.get(row.id) ?? 0, value: row } satisfies Stored);
          await committed(tx);
        } catch (error) {
          lastError = describe(error);
          return "storage";
        }
      }
      seqs = nextSeqs;
      rows = next;
      if (quiet?.() !== true) emit();
      announce();
      return undefined;
    });
    queue = run.catch(() => undefined);
    return run;
  };

  const onChannelMessage = (event: MessageEvent<{ store?: string }>) => {
    if (event.data?.store !== store || rows === undefined) return;
    queue = queue.then(async () => settleRead(await readAll())).catch(() => undefined);
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    if (channel === undefined && typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(channelName);
      channel.onmessage = onChannelMessage;
      // Node's channel would hold a test run open; a browser's has no `unref`.
      (channel as unknown as { unref?: () => void }).unref?.();
    }
    if (rows === undefined) void load();
    return () => {
      listeners.delete(listener);
    };
  };

  const reset = () => {
    rows = undefined;
    seqs = new Map();
    reading = undefined;
    queue = Promise.resolve();
  };

  const settled = (): Promise<void> => queue.then(() => undefined);

  return { snapshot: () => rows, subscribe, load, write, settled, reset, lastWriteError: () => lastError };
};
