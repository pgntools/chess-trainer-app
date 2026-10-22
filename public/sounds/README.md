# The boards' move sounds (CTA-260)

Six short samples, played by every board composed from the board core when a
move is played or stepped to (`src/lib/moveSounds.ts`,
`src/views/board/core/useMoveSounds.ts`; Settings → Sounds turns them on and
off and sets their volume).

| File | Played for | Made from |
| --- | --- | --- |
| `move.mp3` | a plain move | Impact Sounds `impactWood_light_000` |
| `capture.mp3` | a capture | Impact Sounds `impactWood_heavy_002` |
| `castle.mp3` | castling | Impact Sounds `impactWood_light_000`, then `impactWood_light_002` 110 ms later |
| `check.mp3` | a check | Impact Sounds `impactWood_medium_000` with Interface Sounds `glass_002` |
| `promote.mp3` | a promotion | Impact Sounds `impactWood_medium_000`, then Interface Sounds `confirmation_003` |
| `game-end.mp3` | a mate, or a move that ends the game | Impact Sounds `impactWood_heavy_000`, then Interface Sounds `confirmation_004` |

## Source and licence

Both packs are by **Kenney** (<https://www.kenney.nl>), released under
**Creative Commons Zero (CC0 1.0)** —
<https://creativecommons.org/publicdomain/zero/1.0/> — free for personal,
educational and commercial use, credit not required (given here anyway):

- **Impact Sounds** 1.0 (19-12-2019) — <https://kenney.nl/assets/impact-sounds>
- **Interface Sounds** 1.0 (11-02-2020) — <https://kenney.nl/assets/interface-sounds>

The licence text each pack ships with (`License.txt`) reads:
"License: (Creative Commons Zero, CC0) … This content is free to use in
personal, educational and commercial projects. Support us by crediting Kenney
or www.kenney.nl (this is not mandatory)". CC0 is compatible with this app's
MIT licence. Checked 2026-10-22.

Not used, and why: chess.com's sounds are proprietary; lichess's standard
set is listed as non-free in lila's `COPYING.md`, and its other sets are
AGPLv3+ or CC BY-NC-SA — none fits an MIT app.

## Rebuilding them

`bash scripts/move-sounds.sh` downloads both packs and writes the six files
here (mono, 44.1 kHz, 96 kbps MP3, every browser's format) — the mixes and
gains are in the script, so changing a sound is one line there.
