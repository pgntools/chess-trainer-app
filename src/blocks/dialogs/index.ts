/**
 * **The Dialogs family's public surface** (CTA-109) — a screen imports this
 * family's blocks from here and nowhere deeper: dialogs over the app's own
 * data (an import's zip and choices), each a `BaseDialog` from the design
 * system. They take `dialogProps`, so the gallery opens them in a frame.
 */
export * from "./CasePickerDialog";
export * from "./CollectionImportDialog";
// CTA-232: Library collections merged — the merge's form, then its result (Open collection, Download PGN).
export * from "./CollectionMergeDialog";
export * from "./DevelopmentNoticeDialog";
// CTA-237: a board's engine asked for while an engine job runs — Pause the job, or Wait for it to finish.
export * from "./EngineJobRunningDialog";
export * from "./EngineOptionsChangedDialog";
export * from "./FolderDeleteDialog";
export * from "./FolderMoveDialog";
export * from "./FolderNameDialog";
export * from "./GamesPickerDialog";
export * from "./ImportDialog";
export * from "./IncompatibleImportDialog";
// CTA-236: Resume on an engine job whose settings differ from the current ones — the job's, the current, Cancel.
export * from "./JobSettingsChangedDialog";
export * from "./NewCaseDialog";
// CTA-217: the Jobs module's New job — the kinds that apply to an entity, then the chosen kind's form, over FormDialog.
export * from "./NewJobFrame";
export * from "./NewProjectDialog";
export * from "./OpeningTreePgnDialog";
// CTA-225: a Project past its soft limit of Cases — a Library collection suggested, Create anyway, Cancel.
export * from "./ProjectCaseLimitDialog";
export * from "./ProjectPickerDialog";
export * from "./SaveAsCollectionDialog";
