import { describe, expect, it } from "vitest";

import { elementOf, SETTINGS, valuesOf, writeElement } from "./componentSettings";

/** An element's form values, as the Components section reads them. */
const formOf = (code: string) => {
  const element = elementOf(code);
  if (element === undefined) throw new Error(`not one element: ${code}`);
  return { element, values: valuesOf(element.attributes, SETTINGS[element.component]) };
};

describe("the two-column games' settings", () => {
  it("offer the comments as a choice — inline the default, bottom, hidden — in place of <InlinePgnGame>'s switch", () => {
    for (const component of ["InlinePgnGame2colH", "InlinePgnGame2colV", "InlinePgnGameColumns"]) {
      const comments = SETTINGS[component].find((field) => field.prop === "comments");
      expect(comments?.kind, component).toBe("choice");
      expect(comments?.kind === "choice" && comments.options.map((option) => option.value)).toEqual(["bottom", "hidden"]);
    }
    expect(SETTINGS.InlinePgnGame.find((field) => field.prop === "comments")?.kind).toBe("switch");
  });

  it("read a comments written as a switch — bare or {true} as bottom, {false} as hidden — and a choice as written", () => {
    expect(formOf("<InlinePgnGame2colH pgn={game} comments />").values.comments).toBe("bottom");
    expect(formOf("<InlinePgnGame2colH pgn={game} comments={true} />").values.comments).toBe("bottom");
    expect(formOf("<InlinePgnGame2colV pgn={game} comments={false} />").values.comments).toBe("hidden");
    expect(formOf('<InlinePgnGame2colV pgn={game} comments="hidden" />').values.comments).toBe("hidden");
    expect(formOf("<InlinePgnGame2colV pgn={game} />").values.comments).toBeUndefined();
  });

  it("write the choice back — the default, inline, left out", () => {
    const { element } = formOf("<InlinePgnGame2colH pgn={game} comments />");
    const fields = SETTINGS.InlinePgnGame2colH;
    expect(writeElement(element.component, element.attributes, fields, { comments: "bottom" })).toBe('<InlinePgnGame2colH pgn={game} comments="bottom" />');
    expect(writeElement(element.component, element.attributes, fields, { comments: "" })).toBe("<InlinePgnGame2colH pgn={game} />");
  });

  it("set 2colH's moves' width and 2colV's moves' height, each its default left out", () => {
    const widths = SETTINGS.InlinePgnGame2colH.find((field) => field.prop === "movesWidth");
    const heights = SETTINGS.InlinePgnGame2colV.find((field) => field.prop === "movesHeight");
    expect(widths?.kind === "choice" && widths.options.map((option) => option.value)).toEqual(["board", "dense"]);
    expect(heights?.kind === "choice" && heights.options.map((option) => option.value)).toEqual(["board", "full"]);
    expect(SETTINGS.InlinePgnGame2colV.some((field) => field.prop === "movesWidth")).toBe(false);
    const { element } = formOf("<InlinePgnGame2colV pgn={game} />");
    expect(writeElement(element.component, element.attributes, SETTINGS.InlinePgnGame2colV, { movesHeight: "full" })).toBe('<InlinePgnGame2colV pgn={game} movesHeight="full" />');
  });
});
