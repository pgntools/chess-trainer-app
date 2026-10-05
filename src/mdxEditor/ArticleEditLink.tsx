import { Link as RouterLink } from "react-router";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";

import { IconAction } from "../design-system/components/toolbars";
import type { AppLanguage } from "../i18n";
import { articleFileOf } from "../views/blog/articles";
import { MDX_EDITOR_ENABLED } from "./enabled";

type ArticleEditLinkProps = {
  /** The article's path — `tournaments/olympiad-2026`. */
  path: string;
  /** The language the page shows it in: its file is that document's (`<path>.he.mdx`), else the English one — a translation of the title alone included. */
  language: AppLanguage;
};

/**
 * **Edit this article** — under `yarn mdx-editor:start` only
 * (`MDX_EDITOR_ENABLED`): an icon beside an article's title (a Blog
 * article's page, the front page) opening the file the page shows in the
 * MDX editor (`/dev/mdx-editor/edit?article=<file>`). It is only a link, so the
 * shipped page imports nothing of the editor; and the switch is the literal
 * `false` in a production build, so there it renders nothing. Its words are
 * English, as the Development section's are.
 */
export function ArticleEditLink({ path, language }: ArticleEditLinkProps) {
  if (!MDX_EDITOR_ENABLED) return null;
  const file = articleFileOf(path, language);
  if (file === undefined) return null;
  return (
    <IconAction
      label="Edit in the MDX editor"
      link={{ component: RouterLink, to: `/dev/mdx-editor/edit?article=${encodeURIComponent(file)}` }}
      testId="article-edit"
    >
      <EditNoteRoundedIcon fontSize="small" />
    </IconAction>
  );
}
