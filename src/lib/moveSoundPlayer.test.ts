import { afterEach, describe, expect, it, vi } from "vitest";

/*
  Playing the move sounds (CTA-260): one element per kind, under the base,
  and never a throw or a rejection the reader would see.
*/

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const player = () => import("./moveSoundPlayer");

describe("the move sound player", () => {
  it("serves each kind from public/sounds under the base", async () => {
    const { moveSoundUrl } = await player();
    expect(moveSoundUrl("capture")).toBe(`${import.meta.env.BASE_URL}sounds/capture.mp3`);
  });

  it("plays a kind from its start at the volume asked, held to 0–1, reusing its element", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const { playMoveSound } = await player();
    playMoveSound("move", 0.4);
    playMoveSound("move", 3);
    expect(play).toHaveBeenCalledTimes(2);
    const [first, second] = play.mock.contexts as HTMLAudioElement[];
    expect(first).toBe(second);
    expect(first.src).toContain("sounds/move.mp3");
    expect(first.volume).toBe(1);
  });

  it("swallows a refusal — the browser's autoplay rule — and a throw", async () => {
    const refused = vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new DOMException("no gesture", "NotAllowedError"));
    const { playMoveSound } = await player();
    expect(() => playMoveSound("check", 0.5)).not.toThrow();
    await Promise.resolve();
    refused.mockImplementation(() => {
      throw new Error("unsupported");
    });
    expect(() => playMoveSound("check", 0.5)).not.toThrow();
  });

  it("does nothing where there is no Audio — the pre-render", async () => {
    vi.stubGlobal("Audio", undefined);
    const { playMoveSound, preloadMoveSounds } = await player();
    expect(() => preloadMoveSounds()).not.toThrow();
    expect(() => playMoveSound("move", 1)).not.toThrow();
  });
});
