import { describe, expect, it } from "vitest";

import { brownTheme, defaultTheme, greenTheme, themes, type ThemeDefinition } from "../../../design-system/themes";
import { decodeDraft, draftOf, DRAFT_FORMAT, encodeDraft, themeDataOf, tokenAt, withId, withToken } from "./draft";
import { contrastCaptionOf, fromChoice, lengthOf, toChoice } from "./fieldValues";

/* The theme editor's draft (CTA-115): its tokens by path, and its file. */

describe("a draft's tokens", () => {
  it("are read by path, and left-out ones read as undefined", () => {
    expect(tokenAt(brownTheme, "light.primary.main")).toBe("#186cbc");
    expect(tokenAt(brownTheme, "chess.nag.good.dark")).toBe("#5ad672");
    expect(tokenAt(defaultTheme, "light.success.main")).toBeUndefined();
    expect(tokenAt(defaultTheme, "components.buttonLip.rest")).toBeUndefined();
  });

  it("are set without touching the theme they came from, the rest shared", () => {
    const next = withToken(brownTheme, "light.primary.main", "#000000");
    expect(tokenAt(next, "light.primary.main")).toBe("#000000");
    expect(tokenAt(brownTheme, "light.primary.main")).toBe("#186cbc");
    expect(next.dark).toBe(brownTheme.dark);
    expect(next.chess).toBe(brownTheme.chess);
  });

  it("give the same theme back for a token set to what it is", () => {
    expect(withToken(brownTheme, "light.primary.main", "#186cbc")).toBe(brownTheme);
    expect(withToken(defaultTheme, "light.success.main", undefined)).toBe(defaultTheme);
  });

  it("go back to MUI's default when left out, taking an emptied group with them", () => {
    const next = withToken(brownTheme, "light.success.main", undefined);
    expect("success" in next.light).toBe(false);
    const added = withToken(defaultTheme, "light.success.main", "#00aa00");
    expect(added.light.success).toEqual({ main: "#00aa00" });
  });

  it("switch a knob between MUI's own and a value", () => {
    const on = withToken(defaultTheme, "components.buttonLip", { rest: 0.22, hover: 0.3 });
    expect(withToken(on, "components.buttonLip.rest", 0.5).components.buttonLip).toEqual({ rest: 0.5, hover: 0.3 });
    expect(withToken(on, "components.buttonLip", null).components.buttonLip).toBeNull();
  });

  it("carry the id's name key with it", () => {
    const draft = withId(draftOf(defaultTheme, "Default", "ברירת מחדל"), "ocean");
    expect(draft.theme.id).toBe("ocean");
    expect(draft.theme.labelKey).toBe("appearance.themes.ocean");
  });

  it("never carry hand-written overrides", () => {
    const handWritten: ThemeDefinition = { ...defaultTheme, overrides: { MuiChip: { defaultProps: { size: "small" } } } };
    expect(themeDataOf(handWritten)).toEqual(defaultTheme);
    expect(themeDataOf(handWritten).overrides).toBeUndefined();
  });
});

describe("a draft file", () => {
  it.each(themes.map((theme) => [theme.id, theme] as const))("round-trips a draft of the %s theme", (_id, theme) => {
    const draft = draftOf(theme, "A name", "שם");
    const text = encodeDraft(draft);
    expect(JSON.parse(text)).toMatchObject({ format: DRAFT_FORMAT, version: 1, name: "A name", nameHe: "שם", from: theme.id });
    expect(decodeDraft(text)).toEqual({ draft });
  });

  it("round-trips an edited draft, a left-out token and all", () => {
    const edited = { ...draftOf(greenTheme, "Green", ""), theme: withToken(withToken(greenTheme, "light.success.main", "#00aa00"), "dark.error.main", undefined) };
    expect(decodeDraft(encodeDraft(edited))).toEqual({ draft: edited });
  });

  it.each([
    ["not JSON", "{", /not JSON/],
    ["not a draft", JSON.stringify({ format: "chessapp.somethingElse" }), /not a theme draft/],
    ["another version", JSON.stringify({ format: DRAFT_FORMAT, version: 2 }), /version 2/],
    ["a bad id", JSON.stringify({ format: DRAFT_FORMAT, version: 1, theme: { ...defaultTheme, id: "Bad Id" } }), /no valid id/],
    [
      "a missing token",
      JSON.stringify({ format: DRAFT_FORMAT, version: 1, theme: { ...defaultTheme, chess: { ...defaultTheme.chess, lastMove: undefined } } }),
      /lacks chess\.lastMove/,
    ],
    [
      "a missing palette colour",
      JSON.stringify({ format: DRAFT_FORMAT, version: 1, theme: { ...defaultTheme, dark: { ...defaultTheme.dark, focusRing: 3 } } }),
      /lacks dark\.focusRing/,
    ],
  ])("is refused when %s", (_case, text, problem) => {
    const decoded = decodeDraft(text);
    expect("problem" in decoded && decoded.problem).toMatch(problem);
  });

  it("takes the name key from the id, whatever the file says", () => {
    const text = JSON.stringify({ format: DRAFT_FORMAT, version: 1, name: "Ocean", theme: { ...defaultTheme, id: "ocean", labelKey: "something.else" } });
    const decoded = decodeDraft(text);
    expect("draft" in decoded && decoded.draft.theme.labelKey).toBe("appearance.themes.ocean");
  });
});

describe("the fields' values", () => {
  it("read a length as a number, words, or nothing", () => {
    expect(lengthOf("24")).toBe(24);
    expect(lengthOf(" 1.05 ")).toBe(1.05);
    expect(lengthOf("clamp(28px, 4vw, 42px)")).toBe("clamp(28px, 4vw, 42px)");
    expect(lengthOf("-0.02em")).toBe("-0.02em");
    expect(lengthOf("  ")).toBeUndefined();
  });

  it("tell a choice's null, number and string apart, null being a left-out token but a knob's own value", () => {
    expect([toChoice(null), toChoice(undefined), toChoice(700), toChoice("none")]).toEqual(["null", "null", "700", '"none"']);
    expect(fromChoice("700", "typography.h1.fontWeight")).toBe(700);
    expect(fromChoice("null", "typography.h1.fontWeight")).toBeUndefined();
    expect(fromChoice("null", "components.linkUnderline")).toBeNull();
  });

  it("caption a token's checks by the worst of them", () => {
    const check = (ratio: number, level: "required" | "advisory" = "required") => ({
      id: `x${ratio}`,
      token: "light.text.secondary",
      scheme: "light" as const,
      label: `on ${ratio}`,
      foreground: "",
      background: "",
      ratio,
      kind: "text" as const,
      minimum: 4.5,
      level,
      pass: ratio >= 4.5,
    });
    const format = (ratio: number) => `${ratio}:1`;
    expect(contrastCaptionOf([], format)).toBeUndefined();
    expect(contrastCaptionOf([check(7), check(5)], format)).toEqual({ text: "5:1 at worst — on 5, needs 4.5:1. All 2 checks pass AA.", tone: "success" });
    expect(contrastCaptionOf([check(7), check(3)], format)?.tone).toBe("error");
    expect(contrastCaptionOf([check(3, "advisory")], format)).toEqual({ text: "3:1 at worst — on 3, needs 4.5:1. 1 of 1 check fails AA (advisory).", tone: "warning" });
  });
});
