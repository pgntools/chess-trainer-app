import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import Breadcrumbs from "./Breadcrumbs";

const TREE = [
  { id: "root", label: "All analyses" },
  { id: "openings", label: "Openings" },
  { id: "sicilian", label: "Sicilian" },
  { id: "najdorf", label: "Najdorf, 6.Bg5" },
];

const gallery: GalleryModule = {
  section: "navigation",
  title: "Breadcrumbs",
  demos: [
    {
      name: "A nested folder (click a step to go up)",
      render: () => (
        <WithState initial={TREE.length - 1}>
          {(depth, setDepth) => (
            <Breadcrumbs
              ariaLabel="Folders"
              crumbs={TREE.slice(0, depth).map((step, index) => ({ ...step, onClick: () => setDepth(index) }))}
              current={TREE[depth].label}
              testId="gallery-crumbs"
            />
          )}
        </WithState>
      ),
    },
    {
      name: "At the top — the current place alone",
      render: () => <Breadcrumbs ariaLabel="Folders" crumbs={[]} current="All analyses" testId="gallery-crumbs-top" />,
    },
    {
      name: "A chevron separator and a mixed-direction name",
      render: () => (
        <Breadcrumbs
          ariaLabel="Folders"
          separator={<NavigateNextRoundedIcon fontSize="small" sx={{ transform: (theme) => (theme.direction === "rtl" ? "scaleX(-1)" : "none") }} />}
          crumbs={[
            { id: "root", label: "All analyses", link: { href: "#root" } },
            { id: "he", label: "פתיחות", link: { href: "#he" } },
          ]}
          current="Caro-Kann"
          testId="gallery-crumbs-chevron"
        />
      ),
    },
  ],
};

export default gallery;
