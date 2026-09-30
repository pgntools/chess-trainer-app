import { useMemo, useState } from "react";
import { createSearchParams, Navigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { MaskEditor } from "../../../blocks/forms";
import { MASK_PRESETS, type PieceMask } from "../../../lib/pieceMask";
import type { PlayedGameMask } from "../../../lib/playedGames";
import PlayScreen, { type PlayScreenMasking } from "../play/PlayScreen";
import { PlayedGameRead } from "../play/PlayedGameRead";
import { arrivalOf } from "../play/usePlayGame";

/**
 * **Masked Pieces** (`/engine/masked`, v2 since CTA-79) — Play with Engine
 * with the pieces the reader chooses drawn as other pieces, while the game
 * underneath stays ordinary legal chess. The exercise is specified in
 * `docs/chess_piece_masking_technique.docx.md`; the screen's own reference is
 * [`.claude/rules/masked-pieces.md`](../../../../.claude/rules/masked-pieces.md).
 *
 * **It is Play with Engine's screen** (`PlayScreen.tsx`) — the same session
 * (`usePlayGame`), header, tabs, explorer and store, with no mode flag — plus
 * a costume, which is this file's whole state:
 *
 * - **the mask** (`lib/pieceMask.ts`), keyed on the piece *type*, opening on
 *   the doc's canonical exercise (§4) — every queen, rook, bishop and knight
 *   drawn as a pawn — so the screen never opens looking like `/engine/play`;
 * - **the notation switch** (on) — whether the explorer, the pinned lines and
 *   every other place a move is printed write coordinates for a hidden piece;
 * - **the engine lines switch** (off) — whether the pinned best-variations
 *   block shows at all: an engine line is a list of the pieces the mask
 *   hides, so it waits to be asked for. The eval bar and the engine switch
 *   behave as on Play with Engine.
 *
 * All three are edited in a fourth tab, **Masking** — the `MaskEditor` block
 * (`blocks/forms/`, CTA-109). The first two ride on the
 * saved game's record (`PlayedGameMask`), so Continue in Saved games reopens
 * the game here in the same disguise; the lines switch is the session's.
 *
 * A `?saved=` naming an **unmasked** game goes to `/engine/play`, where it was
 * begun — the counterpart of the redirect there — rather than acquiring a
 * costume it never had. A `?saved=` arrival waits for the played games'
 * first read (IndexedDB — `PlayedGameRead`) before the arrival is read.
 */
function MaskedPlay() {
  return (
    <PlayedGameRead testId="masked-play">
      <MaskedPlayArrival />
    </PlayedGameRead>
  );
}

function MaskedPlayArrival() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [arrival] = useState(() => arrivalOf(searchParams));

  const [mask, setMask] = useState<PieceMask>(
    () => arrival.resume?.mask?.pieces ?? MASK_PRESETS.nonPawns,
  );
  const [notation, setNotation] = useState(() => arrival.resume?.mask?.notation ?? true);
  const [showLines, setShowLines] = useState(false);

  // One object per change, so the session's record memo and the screen's
  // renderers follow the costume and nothing else.
  const costume = useMemo<PlayedGameMask>(() => ({ pieces: mask, notation }), [mask, notation]);

  if (arrival.resume !== undefined && arrival.resume.mask === undefined) {
    return (
      <Navigate
        to={`/engine/play?${createSearchParams({ saved: arrival.resume.id })}`}
        replace
      />
    );
  }

  const masking: PlayScreenMasking = {
    costume,
    showLines,
    tab: {
      id: "masking",
      label: t("masking.tab"),
      content: (
        <MaskEditor
          mask={mask}
          onMaskChange={setMask}
          notation={notation}
          onNotationChange={setNotation}
          showLines={showLines}
          onShowLinesChange={setShowLines}
          testId="mask"
        />
      ),
    },
  };

  return <PlayScreen id="masked-play" arrival={arrival} masking={masking} />;
}

export default MaskedPlay;
