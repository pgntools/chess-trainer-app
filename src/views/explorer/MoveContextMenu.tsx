import { useState } from "react";
import DialogContentText from "@mui/material/DialogContentText";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import CasinoOutlinedIcon from "@mui/icons-material/CasinoOutlined";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import GestureRoundedIcon from "@mui/icons-material/GestureRounded";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import VerticalAlignTopRoundedIcon from "@mui/icons-material/VerticalAlignTopRounded";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "../../design-system/components/dialogs";
import { useSnackbar } from "../../design-system/components/feedback";
import { ContextMenu, type MenuEntry } from "../../design-system/components/menus";
import {
  commentsAt,
  deleteFrom,
  findNode,
  isInSideLine,
  linePgn,
  makeMainline,
  pathTo,
  plyLabel,
  promoteVariation,
  setComments,
  subtreeCounts,
  type GameTree,
} from "../../lib/gameTree";
import { maskNodeSan, type PieceMask } from "../../lib/pieceMask";
import CommentDialog, { type CommentDraft } from "./CommentDialog";
import NagDialog, { type NagTarget } from "./NagDialog";
import PlayChanceDialog, { type PlayChanceTarget } from "./PlayChanceDialog";
import ShapesDialog, { type ShapesTarget } from "./ShapesDialog";
import type { MenuAnchor } from "../shared/moveContextMenu";

/** The move a menu was opened on, and where. */
export type MoveMenuTarget = { nodeId: string; anchor: MenuAnchor };

/**
 * **The variations explorer's move menu** (CTA-64) — lichess's right-click on
 * a move of the analysis board: promote the variation, make it the main line,
 * delete from here, copy the line's PGN — and, since CTA-69, add a comment to
 * the move (`CommentDialog`; `setComments`, appended after the ones it has),
 * and, on a move with alternatives, set the **play chances** of the branch
 * it belongs to (`PlayChanceDialog`; lichess-tools' `prc:N`,
 * `lib/playChance.ts`) — and, since CTA-97, annotate it with NAG glyphs
 * (`NagDialog`; `setNags`) — and, since CTA-143, manage the arrows and circles
 * its comment draws (`ShapesDialog`; `toggleShape` / `clearShapes`).
 *
 * Opened by `TreeMoveList` when its consumer passes `onEditTree`, at the
 * pointer (`anchorReference="anchorPosition"`). Every edit is a pure tree
 * operation from `lib/gameTree.ts` handed back through `onEditTree` — this
 * component never holds a tree of its own, so the edit lands where every other
 * change to the game lands (the core's `replaceTree`). Promote and Make main
 * line are offered only inside a side line, where they mean something.
 * Deleting asks first, saying how much goes; copying needs no confirmation and
 * reports whether the clipboard took it (the write needs a secure context and
 * the permission — `CopyField`'s rule) through the app's snackbar.
 *
 * Since CTA-113 the design system's: a `ContextMenu` at the pointer, the
 * delete a destructive `ConfirmDialog`, the copy's outcome `useSnackbar`.
 *
 * Chrome, so it mirrors under Hebrew like the rest of the panel; the move it
 * names is notation and keeps `dir="ltr"`.
 */
function MoveContextMenu({
  tree,
  target,
  open,
  onClose,
  onEditTree,
  playChances = true,
  mask,
}: {
  tree: GameTree;
  /** The last move a menu was opened on — kept while the menu fades out. */
  target: MoveMenuTarget | null;
  open: boolean;
  onClose: () => void;
  onEditTree: (next: GameTree) => void;
  /**
   * Offer *Play chances…* (on by default). A board nothing plays by chance on
   * — the Analysis Board (CTA-73) — turns it off.
   */
  playChances?: boolean;
  /** A masked board's costume (CTA-79): the move it names prints as coordinates when hidden. */
  mask?: PieceMask;
}) {
  const { t } = useTranslation();
  const { show } = useSnackbar();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [commenting, setCommenting] = useState<string | null>(null);
  const [chancesAt, setChancesAt] = useState<PlayChanceTarget | null>(null);
  const [annotating, setAnnotating] = useState<NagTarget | null>(null);
  const [drawingAt, setDrawingAt] = useState<ShapesTarget | null>(null);

  // A target the tree no longer holds (an edit landed first) opens nothing.
  const node = target === null ? null : findNode(tree, target.nodeId);
  const sideLine = node !== null && isInSideLine(tree, node.id);
  // The branch the move is one of — its parent's continuations, or the start's.
  const branchParent = node === null ? null : (pathTo(tree, node.id).at(-2) ?? null);
  const branchSize =
    node === null ? 0 : branchParent === null ? tree.moves.length : branchParent.children.length;
  const deletingNode = deleting === null ? null : findNode(tree, deleting);
  const counts = deletingNode === null ? null : subtreeCounts(tree, deletingNode.id);

  const moveText = (at: typeof node) => {
    if (at === null) return "";
    const { number, isWhiteMove } = plyLabel(tree.startFen, at.ply);
    return `${number}${isWhiteMove ? "." : "…"} ${maskNodeSan(mask, at)}`;
  };

  // Built on each render, so the save edits the tree as it is then.
  const commentingNode = commenting === null ? null : findNode(tree, commenting);
  const commentDraft: CommentDraft | null =
    commentingNode === null
      ? null
      : {
          label: moveText(commentingNode),
          initial: "",
          onSave: (text) => {
            const next = setComments(tree, commentingNode.id, "comments", [
              ...commentsAt(tree, commentingNode.id, "comments"),
              text,
            ]);
            if (next !== tree) onEditTree(next);
          },
        };

  const edit = (operation: (tree: GameTree, id: string) => GameTree) => {
    if (node === null) return;
    onClose();
    const next = operation(tree, node.id);
    if (next !== tree) onEditTree(next);
  };

  const copy = async () => {
    if (node === null) return;
    const pgn = linePgn(tree, node.id);
    onClose();
    let outcome: "copied" | "failed" = "copied";
    try {
      await navigator.clipboard.writeText(pgn);
    } catch {
      outcome = "failed";
    }
    show({
      message: t(`moveMenu.${outcome}`),
      severity: outcome === "failed" ? "warning" : undefined,
      duration: 3000,
      testId: "move-menu-copied",
    });
  };

  /** The entries, in lichess's order; Promote and Make main line only inside a side line. */
  const entries: MenuEntry[] = [
    ...(sideLine
      ? [
          { id: "promote", label: t("moveMenu.promote"), icon: <ArrowUpwardRoundedIcon fontSize="small" />, onClick: () => edit(promoteVariation) },
          { id: "mainline", label: t("moveMenu.makeMainline"), icon: <VerticalAlignTopRoundedIcon fontSize="small" />, onClick: () => edit(makeMainline) },
        ]
      : []),
    {
      id: "delete",
      label: t("moveMenu.deleteFrom"),
      icon: <DeleteOutlineRoundedIcon fontSize="small" />,
      onClick: () => {
        if (node !== null) setDeleting(node.id);
      },
    },
    {
      id: "comment",
      label: t("moveMenu.addComment"),
      icon: <AddCommentOutlinedIcon fontSize="small" />,
      onClick: () => {
        if (node !== null) setCommenting(node.id);
      },
    },
    {
      id: "annotate",
      label: t("moveMenu.addAnnotation"),
      icon: <PriorityHighRoundedIcon fontSize="small" />,
      onClick: () => {
        if (node !== null) setAnnotating({ nodeId: node.id, label: moveText(node) });
      },
    },
    {
      id: "shapes",
      label: t("moveMenu.shapes"),
      icon: <GestureRoundedIcon fontSize="small" />,
      onClick: () => {
        if (node !== null) setDrawingAt({ nodeId: node.id, label: moveText(node) });
      },
    },
    ...(playChances && branchSize > 1
      ? [
          {
            id: "chances",
            label: t("moveMenu.playChances"),
            icon: <CasinoOutlinedIcon fontSize="small" />,
            onClick: () => setChancesAt({ parentId: branchParent?.id ?? null }),
          },
        ]
      : []),
    { id: "copy", label: t("moveMenu.copyPgn"), icon: <ContentCopyRoundedIcon fontSize="small" />, onClick: () => void copy() },
  ];

  return (
    <>
      <ContextMenu
        position={target?.anchor ?? null}
        open={open && node !== null}
        onClose={onClose}
        subheader={
          <span dir="ltr" data-testid="move-menu-move">
            {moveText(node)}
          </span>
        }
        entries={entries}
        testId="move-menu"
      />

      <ConfirmDialog
        open={deletingNode !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deletingNode !== null) onEditTree(deleteFrom(tree, deletingNode.id));
          setDeleting(null);
        }}
        title={
          <>
            {t("moveMenu.deleteTitle")} <span dir="ltr">{moveText(deletingNode)}</span>
          </>
        }
        confirmLabel={t("moveMenu.delete")}
        cancelLabel={t("moveMenu.cancel")}
        tone="destructive"
        testId="move-menu-delete-dialog"
        cancelTestId="move-menu-delete-cancel"
        confirmTestId="move-menu-delete-confirm"
      >
        <DialogContentText data-testid="move-menu-delete-summary">
          {counts !== null &&
            t("moveMenu.deleteSummary", {
              moves: t("moveMenu.moves", { count: counts.moves }),
              lines: t("moveMenu.lines", { count: counts.lines }),
            })}
        </DialogContentText>
      </ConfirmDialog>

      <CommentDialog draft={commentDraft} onClose={() => setCommenting(null)} />
      <NagDialog
        tree={tree}
        target={annotating}
        onClose={() => setAnnotating(null)}
        onEditTree={onEditTree}
      />
      <ShapesDialog
        tree={tree}
        target={drawingAt}
        onClose={() => setDrawingAt(null)}
        onEditTree={onEditTree}
      />
      <PlayChanceDialog
        tree={tree}
        target={chancesAt}
        onClose={() => setChancesAt(null)}
        onEditTree={onEditTree}
      />

    </>
  );
}

export default MoveContextMenu;
