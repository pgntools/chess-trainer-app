import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import DemoBoard from "../../shared/DemoBoard";
import { demoSamples, SAMPLE_IDS, type SampleId } from "../samples";

/**
 * **The front page's demo boards** (CTA-126) — each a `DemoBoard` over one of
 * the shipped samples (`../samples.ts`): a game, a repertoire, a collection.
 * The document embeds them all (`<SampleBoards />`, a responsive grid, each
 * under an `h3` title and a line of what it shows — so it belongs under an
 * `h2` of the document's) or one at a time (`<SampleBoard sample="game" />`).
 *
 * Each board's `options.id` is `front-page-sample-<id>`, unique on the page as
 * long as a sample is embedded once.
 */

type SampleBoardProps = {
  sample: SampleId;
};

export function SampleBoard({ sample }: SampleBoardProps) {
  const { t } = useTranslation();
  const { root, startFen } = demoSamples()[sample];
  return (
    <DemoBoard
      boardId={`front-page-sample-${sample}`}
      testId={`home-sample-${sample}`}
      label={t(`home.samples.${sample}.label`)}
      root={root}
      startFen={startFen}
      startCaption={t(`home.samples.${sample}.start`)}
    />
  );
}

export function SampleBoards() {
  const { t } = useTranslation();
  return (
    <Box
      data-testid="home-samples"
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
        gap: 3,
        mb: 3,
      }}
    >
      {SAMPLE_IDS.map((sample) => (
        <Box key={sample} component="section" sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
            {t(`home.samples.${sample}.title`)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t(`home.samples.${sample}.description`)}
          </Typography>
          <SampleBoard sample={sample} />
        </Box>
      ))}
    </Box>
  );
}
