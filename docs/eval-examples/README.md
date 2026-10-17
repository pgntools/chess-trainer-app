# Engine evaluation examples

Scripts that measure how a native Stockfish behaves, run against the binaries
on a development machine. They inform the hosted-engine design
([`docs/engine.md`](../engine.md) §8) and are not part of the app or its tests.

## `tt_reuse.py` — does the engine's memory carry over between positions?

Stockfish keeps a transposition table (its `Hash`): the positions it has
already searched. Stepping to the next move of a game, much of the new
position's tree was searched as part of the previous one, so a warm engine
reaches the same depth sooner — the evaluation is not built *from* the
previous one, the work is just not repeated.

The script walks the first 20 plies of a Ruy Lopez (`1.e4 e5 2.Nf3 Nc6 3.Bb5
a6 … 10…c5`) and searches each position to a fixed depth twice:

- **warm** — one long-lived engine that has searched every earlier position
  (no `ucinewgame` between them, as the app's boards do: `UciEngine` never
  sends one);
- **cold** — the position alone, after `ucinewgame` (the hash cleared), as an
  engine picked at random from a pool would be.

```sh
python tt_reuse.py /home/lalala/src/stockfish19/stockfish/stockfish-linux-x86-64-universal 26
```

It needs [python-chess](https://python-chess.readthedocs.io/) (the
`game-anal-v1` venv has it).

### Results — Stockfish 19, `Threads 4`, `Hash 512`, 2026-10-09

| Depth | Warm total | Cold total | Cold / warm |
| --- | --- | --- | --- |
| 22 | 11.2 s | 16.6 s | 1.49× |
| 26 | 26.0 s | 43.7 s | 1.68× |

<details>
<summary>Per ply, depth 26</summary>

```
ply move   warm s  cold s  warm nodes  cold nodes
  1 e4       1.21    1.34   5,218,169   5,385,440
  2 e5       1.01    1.71   4,455,425   6,758,375
  3 Nf3      1.27    1.86   5,724,655   7,535,618
  4 Nc6      1.08    2.08   4,845,494   8,229,163
  5 Bb5      0.84    1.85   3,909,738   7,239,121
  6 a6       1.23    2.21   5,006,052   8,635,771
  7 Ba4      1.07    2.22   4,495,511   8,286,777
  8 Nf6      0.77    2.66   3,405,962  10,445,590
  9 O-O      1.51    3.57   6,384,821  13,666,050
 10 Be7      2.23    2.35   8,984,593   9,434,452
 11 Re1      1.67    1.89   7,022,318   7,338,453
 12 b5       0.65    2.37   2,878,455   9,153,957
 13 Bb3      1.32    1.76   5,707,783   7,004,089
 14 d6       1.76    1.81   7,210,701   7,137,868
 15 c3       0.72    1.42   3,361,396   5,580,512
 16 O-O      1.04    1.77   4,635,408   6,900,624
 17 h3       1.10    3.80   4,755,552  14,927,242
 18 Na5      2.57    3.07  10,040,108  11,787,075
 19 Bc2      1.49    2.11   6,125,228   8,212,813
 20 c5       1.49    1.87   6,129,849   7,110,629
total warm 26.0s, cold 43.7s, cold/warm 1.68x
```

</details>

### What it means

- The gain **grows with depth** (1.49× → 1.68×), and infinite analysis goes
  deeper than either; single plies range from none to ~3.5× (`Nf6`, `b5`,
  `h3`). Under a time limit the same gain shows as a deeper search.
- It is the gain of **stepping through a game**; a jump to an unrelated
  position gets little.
- **A hosted engine keeps it only if a board keeps talking to the same engine
  process** — hence one engine per session in the server API, never a search
  sent to whichever pooled engine is free. Changing `Hash` (or `ucinewgame`)
  clears it, so the server applies only the options that changed.
- One run on a noisy machine (CPU in powersave) — the direction is consistent,
  the exact ratios are not.
