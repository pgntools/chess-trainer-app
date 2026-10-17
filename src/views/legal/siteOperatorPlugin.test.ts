import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { siteOperator } from "../../../plugins/siteOperator";

/*
  The build's site-operator plugin (CTA-182): the legal pages' placeholders
  filled in their source, ahead of the MDX compiler — in their files alone,
  each in its language, and never in the `?raw` text the MDX editor opens.
*/

const DIR = resolve("articles");
const ENV = {
  SITE_OPERATOR_NAME: "Ada Example",
  SITE_OPERATOR_NAME_HE: "עדה דוגמה",
  SITE_OPERATOR_ADDRESS: "1 Example Street",
  SITE_PRIVACY_EMAIL: "privacy@example.org",
};
const SOURCE = "## Data controller\n\n**%OPERATOR_NAME%**, %OPERATOR_ADDRESS%. **%PRIVACY_EMAIL%**\n";

/** The plugin's transform of `code` as the file `id`, as Vite would call it. */
const transform = (id: string, code = SOURCE, enabled = true) => {
  const context = { error: vi.fn((message: string) => { throw new Error(message); }) };
  const plugin = siteOperator({ dir: DIR, env: ENV, enabled });
  expect(plugin.enforce).toBe("pre");
  const result = (plugin.transform as unknown as (this: typeof context, code: string, id: string) => { code: string } | undefined).call(context, code, id);
  return result?.code;
};

describe("the site-operator plugin", () => {
  it("fills an in-app page's placeholders in its own language", () => {
    expect(transform(join(DIR, "app-pages/privacy.mdx"))).toBe("## Data controller\n\n**Ada Example**, 1 Example Street. **privacy@example.org**\n");
    expect(transform(join(DIR, "app-pages/privacy.he.mdx"))).toBe("## Data controller\n\n**עדה דוגמה**, 1 Example Street. **privacy@example.org**\n");
  });

  it("leaves the MDX editor's ?raw source, a Blog article and a file elsewhere as written", () => {
    expect(transform(`${join(DIR, "app-pages/privacy.mdx")}?raw`)).toBeUndefined();
    expect(transform(join(DIR, "guides/privacy.mdx"))).toBeUndefined();
    expect(transform(resolve("elsewhere/app-pages/privacy.mdx"))).toBeUndefined();
    expect(transform(join(DIR, "app-pages/notes.ts"))).toBeUndefined();
  });

  it("does nothing in a build without its operator — the pages are not in it", () => {
    expect(transform(join(DIR, "app-pages/privacy.mdx"), SOURCE, false)).toBeUndefined();
  });

  it("fails the build naming the file, on a placeholder it does not know", () => {
    expect(() => transform(join(DIR, "app-pages/cookies.mdx"), "%OPERATOR_PHONE%")).toThrow(/^app-pages\/cookies\.mdx: %OPERATOR_PHONE% is no placeholder/);
  });
});
