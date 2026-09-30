import Box from "@mui/material/Box";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";

import { IconAction } from "../../../design-system/components/toolbars";
import { demoPreview } from "../../../design-system/gallery/demoPreview";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { SavedRepertoire } from "../../../lib/savedRepertoires";
import type { BlockFamilyId } from "../../families";
import type { SavedListView } from "../savedListView";
import { FOLDERS, HEBREW_FOLDERS, HEBREW_REPERTOIRES, LONG_REPERTOIRES, REPERTOIRES } from "./fixtures";
import RepertoiresList, { type RepertoireFolderEntry } from "./RepertoiresList";

const noop = () => {};

const demo = (view: SavedListView, folders: readonly RepertoireFolderEntry[], repertoires: readonly SavedRepertoire[]) => (
  <WithState<Set<string>> initial={new Set(["r1"])}>
    {(picked, setPicked) => (
      <Box sx={{ height: 420, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <RepertoiresList
          view={view}
          folders={folders}
          repertoires={repertoires}
          picked={picked}
          onTogglePick={(id) =>
            setPicked((before) => {
              const next = new Set(before);
              if (!next.delete(id)) next.add(id);
              return next;
            })
          }
          openLink={(saved) => ({ href: `#open-${saved.id}` })}
          settingsLink={(saved) => ({ href: `#settings-${saved.id}` })}
          folderLink={(folder) => ({ href: `#folder-${folder.id}` })}
          folderActions={{ onDownload: noop, onRename: noop, onDelete: noop }}
          extraActions={(saved) => (
            <IconAction label={`Games of ${saved.name || "Untitled repertoire"}`} testId={`gallery-repertoires-games-${saved.id}`}>
              <MenuBookRoundedIcon fontSize="small" />
            </IconAction>
          )}
          preview={() => demoPreview}
          empty={{ label: "No repertoires yet.", testId: "gallery-repertoires-empty" }}
          testId="gallery-repertoires"
          folderTestId="gallery-repertoire-folder"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "RepertoiresList",
  demos: [
    { name: "The list — folders (one empty), a described repertoire, an untitled one, one of several games", render: () => demo("list", FOLDERS, REPERTOIRES) },
    { name: "Small boards", render: () => demo("compact", FOLDERS, REPERTOIRES) },
    { name: "Big boards", render: () => demo("comfortable", FOLDERS, REPERTOIRES) },
    { name: "Empty", render: () => demo("list", [], []) },
    { name: "Long names", render: () => demo("list", [], LONG_REPERTOIRES) },
    { name: "Hebrew names (switch to RTL)", render: () => demo("compact", HEBREW_FOLDERS, HEBREW_REPERTOIRES) },
  ],
};

export default gallery;
