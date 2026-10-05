import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import FolderOpenOutlined from "@mui/icons-material/FolderOpenOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import type { PatternSectionId } from "../../sections";
import { TreePicker } from "./index";
import type { TreeNode } from "../TreeView";

/** An article picker's shape: folders that open, articles that are picked. */
const ARTICLES: TreeNode[] = [
  { id: "draft", label: "A draft", icon: <ArticleOutlined fontSize="small" /> },
  {
    id: "tournaments",
    label: "Tournaments",
    icon: <FolderOutlined fontSize="small" />,
    children: [
      { id: "olympiad", label: "46th Chess Olympiad", icon: <ArticleOutlined fontSize="small" /> },
      { id: "candidates", label: "FIDE Candidates", icon: <ArticleOutlined fontSize="small" /> },
      {
        id: "2025",
        label: "2025",
        icon: <FolderOutlined fontSize="small" />,
        children: [
          { id: "swiss", label: "A Swiss of five rounds", icon: <ArticleOutlined fontSize="small" /> },
          { id: "match", label: "A match of twelve games", icon: <ArticleOutlined fontSize="small" /> },
        ],
      },
    ],
  },
  {
    id: "long",
    label: "A folder whose name is far too long to fit on one line of a narrow menu",
    icon: <FolderOutlined fontSize="small" />,
    children: [
      { id: "long-child", label: "And an article inside it with an equally long and unwieldy name", icon: <ArticleOutlined fontSize="small" /> },
    ],
  },
];

/** How the tree is worked — read with it by a screen reader, not shown (CTA-112). */
const HINT = "Up and down arrows to move, right to open, left to close, Enter to go.";

/** The picker over `nodes`, its pick held by the demo, opened on `active`'s chain. */
const demo = (nodes: readonly TreeNode[], active?: string) => (
  <WithState<{ active?: string }> initial={{ active }}>
    {(state, set) => (
      <TreePicker
        nodes={nodes}
        activeId={state.active}
        onSelect={(node) => set((before) => ({ ...before, active: node.id }))}
        label="Open an article"
        icon={<FolderOpenOutlined />}
        treeLabel="Articles"
        hint={HINT}
        testId="gallery-picker"
      />
    )}
  </WithState>
);

const gallery: GalleryModule<PatternSectionId> = {
  section: "trees",
  title: "TreePicker",
  demos: [
    {
      name: "Picking an article — the chain to the article on screen opens with it, its row marked",
      render: () => demo(ARTICLES, "swiss"),
    },
    { name: "Nothing on screen — the branches stay closed until opened", render: () => demo(ARTICLES) },
    { name: "Long names — cut with an ellipsis", render: () => demo(ARTICLES, "long-child") },
    {
      name: "Its navigation hint — out of sight, read with the tree (aria-describedby); printed here",
      render: () => (
        <Box sx={{ display: "grid", gap: 1 }}>
          {demo(ARTICLES, "candidates")}
          <Typography variant="caption" color="text.secondary">
            A screen reader hears: “Articles, tree. {HINT}”
          </Typography>
        </Box>
      ),
    },
  ],
};

export default gallery;
