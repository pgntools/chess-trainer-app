import { useMemo } from "react";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { InlineAlert } from "../../../design-system/components/feedback";
import { demoTreeOfGameTree, startLineOf, type DemoNode } from "../../../lib/demoTree";
import { repertoireTreeOf } from "../../../lib/savedRepertoires";
import { useSavedRepertoires } from "../../repertoires/useSavedRepertoires";
import DemoBoard from "../../shared/DemoBoard";
import { isRepertoireSampleId, repertoireSample, type RepertoireSampleId } from "../repertoireSamples";
import { repertoirePathOf } from "./paths";

/**
 * **A repertoire on the front page** (CTA-126) —
 * `<RepertoireBoard _id="/repertoires/<id>" startMove="1" fallback="e4-white" />`
 * (the MDX name; the file is named apart from the repertoires' own
 * `RepertoireBoard` screen). The repertoire at that address, read from the
 * reader's store, on a board facing the side it is played from: each branch's
 * moves as play-chance arrows, the wider the likelier the trainer plays it,
 * with a link to open it.
 *
 * **Repertoires are the reader's own** — IndexedDB, one device; none ships
 * with the app. So on any other device the address names nothing, and the
 * board shows its `fallback`, a sample shipped with the app
 * (`../repertoireSamples.ts`), marked as one; with no fallback it says the
 * repertoire is not here.
 */

type RepertoireBoardEmbedProps = {
  /** The repertoire's address: `/repertoires/<id>`. */
  _id: string;
  /** Where the board opens — `"1"` (after White's 1st move), `"1..."` (after Black's), or a line of SAN. */
  startMove?: string;
  /** The sample shown when the repertoire is not on this device: `e4-white`, `caro-kann-black`. */
  fallback?: RepertoireSampleId;
  /** Draw the arrows to the next moves. Default on. */
  showNextMoveArrow?: boolean;
};

type Shown =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "saved"; id: string; name: string; root: DemoNode; startFen: string; color: "white" | "black" }
  | { kind: "sample"; sample: RepertoireSampleId; root: DemoNode; color: "white" | "black" };

export function RepertoireBoardEmbed({ _id, startMove, fallback, showNextMoveArrow }: RepertoireBoardEmbedProps) {
  const { t } = useTranslation();
  const repertoires = useSavedRepertoires();
  const id = repertoirePathOf(_id);
  const saved = id === undefined ? undefined : repertoires?.find((row) => row.id === id);
  const sample = isRepertoireSampleId(fallback) ? fallback : undefined;

  const shown = useMemo((): Shown => {
    const tree = saved === undefined ? undefined : repertoireTreeOf(saved);
    if (saved !== undefined && tree !== undefined) {
      return {
        kind: "saved",
        id: saved.id,
        name: saved.name.trim() || t("home.repertoire.untitled"),
        root: demoTreeOfGameTree(tree),
        startFen: tree.startFen,
        color: saved.settings.color,
      };
    }
    // Still reading the store — unless there is nothing to read for.
    if (repertoires === undefined && id !== undefined) return { kind: "loading" };
    if (sample !== undefined) return { kind: "sample", sample, ...repertoireSample(sample) };
    return { kind: "missing" };
  }, [saved, repertoires, id, sample, t]);

  const slug = (shown.kind === "sample" ? `sample-${shown.sample}` : id) ?? "repertoire";
  const testId = `home-repertoire-${slug}`;

  if (shown.kind === "loading") {
    return (
      <Typography role="status" data-testid={`${testId}-loading`} sx={{ color: "text.secondary" }}>
        {t("home.repertoire.loading")}
      </Typography>
    );
  }
  if (shown.kind === "missing") {
    return (
      <InlineAlert severity="info" testId={`${testId}-missing`} detail={_id}>
        {t("home.repertoire.missing")}
      </InlineAlert>
    );
  }

  const name = shown.kind === "saved" ? shown.name : t(`home.repertoire.samples.${shown.sample}`);
  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 1, minWidth: 0, maxWidth: 480 }}>
      <Box>
        <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600 }} data-testid={`${testId}-name`}>
          {name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {shown.kind === "sample"
            ? t("home.repertoire.sampleNote")
            : t(shown.color === "white" ? "home.repertoire.forWhite" : "home.repertoire.forBlack")}
        </Typography>
      </Box>
      <DemoBoard
        boardId={`front-page-repertoire-${slug}`}
        testId={`${testId}-board`}
        label={t("home.repertoire.label", { name })}
        root={shown.root}
        startFen={shown.kind === "saved" ? shown.startFen : undefined}
        startCaption={t("home.repertoire.start")}
        initialLine={startLineOf(shown.root, startMove, shown.kind === "saved" ? shown.startFen : undefined)}
        initialOrientation={shown.color}
        nextMoveArrows={showNextMoveArrow}
      />
      {shown.kind === "saved" ? (
        <Button
          component={RouterLink}
          to={`/repertoires/${encodeURIComponent(shown.id)}`}
          variant="outlined"
          size="small"
          data-testid={`${testId}-open`}
          sx={{ justifySelf: "start" }}
        >
          {t("home.repertoire.open")}
        </Button>
      ) : (
        <Button
          component={RouterLink}
          to="/repertoires/new"
          variant="outlined"
          size="small"
          data-testid={`${testId}-add`}
          sx={{ justifySelf: "start" }}
        >
          {t("home.repertoire.add")}
        </Button>
      )}
    </Box>
  );
}
