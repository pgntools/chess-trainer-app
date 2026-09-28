import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { defaultTheme } from "../../design-system/themes";
import { stubReducedMotion } from "../../test/reducedMotion";
import { useBoardSquareOptions } from "./boardColors";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useBoardSquareOptions", () => {
  it("gives the theme's squares, and nothing about motion without the preference", () => {
    const { result } = renderHook(() => useBoardSquareOptions());
    expect(result.current).toEqual({
      lightSquareStyle: { backgroundColor: defaultTheme.chess.board.lightSquare },
      darkSquareStyle: { backgroundColor: defaultTheme.chess.board.darkSquare },
      lightSquareNotationStyle: { color: defaultTheme.chess.board.lightSquareNotation },
      darkSquareNotationStyle: { color: defaultTheme.chess.board.darkSquareNotation },
    });
    expect(result.current).not.toHaveProperty("showAnimations");
  });

  it("turns the pieces' animation off when the reader's system asks for reduced motion (CTA-111)", () => {
    stubReducedMotion();
    const { result } = renderHook(() => useBoardSquareOptions());
    expect(result.current.showAnimations).toBe(false);
    expect(result.current.lightSquareStyle).toEqual({ backgroundColor: defaultTheme.chess.board.lightSquare });
  });
});
