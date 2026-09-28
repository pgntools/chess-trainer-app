import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import ContextMenu, { type ContextMenuProps, type MenuEntry } from "./ContextMenu";

const noop = () => {};

const ENTRIES: MenuEntry[] = [
  { id: "promote", label: "Promote variation", icon: <ArrowUpwardRoundedIcon fontSize="small" />, onClick: noop },
  { id: "comment", label: "Add comment", icon: <AddCommentOutlinedIcon fontSize="small" />, onClick: noop },
  { id: "copy", label: "Copy variation PGN", icon: <ContentCopyRoundedIcon fontSize="small" />, onClick: noop },
  { id: "delete", label: "Delete from here", icon: <DeleteOutlineRoundedIcon fontSize="small" />, onClick: noop, divider: true, destructive: true },
];

/** A box to right-click in; the menu opens at the pointer. */
const area = (props: Partial<ContextMenuProps>, words: string) => (
  <WithState initial={null as { top: number; left: number } | null}>
    {(position, setPosition) => (
      <>
        <Box
          onContextMenu={(event) => {
            event.preventDefault();
            setPosition({ top: event.clientY, left: event.clientX });
          }}
          sx={{ p: 3, border: "1px dashed", borderColor: "divider", borderRadius: 1, textAlign: "center" }}
        >
          <Typography variant="body2" color="text.secondary">
            {words}
          </Typography>
        </Box>
        <ContextMenu position={position} onClose={() => setPosition(null)} entries={ENTRIES} testId="gallery-context-menu" {...props} />
      </>
    )}
  </WithState>
);

const gallery: GalleryModule = {
  section: "menus",
  title: "ContextMenu",
  demos: [
    { name: "With a subheader, icons and a destructive group (right-click)", render: () => area({ subheader: <span dir="ltr">12…Nf6</span> }, "Right-click here") },
    {
      name: "Plain entries, one disabled (right-click)",
      render: () =>
        area(
          {
            entries: [
              { id: "mainline", label: "Make main line", onClick: noop },
              { id: "chances", label: "Play chances…", onClick: noop, disabled: true },
            ],
          },
          "Right-click here",
        ),
    },
  ],
};

export default gallery;
