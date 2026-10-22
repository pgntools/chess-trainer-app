#!/usr/bin/env bash
# Rebuild public/sounds/*.mp3 — the boards' move sounds (CTA-260) — from two
# CC0 packs by Kenney (www.kenney.nl): Impact Sounds and Interface Sounds.
# The source, licence and what each file is made of: public/sounds/README.md.
#
#   bash scripts/move-sounds.sh            # downloads both packs into a temp dir
#   bash scripts/move-sounds.sh <dir>      # <dir> holds impact/ and interface/, unzipped
#
# Needs curl, unzip and an ffmpeg with libmp3lame (FFMPEG=… picks one).
set -euo pipefail

FFMPEG="${FFMPEG:-ffmpeg}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/sounds"
IMPACT_ZIP="https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip"
INTERFACE_PAGE="https://kenney.nl/assets/interface-sounds"

SRC="${1:-}"
if [ -z "$SRC" ]; then
  SRC="$(mktemp -d)"
  curl -sSL -o "$SRC/impact.zip" "$IMPACT_ZIP"
  interface_zip="$(curl -sSL "$INTERFACE_PAGE" | grep -o "https://kenney.nl/media/pages/assets/interface-sounds/[^']*\.zip" | head -1)"
  curl -sSL -o "$SRC/interface.zip" "$interface_zip"
  unzip -q "$SRC/impact.zip" -d "$SRC/impact"
  unzip -q "$SRC/interface.zip" -d "$SRC/interface"
fi
I="$SRC/impact/Audio"
U="$SRC/interface/Audio"

# Mono, 44.1 kHz, 96 kbps MP3 — every browser plays it; the files are a few KB.
encode=(-ac 1 -ar 44100 -c:a libmp3lame -b:a 96k)
mk() { "$FFMPEG" -hide_banner -loglevel error -y "$@"; }

mkdir -p "$OUT"
# A move: a light knock of wood on wood.
mk -i "$I/impactWood_light_000.ogg" -af volume=0.7 "${encode[@]}" "$OUT/move.mp3"
# A capture: a heavier knock.
mk -i "$I/impactWood_heavy_002.ogg" -af volume=0.7 "${encode[@]}" "$OUT/capture.mp3"
# Castling: two light knocks, the king's and the rook's, 110 ms apart.
mk -i "$I/impactWood_light_000.ogg" -i "$I/impactWood_light_002.ogg" \
  -filter_complex "[1]adelay=110:all=1[b];[0][b]amix=inputs=2:duration=longest:normalize=0,volume=0.7" "${encode[@]}" "$OUT/castle.mp3"
# A check: the knock with a short glass ping over it.
mk -i "$I/impactWood_medium_000.ogg" -i "$U/glass_002.ogg" \
  -filter_complex "[1]volume=0.45[b];[0][b]amix=inputs=2:duration=longest:normalize=0,volume=0.6" "${encode[@]}" "$OUT/check.mp3"
# A promotion: the knock, then a rising chime.
mk -i "$I/impactWood_medium_000.ogg" -i "$U/confirmation_003.ogg" \
  -filter_complex "[1]volume=0.4,adelay=60:all=1[b];[0][b]amix=inputs=2:duration=longest:normalize=0,volume=0.7" "${encode[@]}" "$OUT/promote.mp3"
# The game's end: the knock, then a longer chime.
mk -i "$I/impactWood_heavy_000.ogg" -i "$U/confirmation_004.ogg" \
  -filter_complex "[1]volume=0.4,adelay=120:all=1[b];[0][b]amix=inputs=2:duration=longest:normalize=0,volume=0.7" "${encode[@]}" "$OUT/game-end.mp3"

ls -l "$OUT"/*.mp3
