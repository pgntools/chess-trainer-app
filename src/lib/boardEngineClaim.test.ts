import { describe, expect, it, vi } from "vitest";

import { createBoardEngineClaim, type ClaimChannel } from "./boardEngineClaim";

/** Two "tabs" over one in-memory channel: a message reaches every other tab, never its sender. */
const tabs = () => {
  const ends: { listener?: () => void }[] = [];
  const channel = (): ClaimChannel => {
    const end: { listener?: () => void } = {};
    ends.push(end);
    return {
      postMessage: () => ends.filter((other) => other !== end).forEach((other) => other.listener?.()),
      listen: (listener) => {
        end.listener = listener;
      },
    };
  };
  return [createBoardEngineClaim(channel), createBoardEngineClaim(channel)] as const;
};

describe("the board engine claim", () => {
  it("is held by the board that claimed it, and given back on release", () => {
    const [claim] = tabs();
    const board = {};
    expect(claim.holder()).toBeNull();
    claim.claim(board);
    expect(claim.holder()).toBe(board);
    claim.release(board);
    expect(claim.holder()).toBeNull();
  });

  it("is lost by the board holding it when another board in the tab claims it", () => {
    const [claim] = tabs();
    const first = {};
    const second = {};
    const lost = vi.fn();
    claim.subscribe(lost);
    claim.claim(first);
    claim.claim(second);
    expect(lost).toHaveBeenCalledExactlyOnceWith(first);
    expect(claim.holder()).toBe(second);
    // The loser's late release does not take it from the holder.
    claim.release(first);
    expect(claim.holder()).toBe(second);
  });

  it("is not lost to the same board claiming again", () => {
    const [claim] = tabs();
    const board = {};
    const lost = vi.fn();
    claim.subscribe(lost);
    claim.claim(board);
    claim.claim(board);
    expect(lost).not.toHaveBeenCalled();
  });

  it("is lost by a board in another tab when a board here claims it", () => {
    const [here, there] = tabs();
    const mine = {};
    const theirs = {};
    const lostThere = vi.fn();
    there.subscribe(lostThere);
    there.claim(theirs);
    here.claim(mine);
    expect(lostThere).toHaveBeenCalledExactlyOnceWith(theirs);
    expect(there.holder()).toBeNull();
    expect(here.holder()).toBe(mine);
  });

  it("keeps the rule within the tab where there is no channel", () => {
    const claim = createBoardEngineClaim(() => undefined);
    const first = {};
    const lost = vi.fn();
    claim.subscribe(lost);
    claim.claim(first);
    claim.claim({});
    expect(lost).toHaveBeenCalledExactlyOnceWith(first);
  });
});
