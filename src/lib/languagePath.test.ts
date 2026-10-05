import { describe, expect, it } from "vitest";

import {
  appPathOf,
  languageOfAppPath,
  languagePrefixOf,
  localizedAppPath,
  routerBasename,
  switchedLanguageUrl,
  unprefixedAppPath,
} from "./languagePath";

const BASE = "/chess-trainer-app/";

describe("the language in the address", () => {
  it("reads a pathname under the base", () => {
    expect(appPathOf("/chess-trainer-app/he/blog/x/", BASE)).toBe("/he/blog/x/");
    expect(appPathOf("/chess-trainer-app/", BASE)).toBe("/");
    expect(appPathOf("/chess-trainer-app", BASE)).toBe("/");
    expect(appPathOf("/elsewhere", BASE)).toBe("/");
    expect(appPathOf("/library", "/")).toBe("/library");
  });

  it("takes a shipped language's prefix, and nothing else, as a language", () => {
    expect(languagePrefixOf("/he/library")).toBe("he");
    expect(languagePrefixOf("/he")).toBe("he");
    expect(languagePrefixOf("/he/")).toBe("he");
    expect(languagePrefixOf("/hello")).toBeUndefined();
    // The default language has no prefix, and a language the app lacks is a route.
    expect(languagePrefixOf("/en/library")).toBeUndefined();
    expect(languagePrefixOf("/fr/library")).toBeUndefined();
    expect(languageOfAppPath("/library")).toBe("en");
    expect(languageOfAppPath("/he/library")).toBe("he");
  });

  it("strips and adds the prefix", () => {
    expect(unprefixedAppPath("/he/blog/x/")).toBe("/blog/x/");
    expect(unprefixedAppPath("/he")).toBe("/");
    expect(unprefixedAppPath("/he/")).toBe("/");
    expect(unprefixedAppPath("/library")).toBe("/library");
    expect(localizedAppPath("/blog/x/", "he")).toBe("/he/blog/x/");
    expect(localizedAppPath("/", "he")).toBe("/he/");
    expect(localizedAppPath("/blog/x/", "en")).toBe("/blog/x/");
  });

  it("puts the prefix in the router's basename, without a trailing slash", () => {
    expect(routerBasename(BASE, "en")).toBe(BASE);
    expect(routerBasename(BASE, "he")).toBe("/chess-trainer-app/he");
    expect(routerBasename("/", "he")).toBe("/he");
  });

  it("moves to the same place in another language, query and hash kept", () => {
    const at = { pathname: "/chess-trainer-app/tools/analysis", search: "?fen=x", hash: "#a" };
    expect(switchedLanguageUrl(at, BASE, "he")).toBe("/chess-trainer-app/he/tools/analysis?fen=x#a");
    const back = { pathname: "/chess-trainer-app/he/tools/analysis", search: "?fen=x", hash: "" };
    expect(switchedLanguageUrl(back, BASE, "en")).toBe("/chess-trainer-app/tools/analysis?fen=x");
    expect(switchedLanguageUrl({ pathname: "/chess-trainer-app/he", search: "", hash: "" }, BASE, "en")).toBe("/chess-trainer-app/");
    expect(switchedLanguageUrl({ pathname: "/", search: "", hash: "" }, "/", "he")).toBe("/he/");
  });
});
