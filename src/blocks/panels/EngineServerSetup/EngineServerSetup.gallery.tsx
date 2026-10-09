import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import EngineServerSetup from "./EngineServerSetup";
import { DEFAULT_ADDRESS, GUIDE_LINK, MOVED_ADDRESS } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "EngineServerSetup",
  demos: [
    { name: "The steps, at the default address", render: () => <EngineServerSetup example={DEFAULT_ADDRESS} guide={GUIDE_LINK} testId="gallery-engine-setup" /> },
    { name: "A server moved elsewhere — a long address", render: () => <EngineServerSetup example={MOVED_ADDRESS} guide={GUIDE_LINK} testId="gallery-engine-setup-moved" /> },
  ],
};

export default gallery;
