import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

import { ALLOWLIST, type AllowedGap } from "./allowlist";
import type { PageRecord, ReflowRecord } from "./checks";
import { comboName } from "./matrix";

/*
  The pass's own report (CTA-116): what ran, what the allowlist let through,
  the reflow measurements — as `summary.md` and `summary.json` beside
  Playwright's HTML report, uploaded with it by CI.

  And the check Playwright cannot make: **an allowlist entry that stops
  occurring fails the run.** A page's record says which entries it met; an
  entry with pages in its scope in this run, none of which met it, is stale —
  its gap closed (or moved), and the entry would now only hide the next one.
  Scope is what ran: a reduced or filtered run does not fail an entry whose
  pages it did not visit.
*/

const attachment = <T>(result: TestResult, name: string): T | undefined => {
  const found = result.attachments.find((candidate) => candidate.name === name);
  return found?.body === undefined ? undefined : (JSON.parse(found.body.toString()) as T);
};

const inScope = (entry: AllowedGap, record: PageRecord): boolean =>
  (entry.on?.pieces !== true || record.pieces) && (entry.on?.themes === undefined || entry.on.themes.includes(record.combo.theme));

export default class SummaryReporter implements Reporter {
  private readonly outputDir: string;
  // Keyed by what a page is, so a retry replaces its first attempt.
  private readonly pages = new Map<string, PageRecord>();
  private readonly reflow = new Map<string, ReflowRecord>();
  private failed = 0;

  constructor(options: { outputDir: string }) {
    this.outputDir = options.outputDir;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const page = attachment<PageRecord>(result, "a11y-record");
    if (page !== undefined) this.pages.set(`${comboName(page.combo)} › ${page.route}`, page);
    const reflow = attachment<ReflowRecord>(result, "reflow-record");
    if (reflow !== undefined) this.reflow.set(`${reflow.language} › ${reflow.route}`, reflow);
    if (test.outcome() === "unexpected") this.failed += 1;
  }

  async onEnd(result: FullResult): Promise<{ status: FullResult["status"] } | undefined> {
    const pages = [...this.pages.values()];
    const reflow = [...this.reflow.values()];

    const met = (entry: AllowedGap) => pages.filter((page) => (page.allowlisted[entry.id] ?? 0) > 0).length;
    const scoped = (entry: AllowedGap) => pages.filter((page) => inScope(entry, page)).length;
    const stale = ALLOWLIST.filter((entry) => scoped(entry) > 0 && met(entry) === 0);

    const lines: string[] = [];
    lines.push("# Browser accessibility pass", "");
    lines.push(`${pages.length} pages checked, ${this.failed} test${this.failed === 1 ? "" : "s"} failed (run ${result.status}).`, "");
    lines.push("## Allowlist", "");
    lines.push("| Entry | Rule | Gap (ACCESSIBILITY.md) | Pages in scope | Pages it met | |", "| --- | --- | --- | --- | --- | --- |");
    for (const entry of ALLOWLIST) {
      const status = stale.includes(entry) ? "**STALE — remove it**" : scoped(entry) === 0 ? "not in this run" : "ok";
      lines.push(`| ${entry.id} | ${entry.rule} | ${entry.gap} | ${scoped(entry)} | ${met(entry)} | ${status} |`);
    }
    lines.push("");

    const byRoute = new Map<string, ReflowRecord[]>();
    for (const record of reflow) byRoute.set(record.route, [...(byRoute.get(record.route) ?? []), record]);
    if (byRoute.size > 0) {
      lines.push("## Reflow at 320 CSS px (measured, not gated)", "");
      lines.push("| Route | `main` width | Sideways scroll, en | Sideways scroll, he | Widest element past the edge |", "| --- | --- | --- | --- | --- |");
      for (const [route, records] of byRoute) {
        const of = (language: string) => records.find((record) => record.language === language);
        const px = (record: ReflowRecord | undefined) => (record === undefined ? "—" : record.pageOverflowPx > 0 ? `${record.pageOverflowPx} px` : "none");
        const widest = records.flatMap((record) => record.offenders.map((offender) => ({ ...offender, language: record.language }))).sort((a, b) => b.overflowPx - a.overflowPx)[0];
        const main = of("en")?.mainWidthPx;
        lines.push(`| ${route} | ${main === undefined ? "—" : `${main} px`} | ${px(of("en"))} | ${px(of("he"))} | ${widest === undefined ? "" : `\`${widest.selector}\` (+${widest.overflowPx} px, ${widest.language})`} |`);
      }
      lines.push("");
    }

    const problems = pages.filter((page) => page.violations.length > 0 || page.consoleErrors.length > 0);
    if (problems.length > 0) {
      lines.push("## Pages with findings", "");
      for (const page of problems) {
        lines.push(`- **${page.route}** under ${comboName(page.combo)}`);
        for (const violation of page.violations) lines.push(`  - ${violation.rule} (${violation.targets.length} node${violation.targets.length === 1 ? "" : "s"}): ${violation.help}`);
        for (const error of page.consoleErrors) lines.push(`  - ${error}`);
      }
      lines.push("");
    }

    try {
      mkdirSync(this.outputDir, { recursive: true });
      writeFileSync(join(this.outputDir, "summary.md"), lines.join("\n"));
      writeFileSync(join(this.outputDir, "summary.json"), JSON.stringify({ status: result.status, pages, reflow, stale: stale.map((entry) => entry.id) }, null, 2));
    } catch (error) {
      console.error(`a11y summary: could not write the report: ${String(error)}`);
    }

    if (stale.length === 0) return undefined;
    console.error(
      `\nThe accessibility allowlist has ${stale.length} stale entr${stale.length === 1 ? "y" : "ies"}: ${stale.map((entry) => entry.id).join(", ")}.\n` +
        "No page in this run met it — its gap is closed. Remove the entry from e2e/a11y/allowlist.ts and its row from ACCESSIBILITY.md's known gaps.",
    );
    return { status: "failed" };
  }
}
