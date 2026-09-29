import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import SportsEsportsOutlinedIcon from "@mui/icons-material/SportsEsportsOutlined";

import { FieldLabel } from "../../../design-system/components/forms";
import { PickerList } from "../../../design-system/components/lists";
import { UploadPanel, type UploadPanelTestIds, type UploadProblem } from "../../../design-system/patterns/forms";
import { gameTag } from "../../../lib/gameModel";
import type { GameTree } from "../../../lib/gameTree";
import { PGN_ACCEPT, PGN_OR_ZIP_ACCEPT } from "./pgnAccept";

/** Every word the block shows — the screen's `t(…)`s. */
export type PgnInputLabels = {
  /** The file button ("Choose a .pgn file"); absent, no file button. */
  file?: string;
  /** Beside the file button ("…or drop one anywhere on the editor"). */
  fileHint?: ReactNode;
  /** The paste box. */
  paste: string;
  /** Under the paste box. */
  pasteHelp?: ReactNode;
  /** The paste's submit ("Load"). */
  submit: string;
  /** The games picker, when a file of several is loaded: its heading, "vs", and a game with no players ("Game {n}"). */
  games?: { title: string; versus: string; fallback: (index: number) => string };
};

export type PgnInputProps = {
  labels: PgnInputLabels;
  /** Files picked — the screen reads their text. Absent, no file button (the host has one elsewhere). */
  onFiles?: (files: File[]) => void;
  /** Offer a zip of PGNs too (the Library's upload). */
  zip?: boolean;
  multiple?: boolean;
  pasted: string;
  onPastedChange: (text: string) => void;
  /** Read the pasted text. */
  onSubmit: () => void;
  submitVariant?: "contained" | "outlined";
  fileVariant?: "contained" | "outlined";
  disabled?: boolean;
  /** Reading — the line beside the submit. */
  busy?: ReactNode;
  problem?: UploadProblem | null;
  /**
   * A file of several games (the position editor's PGN tab): the games to
   * pick from, the one picked, the pick. Fewer than two — no picker.
   */
  games?: readonly GameTree[];
  selectedGame?: number;
  onSelectGame?: (index: number) => void;
  /** The root; the parts are `UploadPanel`'s (`-pick`, `-input`, `-paste`, `-submit`, `-busy`, `-problem`) and `-games`, each overridable through `testIds`. */
  testId: string;
  testIds?: UploadPanelTestIds & { games?: string };
};

/** A game's players ("Carlsen vs Nakamura"), or its number. */
const titleOf = (game: GameTree, index: number, labels: NonNullable<PgnInputLabels["games"]>) => {
  const white = gameTag(game.headers, "White");
  const black = gameTag(game.headers, "Black");
  return white || black ? `${white ?? "?"} ${labels.versus} ${black ?? "?"}` : labels.fallback(index);
};

/** A game's event, date and result, where it has them. */
const factsOf = (game: GameTree) =>
  (["Event", "Date", "Result"] as const)
    .map((key) => gameTag(game.headers, key))
    .filter((value): value is string => value !== undefined)
    .join(" · ");

/**
 * **A PGN in, by file or by paste** (CTA-113) — the `UploadPanel` pattern over
 * a PGN: the file types a PGN comes as (a zip of them for the Library's
 * upload), a paste box that reads left to right, and — for the position
 * editor, which takes one game's final position — a picker over the games of
 * a file of several, each named by its players and its event, date and
 * result. The Analysis Board's Load tab, the repertoire upload, the Library's
 * upload, the analyses' new-analysis form and the position editor's PGN tab
 * each wrote one.
 *
 * Presentational: reading the file and the text is the screen's; the words
 * are props (several modules use it).
 */
function PgnInput({
  labels,
  onFiles,
  zip = false,
  multiple = false,
  pasted,
  onPastedChange,
  onSubmit,
  submitVariant,
  fileVariant,
  disabled,
  busy,
  problem,
  games = [],
  selectedGame,
  onSelectGame,
  testId,
  testIds = {},
}: PgnInputProps) {
  const gameLabels = labels.games;
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <UploadPanel
        fileLabel={labels.file}
        accept={zip ? PGN_OR_ZIP_ACCEPT : PGN_ACCEPT}
        onFiles={onFiles}
        multiple={multiple}
        fileHint={labels.fileHint}
        pasteLabel={labels.paste}
        pasteValue={pasted}
        onPasteChange={onPastedChange}
        pasteHelp={labels.pasteHelp}
        onSubmit={onSubmit}
        submitLabel={labels.submit}
        submitVariant={submitVariant}
        fileVariant={fileVariant}
        disabled={disabled}
        busy={busy}
        problem={problem}
        testId={testId}
        testIds={testIds}
      />
      {games.length > 1 && gameLabels !== undefined && onSelectGame !== undefined && (
        <Box>
          <FieldLabel component="span">{gameLabels.title}</FieldLabel>
          <PickerList
            ariaLabel={gameLabels.title}
            value={selectedGame === undefined ? undefined : String(selectedGame)}
            onChange={(id) => {
              if (id !== null) onSelectGame(Number(id));
            }}
            items={games.map((game, index) => {
              const facts = factsOf(game);
              return {
                // Games in a file have no id of their own; the index is stable while this list is.
                id: String(index),
                label: (
                  <>
                    <span>{titleOf(game, index, gameLabels)}</span>
                    {facts !== "" && <span>{` — ${facts}`}</span>}
                  </>
                ),
                icon: <SportsEsportsOutlinedIcon fontSize="small" />,
              };
            })}
            maxHeight={280}
            testId={testIds.games ?? `${testId}-games`}
          />
        </Box>
      )}
    </Box>
  );
}

export default PgnInput;
