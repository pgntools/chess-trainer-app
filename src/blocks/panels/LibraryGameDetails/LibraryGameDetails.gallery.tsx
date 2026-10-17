import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import LibraryGameDetails, { type LibraryGameDetailsTab } from "./LibraryGameDetails";
import {
  CAPTION,
  COLLECTION,
  GAME,
  HEBREW_COLLECTION,
  HEBREW_TITLE,
  LONG_CAPTION,
  LONG_TITLE,
  TITLE,
} from "./fixtures";

type Session = { tab: LibraryGameDetailsTab; arrows: boolean; marks: boolean; evalBar: boolean };

const demo = ({
  title = TITLE,
  collectionName = COLLECTION,
  caption = CAPTION,
  number = 2,
  count = 45,
  tab = "info" as LibraryGameDetailsTab,
}: {
  title?: string;
  collectionName?: string;
  caption?: string;
  number?: number;
  count?: number;
  tab?: LibraryGameDetailsTab;
} = {}) => (
  <WithState<Session> initial={{ tab, arrows: true, marks: true, evalBar: true }}>
    {(session, setSession) => (
      <Box sx={{ width: 400, height: 520, display: "flex", flexDirection: "column" }}>
        <LibraryGameDetails
          title={title}
          collectionName={collectionName}
          number={number}
          count={count}
          caption={caption}
          backLink={{ href: "#collection" }}
          previousLink={number > 1 ? { href: "#previous" } : undefined}
          nextLink={number < count ? { href: "#next" } : undefined}
          tab={session.tab}
          onTabChange={(next) => setSession((now) => ({ ...now, tab: next }))}
          showArrows={session.arrows}
          onShowArrowsChange={(next) => setSession((now) => ({ ...now, arrows: next }))}
          showMoveMarks={session.marks}
          onShowMoveMarksChange={(next) => setSession((now) => ({ ...now, marks: next }))}
          showEvalBar={session.evalBar}
          onShowEvalBarChange={(next) => setSession((now) => ({ ...now, evalBar: next }))}
          game={GAME}
          testId="gallery-library-game-details"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "LibraryGameDetails",
  demos: [
    { name: "A game — its tags on Info, previous / next at the foot", render: () => demo() },
    { name: "On Settings", render: () => demo({ tab: "settings" }) },
    { name: "The first game — no previous", render: () => demo({ number: 1 }) },
    { name: "The only game — neither", render: () => demo({ number: 1, count: 1 }) },
    { name: "No event, round, date or result", render: () => demo({ caption: "" }) },
    { name: "Long names — the title wraps, the caption is one line", render: () => demo({ title: LONG_TITLE, caption: LONG_CAPTION }) },
    { name: "Hebrew names (switch to RTL — the way back, previous and next turn)", render: () => demo({ title: HEBREW_TITLE, collectionName: HEBREW_COLLECTION }) },
  ],
};

export default gallery;
