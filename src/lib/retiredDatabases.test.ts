import { describe, expect, it } from "vitest";

import { deleteRetiredDatabases, RETIRED_DATABASES } from "./retiredDatabases";

/** A database made the way an older build made it — one store, one record. */
const made = (name: string) =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("records", { keyPath: "id" }).put({ id: "a" });
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });

const names = async () => (await indexedDB.databases()).map((database) => database.name);

describe("the retired databases (CTA-192)", () => {
  it("are the legacy saved analyses' and the legacy jobs'", () => {
    expect(RETIRED_DATABASES).toEqual(["chessapp.analyses", "chessapp.jobs"]);
  });

  it("are deleted, and nothing else is", async () => {
    for (const name of [...RETIRED_DATABASES, "chessapp.library"]) await made(name);
    await deleteRetiredDatabases();
    const left = await names();
    expect(left).toContain("chessapp.library");
    for (const name of RETIRED_DATABASES) expect(left).not.toContain(name);
    indexedDB.deleteDatabase("chessapp.library");
  });

  it("is a no-op where there are none", async () => {
    await expect(deleteRetiredDatabases()).resolves.toBeUndefined();
  });
});
