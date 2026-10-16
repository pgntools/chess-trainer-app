import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { useTranslation } from "react-i18next";

import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { formatBytes } from "../../../lib/formatBytes";

/** An entity the job made (a Case, a repertoire, a collection) — it opens. */
export type JobEntityOutputView = {
  key: string;
  kind: "entity";
  label: string;
  /** Where it opens; absent (or `deleted`), its name is plain words. */
  link?: LinkTarget;
  /** Deleted since the job made it. */
  deleted?: boolean;
  /** Decided, not yet applied (the outbox). */
  pending?: boolean;
};

/** A file the job wrote — it downloads. */
export type JobArtifactOutputView = {
  key: string;
  kind: "artifact";
  name: string;
  mimeType: string;
  /** Bytes; absent while it is pending (not sealed). */
  size?: number;
  pending?: boolean;
};

/** Data the job reports — drawn by its kind's view (`renderData`). */
export type JobDataOutputView = {
  key: string;
  kind: "data";
  /** The kind's name for it ("Report"). */
  label: string;
  pending?: boolean;
};

/** One output of a job — the runtime's `JobOutput`, or a pending `OutputPlan`, as the screen words it. */
export type JobOutputView = JobEntityOutputView | JobArtifactOutputView | JobDataOutputView;

export type JobOutputsListProps = {
  outputs: readonly JobOutputView[];
  /** Download an artifact — the screen reads its blob and saves it. */
  onDownload: (output: JobArtifactOutputView) => void;
  /** A data output, drawn by its kind's view. */
  renderData: (output: JobDataOutputView) => ReactNode;
  /** The artifact being read for its download — its button busy. */
  downloadingKey?: string;
  /** The heading's level — `3` under a job's own page's `h2`s (the default), `2` beside them. */
  headingLevel?: 2 | 3;
  /** The root; each output `-<key>`, its link `-<key>-link`, its download `-<key>-download`, its data `-<key>-data`, none `-empty`. */
  testId: string;
};

/**
 * **What a job made** (CTA-217) — its outputs, one row each, its kind
 * (made, a file, a report) said first: an **entity** is a link that opens
 * it (one deleted since said, unlinked); an **artifact** is its name, MIME
 * type and size (as the Storage tab writes a size) and a **Download**
 * button; a **data** output is its kind's own view, drawn by the caller.
 * An output decided but not yet applied is a **pending** row — its name, a
 * Pending chip, nothing to open. None, a line saying so.
 *
 * Presentational: the outputs, the download and the data's view are props.
 * Its words are `jobs.outputs.*`.
 */
function JobOutputsList({ outputs, onDownload, renderData, downloadingKey, headingLevel = 3, testId }: JobOutputsListProps) {
  const { t } = useTranslation();
  const id = (part: string) => `${testId}-${part}`;

  const kindWord = (output: JobOutputView) => (
    <Typography component="span" variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase" }}>
      {t(`jobs.outputs.kinds.${output.kind}`)}
    </Typography>
  );
  const pendingChip = (output: JobOutputView) => (
    <Chip size="small" variant="outlined" label={t("jobs.outputs.pending")} data-testid={id(`${output.key}-pending`)} />
  );

  const row = (output: JobOutputView): ReactNode => {
    if (output.kind === "entity") {
      return (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          {kindWord(output)}
          {output.pending !== true && output.deleted !== true && output.link !== undefined ? (
            <Link {...(linkProps(output.link) as Record<string, unknown>)} underline="hover" dir="auto" data-testid={id(`${output.key}-link`)}>
              {output.label}
            </Link>
          ) : (
            <Typography component="span" variant="body2" sx={{ color: output.deleted === true ? "text.secondary" : undefined }}>
              <bdi dir="auto">{output.label}</bdi>
              {output.deleted === true && ` ${t("jobs.outputs.deleted")}`}
            </Typography>
          )}
          {output.pending === true && pendingChip(output)}
        </Box>
      );
    }
    if (output.kind === "artifact") {
      return (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          {kindWord(output)}
          <Box sx={{ minWidth: 0, flex: "1 1 12rem" }}>
            <Typography variant="body2" dir="auto" sx={{ overflowWrap: "anywhere" }}>
              {output.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              <bdi dir="ltr">{output.mimeType}</bdi>
              {output.size !== undefined && (
                <>
                  {" · "}
                  <bdi dir="ltr" data-testid={id(`${output.key}-size`)}>
                    {formatBytes(output.size)}
                  </bdi>
                </>
              )}
            </Typography>
          </Box>
          {output.pending === true ? (
            pendingChip(output)
          ) : (
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadRoundedIcon />}
              onClick={() => onDownload(output)}
              disabled={downloadingKey === output.key}
              aria-busy={downloadingKey === output.key || undefined}
              aria-label={t("jobs.outputs.downloadNamed", { name: output.name })}
              data-testid={id(`${output.key}-download`)}
            >
              {t("jobs.outputs.download")}
            </Button>
          )}
        </Box>
      );
    }
    return (
      <Box sx={{ display: "grid", gap: 0.5 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          {kindWord(output)}
          <Typography component="span" variant="body2" dir="auto" sx={{ fontWeight: 600 }}>
            {output.label}
          </Typography>
          {output.pending === true && pendingChip(output)}
        </Box>
        {output.pending !== true && <Box data-testid={id(`${output.key}-data`)}>{renderData(output)}</Box>}
      </Box>
    );
  };

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 1 }}>
      <Typography variant="subtitle2" component={headingLevel === 2 ? "h2" : "h3"} id={id("heading")} sx={{ fontWeight: 700 }}>
        {t("jobs.outputs.title")}
      </Typography>
      {outputs.length === 0 ? (
        <Typography variant="body2" data-testid={id("empty")} sx={{ color: "text.secondary" }}>
          {t("jobs.outputs.empty")}
        </Typography>
      ) : (
        <Box component="ul" aria-labelledby={id("heading")} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5 }}>
          {outputs.map((output) => (
            <Box component="li" key={output.key} data-testid={id(output.key)}>
              {row(output)}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default JobOutputsList;
