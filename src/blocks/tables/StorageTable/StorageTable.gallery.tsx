import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BrowserStorageEstimate } from "../../../lib/storageDiagnostics";
import type { BlockFamilyId } from "../../families";
import { BROWSER, BROWSER_WITHOUT_INDEXEDDB, CATEGORIES, EMPTY, READING } from "./fixtures";
import StorageTable, { type StorageCategory } from "./StorageTable";

const demo = (browser: BrowserStorageEstimate | undefined, categories: readonly StorageCategory[], testId: string) => (
  <Box sx={{ maxWidth: 560 }}>
    <StorageTable browser={browser} categories={categories} testId={testId} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "StorageTable",
  demos: [
    { name: "Every figure in — four sections, each closed by a bolder line", render: () => demo(BROWSER, CATEGORIES, "gallery-storage") },
    { name: "Still reading — every figure …", render: () => demo(undefined, READING, "gallery-storage-reading") },
    { name: "A browser that reports no IndexedDB part — Not available, never zero", render: () => demo(BROWSER_WITHOUT_INDEXEDDB, CATEGORIES, "gallery-storage-partial") },
    { name: "A fresh browser — nothing stored yet", render: () => demo(BROWSER_WITHOUT_INDEXEDDB, EMPTY, "gallery-storage-empty") },
  ],
};

export default gallery;
