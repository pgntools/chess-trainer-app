import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useTranslation } from "react-i18next";

import { FeedbackStrip } from "../../design-system/components/feedback";
import { IconAction } from "../../design-system/components/toolbars";
import { MONOSPACE_FONT_FAMILY } from "../../design-system/theme";
import type { CommentKind } from "../../lib/gameTree";
import {
  isMoveMark,
  nagGlyph,
  type PositionAnnotations,
  type ReadComment,
} from "../../lib/moveAnnotations";

/**
 * **What the PGN says here** (CTA-69; was `RepertoireAnnotationsBar` until
 * CTA-72) — the variations explorer's comment block, which the repertoire
 * player shows above its footer, where the changes strip sits, while the
 * position on screen carries an annotation: the move with its marks, the
 * comment opening its variation, the comments after it, and the attributes
 * read out of them (an engine's eval and depth, a `[%clk]`, …) as
 * `key value` chips.
 *
 * Presentational: `annotationsAt` (`lib/moveAnnotations.ts`) decides what is
 * there and the explorer renders nothing when there is nothing. The block
 * scrolls itself past a few lines, so a long note does not push the board
 * controls off the panel — the footer is fixed, not the scrolling region.
 *
 * A comment is prose in whatever language it was written in, so each
 * paragraph takes `dir="auto"`; an attribute's value is pinned LTR by the
 * attribute (a signed score in an RTL flow has its sign migrate), never CSS —
 * the root `CLAUDE.md`'s rule.
 *
 * A `FeedbackStrip` in the `info` tone since CTA-113 (the changes strip is its
 * `success` sibling), its controls `IconAction`s.
 *
 * **Editing is opt-in** (`editing`): an add button beside the title, and an
 * edit and a delete on every comment. The block only says which comment —
 * its kind and its index in that list — and the explorer turns that into a
 * tree edit (`setComments`), a session change like any other.
 */
function AnnotationsBar({
  testId,
  label,
  annotations,
  editing,
}: {
  testId: string;
  /** Where the reader is — the move as the list prints it, or the start. */
  label: string;
  annotations: PositionAnnotations;
  editing?: CommentEditing;
}) {
  const { t } = useTranslation();
  const marks = annotations.nags.filter(isMoveMark).map(nagGlyph).join("");
  const assessments = annotations.nags.filter((nag) => !isMoveMark(nag));

  return (
    <Box sx={{ mb: 1 }}>
      <FeedbackStrip
        tone="info"
        maxHeight={180}
        ariaLabel={t("annotations.title")}
        testId={testId}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {t("annotations.title")}
          <Typography
            component="span"
            variant="body2"
            dir="ltr"
            data-testid={`${testId}-move`}
            sx={{
              color: "text.secondary",
              fontWeight: 400,
              marginInlineStart: 1,
              unicodeBidi: "isolate",
              fontFamily: MONOSPACE_FONT_FAMILY,
            }}
          >
            {`${label}${marks}`}
          </Typography>
          {assessments.map((nag) => (
            <Typography
              key={nag}
              component="span"
              variant="body2"
              data-testid={`${testId}-nag-${nag}`}
              sx={{ marginInlineStart: 0.75 }}
            >
              {nagGlyph(nag)}
            </Typography>
          ))}
          {editing !== undefined && (
            <Box
              component="span"
              sx={{ marginInlineStart: "auto", display: "inline-flex" }}
            >
              <IconAction
                label={t("annotations.add")}
                onClick={editing.onAdd}
                testId={`${testId}-add`}
              >
                <AddCommentOutlinedIcon fontSize="small" />
              </IconAction>
            </Box>
          )}
        </Typography>

        {annotations.before.some(readable) && (
          <Box data-testid={`${testId}-before`} sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {t("annotations.before")}
            </Typography>
            {annotations.before.map((comment, index) => (
              <Comment
                key={index}
                comment={comment}
                testId={`${testId}-before-${index}`}
                italic
                onEdit={editing && (() => editing.onEdit("preComments", index))}
                onDelete={
                  editing && (() => editing.onDelete("preComments", index))
                }
              />
            ))}
          </Box>
        )}
        {annotations.after.map((comment, index) => (
          <Comment
            key={index}
            comment={comment}
            testId={`${testId}-after-${index}`}
            onEdit={editing && (() => editing.onEdit("comments", index))}
            onDelete={editing && (() => editing.onDelete("comments", index))}
          />
        ))}
      </FeedbackStrip>
    </Box>
  );
}

/** What the screen does with the block's edit controls — `useVariationsExplorer` builds it. */
export type CommentEditing = {
  onAdd: () => void;
  /** `index` is the comment's place in its `kind` list at this position. */
  onEdit: (kind: CommentKind, index: number) => void;
  onDelete: (kind: CommentKind, index: number) => void;
};

/** Whether a comment has anything to read — words or an attribute. */
const readable = (comment: ReadComment): boolean =>
  comment.paragraphs.length > 0 || comment.attributes.length > 0;

/**
 * One comment: its paragraphs, then its attributes as chips. One with
 * neither — a comment that only draws shapes, which the board shows
 * (CTA-143) — renders nothing, so the block does not list an empty row.
 */
function Comment({
  comment,
  testId,
  italic = false,
  onEdit,
  onDelete,
}: {
  comment: ReadComment;
  testId: string;
  italic?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  if (!readable(comment)) return null;
  return (
    <Box
      data-testid={testId}
      sx={{ mt: 0.5, display: "flex", alignItems: "flex-start", gap: 0.5 }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {comment.paragraphs.map((paragraph, index) => (
          <Typography
            key={index}
            variant="body2"
            dir="auto"
            sx={{
              fontStyle: italic ? "italic" : undefined,
              "& + &": { mt: 0.5 },
            }}
          >
            {paragraph}
          </Typography>
        ))}
        {comment.attributes.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
            {comment.attributes.map(({ key, value }, index) => (
              <Chip
                key={index}
                size="small"
                variant="outlined"
                data-testid={`${testId}-attr-${key}`}
                label={
                  <>
                    {t(`annotations.keys.${key}`, { defaultValue: key })}{" "}
                    <Box component="bdi" dir="ltr" sx={{ fontWeight: 600 }}>
                      {value}
                    </Box>
                  </>
                }
              />
            ))}
          </Box>
        )}
      </Box>
      {onEdit !== undefined && onDelete !== undefined && (
        <Box sx={{ display: "flex", flexShrink: 0 }}>
          <IconAction
            label={t("annotations.edit")}
            onClick={onEdit}
            testId={`${testId}-edit`}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconAction>
          <IconAction
            label={t("annotations.delete")}
            onClick={onDelete}
            testId={`${testId}-delete`}
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconAction>
        </Box>
      )}
    </Box>
  );
}

export default AnnotationsBar;
