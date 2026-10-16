import { jobRow } from "../../tables/JobQueueTable/fixtures";
import type { JobRowView } from "../../tables";

/*
  One Case's jobs (CTA-221) — a running computer analysis, a done one and a
  failed one, newest first. Imported only by the block's gallery and its test.
*/

export const CASE_JOBS: readonly JobRowView[] = [
  jobRow("running", "running", { createdAt: "2026-10-12T09:30:00.000Z" }),
  jobRow("done", "done", { createdAt: "2026-10-11T18:05:00.000Z" }),
  jobRow("failed", "failed", { title: "קרלסן – נפומניאשצ'י", createdAt: "2026-10-10T08:00:00.000Z" }),
];
