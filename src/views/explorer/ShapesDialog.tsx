import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogContentText from "@mui/material/DialogContentText";
import Typography from "@mui/material/Typography";
import CircleIcon from "@mui/icons-material/Circle";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import NorthEastRoundedIcon from "@mui/icons-material/NorthEastRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import type { Square } from "chess.js";
import { useTranslation } from "react-i18next";

import { BaseDialog } from "../../design-system/components/dialogs";
import { SelectField, TextInputField } from "../../design-system/components/forms";
import { IconAction } from "../../design-system/components/toolbars";
import { MONOSPACE_FONT_FAMILY, useChessTokens } from "../../design-system/theme";
import {
  clearShapes,
  shapesOf,
  toggleShape,
  type DrawnShape,
  type ShapeBrush,
} from "../../lib/boardShapes";
import { findNode, setComments, type GameTree } from "../../lib/gameTree";

/** The move the dialog is open on, and how the menu prints it. */
export type ShapesTarget = { nodeId: string; label: string };

const BRUSHES: readonly ShapeBrush[] = ["green", "red", "yellow", "blue"];
const SQUARE = /^[a-h][1-8]$/;

/**
 * **A move's arrows and circles** (CTA-143) — the move menu's *Arrows and
 * circles…*: the `[%cal]` arrows and `[%csl]` circles its comment draws
 * (`shapesOf`), each recoloured in one of lichess's four brushes or removed,
 * a new one added by its squares, and *Remove all*. What the reader draws on
 * the board is the same thing, managed from the move it belongs to.
 *
 * It holds no draft, as `NagDialog` holds none: **each change is an edit** —
 * `toggleShape` / `clearShapes` on the move's comments through `setComments`,
 * handed straight to `onEditTree` — so the board behind it redraws at once
 * and the Save strip offers to keep it. What it lists is read off the tree it
 * is given on each render.
 *
 * Squares and the move are notation and keep `dir="ltr"`; the rest is chrome
 * and mirrors.
 */
function ShapesDialog({
  tree,
  target,
  onClose,
  onEditTree,
}: {
  tree: GameTree;
  target: ShapesTarget | null;
  onClose: () => void;
  onEditTree: (next: GameTree) => void;
}) {
  if (target === null) return null;
  return <OpenShapesDialog tree={tree} target={target} onClose={onClose} onEditTree={onEditTree} />;
}

function OpenShapesDialog({
  tree,
  target,
  onClose,
  onEditTree,
}: {
  tree: GameTree;
  target: ShapesTarget;
  onClose: () => void;
  onEditTree: (next: GameTree) => void;
}) {
  const { t } = useTranslation();
  const { drawing } = useChessTokens();
  // A move the tree no longer holds (an edit landed elsewhere) offers nothing to change.
  const node = findNode(tree, target.nodeId);
  const comments = node?.comments ?? [];
  const shapes = shapesOf(comments);
  const rows: DrawnShape[] = [
    ...shapes.arrows,
    ...shapes.circles.map(({ brush, square }) => ({ brush, from: square, to: square })),
  ];

  const write = (next: (list: readonly string[]) => string[]) => {
    if (node === null) return;
    const edited = setComments(tree, node.id, "comments", next(comments));
    if (edited !== tree) onEditTree(edited);
  };

  const squaresOf = ({ from, to }: DrawnShape) => (from === to ? from : `${from} → ${to}`);
  const nameOf = (shape: DrawnShape) =>
    `${t(shape.from === shape.to ? "shapesDialog.circle" : "shapesDialog.arrow")} ${squaresOf(shape)}`;

  // The new shape's form.
  const [kind, setKind] = useState<"arrow" | "circle">("arrow");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [brush, setBrush] = useState<ShapeBrush>("green");
  const fromSquare = from.trim().toLowerCase();
  const toSquare = kind === "circle" ? fromSquare : to.trim().toLowerCase();
  const fromValid = SQUARE.test(fromSquare);
  const toValid = SQUARE.test(toSquare) && (kind === "circle" || toSquare !== fromSquare);
  const exists = rows.some(
    (row) => row.brush === brush && row.from === fromSquare && row.to === toSquare,
  );
  const canAdd = node !== null && fromValid && toValid && !exists;

  const brushes = (current: ShapeBrush, onPick: (next: ShapeBrush) => void, label: (next: ShapeBrush) => string, testId: string) => (
    <Box role="group" aria-label={t("shapesDialog.brush")} sx={{ display: "inline-flex" }}>
      {BRUSHES.map((option) => (
        <IconAction
          key={option}
          label={label(option)}
          pressed={option === current}
          disabled={node === null}
          onClick={() => onPick(option)}
          testId={`${testId}-${option}`}
        >
          <CircleIcon
            fontSize="small"
            sx={{
              color: drawing[option],
              outline: option === current ? "2px solid currentColor" : undefined,
              outlineOffset: 1,
              borderRadius: "50%",
            }}
          />
        </IconAction>
      ))}
    </Box>
  );

  return (
    <BaseDialog
      open
      onClose={onClose}
      width="sm"
      title={
        <>
          {t("shapesDialog.title")}{" "}
          <span dir="ltr" data-testid="shapes-dialog-move" style={{ unicodeBidi: "isolate" }}>
            {target.label}
          </span>
        </>
      }
      actions={
        <>
          <Button
            color="error"
            disabled={rows.length === 0}
            onClick={() => write(clearShapes)}
            data-testid="shapes-dialog-remove-all"
          >
            {t("shapesDialog.removeAll")}
          </Button>
          <Button data-testid="shapes-dialog-close" onClick={onClose}>
            {t("shapesDialog.close")}
          </Button>
        </>
      }
      testId="shapes-dialog"
    >
      <DialogContentText variant="body2" sx={{ mb: 1.5 }}>
        {t("shapesDialog.help")}
      </DialogContentText>

      <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
        {t("shapesDialog.list")}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }} data-testid="shapes-dialog-empty">
          {t("shapesDialog.empty")}
        </Typography>
      ) : (
        <Box component="ul" data-testid="shapes-dialog-list" sx={{ listStyle: "none", p: 0, m: 0, mb: 2 }}>
          {rows.map((shape) => {
            const key = `${shape.brush}-${shape.from}-${shape.to}`;
            const name = nameOf(shape);
            return (
              <Box
                component="li"
                key={key}
                data-testid={`shapes-dialog-row-${shape.from}${shape.from === shape.to ? "" : shape.to}`}
                sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", py: 0.25 }}
              >
                {shape.from === shape.to ? (
                  <RadioButtonUncheckedRoundedIcon fontSize="small" sx={{ color: drawing[shape.brush] }} aria-hidden />
                ) : (
                  <NorthEastRoundedIcon fontSize="small" sx={{ color: drawing[shape.brush] }} aria-hidden />
                )}
                <Typography variant="body2" sx={{ flexGrow: 1, minWidth: "8rem" }}>
                  {t(shape.from === shape.to ? "shapesDialog.circle" : "shapesDialog.arrow")}{" "}
                  <Box component="span" dir="ltr" sx={{ fontFamily: MONOSPACE_FONT_FAMILY, unicodeBidi: "isolate" }}>
                    {squaresOf(shape)}
                  </Box>
                </Typography>
                {brushes(
                  shape.brush,
                  (next) => {
                    if (next !== shape.brush) write((list) => toggleShape(list, { ...shape, brush: next }));
                  },
                  (next) => t("shapesDialog.recolour", { shape: name, brush: t(`shapesDialog.brushes.${next}`) }),
                  `shapes-dialog-row-${shape.from}${shape.from === shape.to ? "" : shape.to}-brush`,
                )}
                <IconAction
                  label={t("shapesDialog.remove", { shape: name })}
                  disabled={node === null}
                  onClick={() => write((list) => toggleShape(list, shape))}
                  testId={`shapes-dialog-row-${shape.from}${shape.from === shape.to ? "" : shape.to}-remove`}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconAction>
              </Box>
            );
          })}
        </Box>
      )}

      <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
        {t("shapesDialog.add")}
      </Typography>
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canAdd) return;
          write((list) => toggleShape(list, { brush, from: fromSquare as Square, to: toSquare as Square }));
          setFrom("");
          setTo("");
        }}
        sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}
      >
        <Box sx={{ width: "9rem" }}>
          <SelectField
            label={t("shapesDialog.kind")}
            value={kind}
            onChange={(value) => setKind(value === "circle" ? "circle" : "arrow")}
            options={[
              { value: "arrow", label: t("shapesDialog.arrow") },
              { value: "circle", label: t("shapesDialog.circle") },
            ]}
            fullWidth
            testId="shapes-dialog-kind"
          />
        </Box>
        <Box sx={{ width: "6rem" }}>
          <TextInputField
            label={kind === "circle" ? t("shapesDialog.at") : t("shapesDialog.from")}
            value={from}
            onChange={setFrom}
            dir="ltr"
            placeholder="e2"
            error={from !== "" && !fromValid}
            helperText={from !== "" && !fromValid ? t("shapesDialog.square") : undefined}
            testId="shapes-dialog-from"
          />
        </Box>
        {kind === "arrow" && (
          <Box sx={{ width: "6rem" }}>
            <TextInputField
              label={t("shapesDialog.to")}
              value={to}
              onChange={setTo}
              dir="ltr"
              placeholder="e4"
              error={to !== "" && !toValid}
              helperText={to !== "" && !toValid ? t("shapesDialog.square") : undefined}
              testId="shapes-dialog-to"
            />
          </Box>
        )}
        <Box sx={{ alignSelf: "center" }}>
          {brushes(brush, setBrush, (next) => t(`shapesDialog.brushes.${next}`), "shapes-dialog-new-brush")}
        </Box>
        <Box sx={{ alignSelf: "center" }}>
          <Button type="submit" variant="outlined" disabled={!canAdd} data-testid="shapes-dialog-add">
            {t("shapesDialog.add")}
          </Button>
        </Box>
      </Box>
      {exists && fromValid && toValid && (
        <Typography variant="caption" role="status" sx={{ color: "text.secondary" }} data-testid="shapes-dialog-exists">
          {t("shapesDialog.exists")}
        </Typography>
      )}
    </BaseDialog>
  );
}

export default ShapesDialog;
