import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { useTranslation } from "react-i18next";

import { CopyField, FieldLabel, SwitchField } from "../../../design-system/components/forms";
import { treeToPgn, type GameTree, type PgnExportOptions } from "../../../lib/gameTree";

export type PgnExportPanelProps = {
  /** The position on screen. */
  fen: string;
  /** The whole game, side lines and all. */
  tree: GameTree;
  /** Download the PGN as it stands with the options chosen — the screen names the file. */
  onDownload: (pgn: string) => void;
  /**
   * The prefix of every id: the panel `<testId>-export`, the fields
   * `<testId>-export-fen` and `-pgn`, the switches `-comments`, `-nags`,
   * `-variations`, the button `-download`.
   */
  testId: string;
};

const OPTIONS = ["comments", "nags", "variations"] as const;

/**
 * **The Export tab of a board** (CTA-113; `AnalysisExport` since CTA-73) —
 * the position on screen as FEN and the game as PGN, each a `CopyField`,
 * with what the PGN keeps chosen here: comments, move marks, side lines
 * (`treeToPgn`'s `PgnExportOptions`, all on — the tree as it is), and a
 * download. The options are the tab's own state: an export is a one-off,
 * not a setting of the game. The Analysis Board's, the Library game board's
 * and the Openings explorer's tab.
 *
 * Presentational: the FEN and the tree arrive, the download leaves as a
 * callback. Its words are the analysis panel's (`analysis.export.*`).
 */
function PgnExportPanel({ fen, tree, onDownload, testId }: PgnExportPanelProps) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<Required<PgnExportOptions>>({ comments: true, nags: true, variations: true });
  const pgn = useMemo(() => treeToPgn(tree, options), [tree, options]);
  const copy = { copyLabel: t("copyable.copy"), copiedLabel: t("copyable.copied"), failedLabel: t("copyable.copyFailed") };

  return (
    <Box data-testid={`${testId}-export`} sx={{ display: "flex", flexDirection: "column", gap: 2, p: 1 }}>
      <CopyField label={t("analysis.position.currentFen")} value={fen} {...copy} testId={`${testId}-export-fen`} />
      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
        <FieldLabel component="legend">{t("analysis.export.include")}</FieldLabel>
        {OPTIONS.map((key) => (
          <SwitchField
            key={key}
            size="small"
            label={t(`analysis.export.${key}`)}
            checked={options[key]}
            onChange={(checked) => setOptions((current) => ({ ...current, [key]: checked }))}
            // The boards' tests reach the input inside the switch.
            testIdOn="control"
            testId={`${testId}-export-${key}`}
          />
        ))}
      </Box>
      <CopyField label={t("analysis.position.currentPgn")} value={pgn} {...copy} testId={`${testId}-export-pgn`} />
      <Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadRoundedIcon fontSize="small" />}
          onClick={() => onDownload(pgn)}
          data-testid={`${testId}-export-download`}
        >
          {t("analysis.export.download")}
        </Button>
      </Box>
    </Box>
  );
}

export default PgnExportPanel;
