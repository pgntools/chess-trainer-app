import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import type { PatternSectionId } from "../../sections";
import TreeView, { type TreeNode } from "./TreeView";
import { ancestorsOf } from "./treeNodes";

/** A sidebar's shape: folders that only open, pages that link. */
const MENU: TreeNode[] = [
  { id: "home", label: "Home", icon: <HomeOutlined fontSize="small" />, link: { href: "#home" } },
  {
    id: "docs",
    label: "Documents",
    icon: <FolderOutlined fontSize="small" />,
    children: [
      { id: "reports", label: "Reports", icon: <ArticleOutlined fontSize="small" />, link: { href: "#reports" } },
      {
        id: "archive",
        label: "Archive",
        icon: <FolderOutlined fontSize="small" />,
        children: [
          { id: "2025", label: "2025", icon: <ArticleOutlined fontSize="small" />, link: { href: "#year-2025" } },
          { id: "2024", label: "2024", icon: <ArticleOutlined fontSize="small" />, link: { href: "#year-2024" } },
        ],
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: <SettingsOutlined fontSize="small" />,
    children: [
      { id: "export", label: "Export", link: { href: "#export" } },
      { id: "import", label: "Import", link: { href: "#import" } },
    ],
  },
];

/** A file manager's shape: every folder a destination with a count, its chevron a button of its own. */
const FOLDERS: TreeNode[] = [
  { id: "all", label: "All items", secondary: 42 },
  {
    id: "work",
    label: "Work",
    selectable: true,
    secondary: 30,
    icon: <FolderOutlined fontSize="small" />,
    children: [
      { id: "clients", label: "Clients", selectable: true, secondary: 18, icon: <FolderOutlined fontSize="small" />, children: [] },
      { id: "drafts", label: "Drafts", selectable: true, secondary: 12, icon: <FolderOutlined fontSize="small" />, children: [] },
    ],
  },
  { id: "empty", label: "An empty folder", selectable: true, secondary: 0, icon: <FolderOutlined fontSize="small" />, children: [] },
];

const LONG: TreeNode[] = [
  {
    id: "long",
    label: "A folder whose name is far too long to fit on one line of a narrow menu",
    selectable: true,
    secondary: 7,
    children: [{ id: "long-child", label: "And a page inside it with an equally long and unwieldy name", link: { href: "#long" } }],
  },
];

const HEBREW: TreeNode[] = [
  {
    id: "h-folder",
    label: "פתיחות",
    dir: "auto",
    selectable: true,
    secondary: 12,
    icon: <FolderOutlined fontSize="small" />,
    children: [
      { id: "h-1", label: "הגנה סיציליאנית", dir: "auto", link: { href: "#h1" } },
      { id: "h-2", label: "גמביט המלכה", dir: "auto", link: { href: "#h2" } },
    ],
  },
];

/** Ten folders of a hundred pages: a thousand leaves, only the open branches mounted. */
const MANY: TreeNode[] = Array.from({ length: 10 }, (_, folder) => ({
  id: `f${folder}`,
  label: `Folder ${folder + 1}`,
  secondary: 100,
  children: Array.from({ length: 100 }, (_, page) => ({ id: `f${folder}-p${page}`, label: `Page ${page + 1}`, link: { href: "#" } })),
}));

type State = { open: Set<string>; active?: string };

const toggle = (open: ReadonlySet<string>, id: string) => {
  const next = new Set(open);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/** The tree over `nodes`, its open branches and its selection held by the demo, opened on `active`'s chain. */
const demo = (nodes: readonly TreeNode[], active?: string, width = 280) => (
  <WithState<State> initial={{ open: new Set(active === undefined ? [] : ancestorsOf(nodes, active)), active }}>
    {(state, set) => (
      <Box sx={{ width, maxHeight: 360, overflowY: "auto", border: 1, borderColor: "divider", borderRadius: 1, py: 0.5 }}>
        <TreeView
          nodes={nodes}
          open={state.open}
          onToggle={(id) => set((before) => ({ ...before, open: toggle(before.open, id) }))}
          activeId={state.active}
          onSelect={(node) => set((before) => ({ ...before, active: node.id }))}
          toggleLabel={(node, open) => `${open ? "Close" : "Open"} ${typeof node.label === "string" ? node.label : node.id}`}
          ariaLabel="Demo tree"
          testId="gallery-tree"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<PatternSectionId> = {
  section: "trees",
  title: "TreeView",
  demos: [
    { name: "A menu — folders open in place, pages link; opened on the page on screen (2025)", render: () => demo(MENU, "2025") },
    {
      name: "Folders as destinations — a row selects, its chevron opens it, a count at the end",
      render: () => demo(FOLDERS, "clients"),
    },
    { name: "Nothing open, nothing selected", render: () => demo(MENU) },
    { name: "Long names — cut with an ellipsis", render: () => demo(LONG, "long-child", 220) },
    { name: "Hebrew names (switch the direction to RTL — the levels set in from the right)", render: () => demo(HEBREW, "h-1") },
    { name: "1,000 leaves — a closed branch mounts nothing", render: () => demo(MANY) },
    {
      name: "Empty",
      render: () => (
        <Box sx={{ width: 280 }}>
          <TreeView nodes={[]} open={new Set()} onToggle={() => {}} ariaLabel="Nothing" testId="gallery-tree-empty" />
          <Typography variant="caption" color="text.secondary">
            (no nodes — the caller shows its own empty state)
          </Typography>
        </Box>
      ),
    },
  ],
};

export default gallery;
