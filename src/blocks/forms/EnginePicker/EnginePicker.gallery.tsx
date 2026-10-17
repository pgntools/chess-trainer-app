import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { EngineEntry } from "../../../lib/engines";
import type { BlockFamilyId } from "../../families";
import EnginePicker from "./EnginePicker";
import { DEFAULT_ONLY, ISOLATED_HOST, PLAIN_HOST, WITH_ADDED, WITH_ENGINE_SERVER } from "./fixtures";

const demo = (entries: readonly EngineEntry[], initial: string) => (
  <WithState<string> initial={initial}>
    {(value, set) => <EnginePicker entries={entries} value={value} onChange={set} testId="gallery-engine-picker" />}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "EnginePicker",
  demos: [
    { name: "A host that isolates the page — every build can be chosen", render: () => demo(ISOLATED_HOST, "stockfish-19-lite-single") },
    { name: "The multi-thread build chosen", render: () => demo(ISOLATED_HOST, "stockfish-19-lite-multi") },
    { name: "A host without COOP / COEP — the multi-thread build disabled, with its reason", render: () => demo(PLAIN_HOST, "stockfish-19-lite-single") },
    { name: "The default engine alone", render: () => demo(DEFAULT_ONLY, "stockfish-19-lite-single") },
    { name: "Engines beyond the shipped ones — a long name, a name in Hebrew", render: () => demo(WITH_ADDED, "my-engine") },
    { name: "An engine on the engine server — its address beside its facts", render: () => demo(WITH_ENGINE_SERVER, "hosted:stockfish-18") },
  ],
};

export default gallery;
