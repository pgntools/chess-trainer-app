/**
 * The stand-ins every v2 board's tests share (it lives here, beside the core,
 * from the days of the Development section — CTA-60 to CTA-79).
 *
 * Not a test file — a helper the test files pull their `vi.mock` factories
 * from, because the boards composed from one core want one set of stubs, not
 * a copy each. Which is the same argument the core itself makes.
 *
 * Two things have to be stubbed for any board screen under jsdom
 * (`.claude/rules/chessboard.md` §8):
 *
 * - **`<Chessboard>`** measures its own square on mount and throws
 *   `"Square width not found"` where there is no layout engine. The stub keeps
 *   hold of the options it was handed, which is how a test drags a piece and
 *   reads the arrows back. A screen with the captured-pieces strips reaches for
 *   `defaultPieces` too, and the promotion picker for
 *   `chessColumnToColumnIndex`, so the mock provides those.
 * - **The engine** — every engine a board can run is a descriptor in
 *   `lib/engines/builtin.ts`, whose `create()` builds a real `Worker`, which
 *   jsdom has none of. {@link builtinEnginesMock} replaces that module: each
 *   shipped descriptor keeps its id, name, requirements and capabilities, and
 *   its `create()` returns a {@link FakeEngine} declaring what that build
 *   declares. So the default engine, a reader's choice and a switch between
 *   them are all faked the same way, and the fake records what was searched
 *   and lets a test push UCI results back — a board's engine behaviour driven
 *   exactly and synchronously, including the property the core exists to
 *   keep, that a board which passes no `onBestMove` never moves a piece.
 *
 *   ```ts
 *   vi.mock("../../lib/engines/builtin", async (importOriginal) =>
 *     (await import("../board/boardTestHarness")).builtinEnginesMock(importOriginal),
 *   );
 *   ```
 */
import type { ReactNode } from "react";
import type {
  EngineDescriptor,
  EngineHandle,
  EngineMessage,
  EngineMessageCallback,
  EngineOption,
  SearchOptions,
} from "../../lib/engineTypes";
// Types only: a value import would be the very module this file stands in for.
import type * as BuiltinEngines from "../../lib/engines/builtin";

const spin = (name: string, min: number, max: number): [string, EngineOption] => [name, { name, type: "spin", min, max }];

/**
 * What the Stockfish 19 builds answer `uci` with (`public/stockfish/README.md`):
 * `Threads` pinned on the single-thread build and 1–32 on the multi-thread one.
 */
const stockfish19Options = (multiThread: boolean): Map<string, EngineOption> =>
  new Map([
    spin("Threads", 1, multiThread ? 32 : 1),
    spin("Hash", 1, 33554432),
    spin("MultiPV", 1, 256),
    spin("Skill Level", 0, 20),
    ["UCI_LimitStrength", { name: "UCI_LimitStrength", type: "check", defaultValue: "false" }],
    spin("UCI_Elo", 1320, 3190),
  ]);

/** An engine stand-in: no worker, and every message pushed by hand. */
export class FakeEngine implements EngineHandle {
  static instances: FakeEngine[] = [];

  /** The descriptor it was built for — `undefined` when a test built it by hand. */
  readonly descriptor: EngineDescriptor | undefined;
  readonly searches: string[] = [];
  /** Each search's options, beside {@link searches} — a depth and time, or `infinite`. */
  readonly searchOptions: SearchOptions[] = [];
  readonly setOptions: [string, string | number][] = [];
  stops = 0;
  /** What the build it stands in for declares — the default's when built by hand. */
  readonly options: ReadonlyMap<string, EngineOption>;
  terminated = false;
  private listeners = new Set<EngineMessageCallback>();

  constructor(descriptor?: EngineDescriptor) {
    this.descriptor = descriptor;
    this.options = stockfish19Options(descriptor?.capabilities.multiThread ?? false);
    FakeEngine.instances.push(this);
  }

  onMessage(listener: EngineMessageCallback) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  whenOptionsReady(callback: () => void) {
    callback();
    return () => {};
  }

  setOption(name: string, value: string | number) {
    this.setOptions.push([name, value]);
    const option = this.options.get(name);
    return option !== undefined && (option.min === undefined || option.min !== option.max);
  }

  search(fen: string, options: SearchOptions) {
    this.searches.push(fen);
    this.searchOptions.push(options);
  }

  stop() {
    this.stops += 1;
  }

  terminate() {
    this.terminated = true;
    this.listeners.clear();
  }

  /** Push one parsed message back, as the real wrapper would. */
  say(message: Partial<EngineMessage>) {
    const full: EngineMessage = { uciMessage: "", ...message };
    [...this.listeners].forEach((listener) => listener(full));
  }

  get lastSearch() {
    return this.searches.at(-1);
  }

  /** The most recently constructed instance — what a mounted screen talks to. */
  static latest(): FakeEngine {
    const instance = FakeEngine.instances.at(-1);
    if (!instance) throw new Error("no engine was constructed");
    return instance;
  }

  static reset() {
    FakeEngine.instances = [];
  }
}

/**
 * The `lib/engines/builtin` stand-in, as a `vi.mock` factory's return value:
 * the shipped engines, each building a {@link FakeEngine} for itself. The named
 * descriptors are the same objects as {@link BuiltinEngines.BUILTIN_ENGINES}'
 * entries, so the registry finds them by identity as it does the real ones.
 */
export const builtinEnginesMock = async (
  importOriginal: () => Promise<typeof BuiltinEngines>,
): Promise<typeof BuiltinEngines> => {
  const actual = await importOriginal();
  const faked = actual.BUILTIN_ENGINES.map((descriptor): EngineDescriptor => {
    const fake: EngineDescriptor = { ...descriptor, create: () => new FakeEngine(fake) };
    return fake;
  });
  const byId = (id: string): EngineDescriptor => {
    const descriptor = faked.find((each) => each.id === id);
    if (descriptor === undefined) throw new Error(`no shipped engine ${id}`);
    return descriptor;
  };
  return {
    ...actual,
    BUILTIN_ENGINES: faked,
    STOCKFISH_19_LITE_SINGLE: byId(actual.STOCKFISH_19_LITE_SINGLE.id),
    STOCKFISH_19_LITE_MULTI: byId(actual.STOCKFISH_19_LITE_MULTI.id),
  };
};

/** The options the board stub was last handed — shared by the mock and the test. */
export const boardSpy: { options: Record<string, unknown> | null } = {
  options: null,
};

/** The `react-chessboard` stand-in, as a `vi.mock` factory's return value. */
export const reactChessboardMock = () => ({
  Chessboard: ({ options }: { options: Record<string, unknown> }) => {
    boardSpy.options = options;
    return (
      <div
        data-testid="board"
        data-board-id={String(options.id)}
        data-position={String(options.position)}
        data-orientation={String(options.boardOrientation)}
        data-dragging={String(options.allowDragging)}
        data-arrows={String(
          (options.arrows as { endSquare: string }[] | undefined)?.length ?? 0,
        )}
        data-masked={String(options.pieces !== undefined)}
      />
    );
  },
  // Only what `PromotionPicker` reaches for.
  chessColumnToColumnIndex: (
    column: string,
    _columns: number,
    orientation: string,
  ) =>
    orientation === "white"
      ? column.charCodeAt(0) - "a".charCodeAt(0)
      : 7 - (column.charCodeAt(0) - "a".charCodeAt(0)),
  // The captured-pieces strips draw their icons with these.
  defaultPieces: Object.fromEntries(
    ["w", "b"].flatMap((color) =>
      ["K", "Q", "R", "B", "N", "P"].map((letter) => {
        const key = `${color}${letter}`;
        return [key, () => <svg data-testid={`piece-${key}`} />];
      }),
    ),
  ),
});

/**
 * The opening book, stubbed: the shared `CurrentOpening` and the book
 * capability must not pull the real ~3MB eco.json into a screen test.
 */
export const openingsMock = async (
  importOriginal: () => Promise<typeof import("../../lib/openings")>,
) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadOpeningBook: () => Promise.resolve({}),
    getPositionBook: () => ({}),
    findOpening: () => undefined,
    knownMoveOpenings: () => [],
  };
};

/** The board options the stub was last handed, or a legible failure. */
export const boardOptions = () => {
  if (boardSpy.options === null) {
    throw new Error("the board has not rendered");
  }
  return boardSpy.options as {
    id?: string;
    position?: string;
    boardOrientation?: "white" | "black";
    allowDragging?: boolean;
    showAnimations?: boolean;
    pieces?: unknown;
    arrows?: { startSquare: string; endSquare: string; color: string }[];
    onPieceDrop?: (args: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => boolean;
    /** The drawing gestures a board that writes shapes takes (CTA-143). */
    allowDrawingArrows?: boolean;
    onSquareMouseDown?: (args: { square: string; piece: null }, event: MouseLike) => void;
    onMouseOverSquare?: (args: { square: string; piece: null }) => void;
    onSquareMouseUp?: (args: { square: string; piece: null }, event: MouseLike) => void;
  };
};

/** The fields of a mouse event a board's square handlers read. */
type MouseLike = { button: number; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean };

/** A tiny type alias so a test can name a rendered screen without `any`. */
export type Screen = () => ReactNode;
