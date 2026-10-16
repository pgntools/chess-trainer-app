/**
 * **The Dialogs family's public surface** (CTA-109) — a screen imports this
 * family's blocks from here and nowhere deeper: dialogs over the app's own
 * data (an import's zip and choices), each a `BaseDialog` from the design
 * system. They take `dialogProps`, so the gallery opens them in a frame.
 */
export * from "./CasePickerDialog";
export * from "./CollectionImportDialog";
export * from "./DevelopmentNoticeDialog";
export * from "./EngineOptionsChangedDialog";
export * from "./FolderDeleteDialog";
export * from "./FolderMoveDialog";
export * from "./FolderNameDialog";
export * from "./GamesPickerDialog";
export * from "./ImportDialog";
export * from "./IncompatibleImportDialog";
export * from "./NewCaseDialog";
export * from "./NewJobDialog";
// CTA-217: the Jobs module's New job — the kinds that apply to an entity, then the chosen kind's form, over FormDialog.
export * from "./NewJobFrame";
export * from "./NewProjectDialog";
export * from "./OpeningTreePgnDialog";
export * from "./ProjectPickerDialog";
export * from "./SaveAsCollectionDialog";
