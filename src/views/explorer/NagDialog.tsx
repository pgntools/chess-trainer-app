import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogContentText from "@mui/material/DialogContentText";
// eslint-disable-next-line no-restricted-imports -- migration.md §4.4: the glyph toggles are a move-annotation grid with no generic job
import ToggleButton from "@mui/material/ToggleButton";
import { useTranslation } from "react-i18next";

import { BaseDialog } from "../../design-system/components/dialogs";
import { PanelTabs, tabPanelProps } from "../../design-system/components/tabs";
import { MONOSPACE_FONT_FAMILY } from "../../design-system/theme";
import { findNode, setNags, type GameTree } from "../../lib/gameTree";
import {
  NAG_SECTIONS,
  isNagChoiceActive,
  toggleNag,
  type NagSection,
} from "../../lib/moveAnnotations";
import NagGlyphs from "../shared/NagGlyphs";

/** The move the dialog is open on, and how the menu prints it. */
export type NagTarget = { nodeId: string; label: string };

/**
 * **Annotate a move** (CTA-97) — the move menu's *Add annotation…*: the NAG
 * glyphs in three tabs, one per section of `lib/moveAnnotations.ts`'s table,
 * each glyph a toggle with its meaning.
 *
 * It holds no draft: **each toggle is an edit**, `setNags` under the section's
 * selection rule (`toggleNag` — lichess's: one move assessment, one
 * evaluation, any number of features), handed straight to `onEditTree` like
 * every other edit, so the list behind the dialog shows the glyph at once and
 * the Save strip offers to keep it. What is selected is read off the tree it
 * is given on each render, which is the tree after the last toggle.
 *
 * The move and its glyphs are notation and keep `dir="ltr"`; the meanings are
 * chrome and mirror. A `BaseDialog` with a tall `PanelTabs` since CTA-113,
 * each tab naming its panel.
 */
function NagDialog({
  tree,
  target,
  onClose,
  onEditTree,
}: {
  tree: GameTree;
  target: NagTarget | null;
  onClose: () => void;
  onEditTree: (next: GameTree) => void;
}) {
  if (target === null) return null;
  return (
    <OpenNagDialog tree={tree} target={target} onClose={onClose} onEditTree={onEditTree} />
  );
}

function OpenNagDialog({
  tree,
  target,
  onClose,
  onEditTree,
}: {
  tree: GameTree;
  target: NagTarget;
  onClose: () => void;
  onEditTree: (next: GameTree) => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<NagSection>("move");
  // A move the tree no longer holds (an edit landed elsewhere) closes nothing,
  // but offers nothing to toggle either.
  const node = findNode(tree, target.nodeId);
  const nags = node?.nags ?? [];
  const section = NAG_SECTIONS.find((entry) => entry.section === tab) ?? NAG_SECTIONS[0];

  return (
    <BaseDialog
      open
      onClose={onClose}
      width="sm"
      title={
        <>
          {t("nagDialog.title")}{" "}
          <span dir="ltr" data-testid="nag-dialog-move" style={{ unicodeBidi: "isolate" }}>
            {target.label}
            <NagGlyphs nags={node?.nags} testId="nag-dialog-glyphs" />
          </span>
        </>
      }
      actions={
        <Button data-testid="nag-dialog-close" onClick={onClose}>
          {t("nagDialog.close")}
        </Button>
      }
      testId="nag-dialog"
    >
      <PanelTabs
        tabs={NAG_SECTIONS.map(({ section: id }) => ({ id, label: t(`nagDialog.tabs.${id}`) }))}
        value={tab}
        onChange={(value) => setTab(value as NagSection)}
        size="tall"
        ariaLabel={t("nagDialog.title")}
        idPrefix="nag-dialog"
        tabTestIdPrefix="nag-dialog"
        testId="nag-dialog-tabs"
      />
      <Box {...tabPanelProps("nag-dialog", section.section)} sx={{ pt: 1.5 }}>
        <DialogContentText variant="body2" sx={{ mb: 1.5 }}>
          {t("nagDialog.help")}
        </DialogContentText>
        <Box
          role="group"
          aria-label={t(`nagDialog.tabs.${section.section}`)}
          data-testid={`nag-dialog-panel-${section.section}`}
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(13rem, 1fr))",
            gap: 1,
          }}
        >
          {section.choices.map((choice) => (
            <ToggleButton
              key={choice.id}
              value={choice.id}
              size="small"
              color="primary"
              disabled={node === null}
              selected={isNagChoiceActive(nags, choice)}
              data-testid={`nag-dialog-choice-${choice.codes[0]}`}
              onChange={() => {
                if (node === null) return;
                const next = setNags(tree, node.id, toggleNag(nags, section.section, choice));
                if (next !== tree) onEditTree(next);
              }}
              sx={{ justifyContent: "flex-start", gap: 1.5, textTransform: "none" }}
            >
              <Box
                component="span"
                dir="ltr"
                sx={{ minWidth: "2ch", fontFamily: MONOSPACE_FONT_FAMILY, fontWeight: 700, unicodeBidi: "isolate" }}
              >
                {choice.glyph}
              </Box>
              <Box component="span" sx={{ textAlign: "start" }}>
                {t(`nagDialog.meaning.${choice.id}`)}
              </Box>
            </ToggleButton>
          ))}
        </Box>
      </Box>
    </BaseDialog>
  );
}

export default NagDialog;
