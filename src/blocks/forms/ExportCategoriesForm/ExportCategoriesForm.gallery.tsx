import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { ExportCategory, ExportSelection } from "../../../lib/dataExport";
import type { BlockFamilyId } from "../../families";
import ExportCategoriesForm from "./ExportCategoriesForm";
import { COUNTS, EVERYTHING, NOTHING, READING, SHIPPED } from "./fixtures";

const demo = (initial: ExportSelection, counts: Readonly<Record<ExportCategory, number | undefined>>, disabled = false) => (
  <WithState<ExportSelection> initial={initial}>
    {(selection, set) => (
      <ExportCategoriesForm
        selection={selection}
        onChange={(patch) => set((before) => ({ ...before, ...patch }))}
        counts={counts}
        shippedCount={SHIPPED}
        disabled={disabled}
        testId="gallery-export"
      />
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "ExportCategoriesForm",
  demos: [
    { name: "Nothing ticked — the shipped box off until Collections is", render: () => demo(NOTHING, COUNTS) },
    { name: "Everything ticked", render: () => demo(EVERYTHING, COUNTS) },
    { name: "The stores still being read — every count …", render: () => demo(NOTHING, READING) },
    { name: "An export under way — every box off", render: () => demo(EVERYTHING, COUNTS, true) },
  ],
};

export default gallery;
