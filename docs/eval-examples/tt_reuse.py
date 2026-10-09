"""Does a warm transposition table speed up the next position of a game?

Walks the first N plies of a game. For each position, searches to a fixed
depth twice:
  warm - in one long-lived engine that has searched every earlier position
  cold - in that position alone, after `ucinewgame` (hash cleared)
and reports the time and nodes each needed.

Usage (needs python-chess):

    python tt_reuse.py /path/to/stockfish [depth]    # depth defaults to 22

See README.md beside it for what it measured and why it matters.
"""

import sys
import time

import chess
import chess.engine

ENGINE = sys.argv[1]
DEPTH = int(sys.argv[2]) if len(sys.argv) > 2 else 22
MOVES = "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5".split()
OPTS = {"Threads": 4, "Hash": 512}


def search(engine, board):
    t = time.perf_counter()
    info = engine.analyse(board, chess.engine.Limit(depth=DEPTH), game=object())
    return time.perf_counter() - t, info.get("nodes", 0)


def main():
    warm = chess.engine.SimpleEngine.popen_uci(ENGINE)
    cold = chess.engine.SimpleEngine.popen_uci(ENGINE)
    warm.configure(OPTS)
    cold.configure(OPTS)
    board = chess.Board()
    total_w = total_c = 0.0
    print(f"depth {DEPTH}, {OPTS}")
    print(f"{'ply':>3} {'move':<5} {'warm s':>7} {'cold s':>7} {'warm nodes':>11} {'cold nodes':>11}")
    # Warm the engine on the start position, as a board would have.
    warm.analyse(board, chess.engine.Limit(depth=DEPTH), game="g")
    for ply, san in enumerate(MOVES, 1):
        board.push_san(san)
        # The same `game` key keeps python-chess from sending ucinewgame.
        t = time.perf_counter()
        wi = warm.analyse(board, chess.engine.Limit(depth=DEPTH), game="g")
        wt = time.perf_counter() - t
        # A new `game` object each time sends ucinewgame: the hash is cleared.
        ct, cn = search(cold, board)
        total_w += wt
        total_c += ct
        print(f"{ply:>3} {san:<5} {wt:7.2f} {ct:7.2f} {wi.get('nodes', 0):11,} {cn:11,}")
    print(f"total warm {total_w:.1f}s, cold {total_c:.1f}s, cold/warm {total_c / total_w:.2f}x")
    warm.quit()
    cold.quit()


main()
