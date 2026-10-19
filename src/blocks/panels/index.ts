/**
 * **The Panels family's public surface** (CTA-109) — a screen imports this
 * family's blocks from here and nowhere deeper: the reports and panels that
 * know the app's data (an import's results).
 */
export * from "./BoardEngineControls";
// CTA-186: a Case's own view beside its board, the second screen of its left panel.
export * from "./CaseDetails";
export * from "./ChangesStrip";
// CTA-229: a Library collection's own panel beside its games — the collection page's left panel.
export * from "./CollectionDetails";
export * from "./EnginePresetChanges";
// CTA-173: a computer analysis's report and eval graph — a computer-analysis job's (CTA-221).
export * from "./ComputerAnalysisReport";
export * from "./CurrentOpening";
export * from "./EngineThinking";
export * from "./EvalGraph";
export * from "./GameInfo";
// CTA-238: the Accuracy Trainer — a graded position, and the session's summary.
export * from "./GradedLines";
export * from "./AccuracySessionReport";
// CTA-238: an Accuracy Trainer exercise's own panel beside its board.
export * from "./AccuracyTrainerDetails";
export * from "./ImportReport";
// CTA-190: a running engine job's live engine progress, under its progress bar.
export * from "./JobEngineProgress";
// CTA-217: the Jobs module's generic blocks — a job whole, and the header indicator's presentation.
export * from "./JobDetailsPanel";
export * from "./JobsIndicatorView";
// CTA-209: a Library game's own view beside its board — the game board's left panel.
export * from "./LibraryGameDetails";
export * from "./PgnExportPanel";
export * from "./PlayToggleButton";
// CTA-213: a Project's own panel beside its Cases — the Project view's left panel.
export * from "./ProjectDetails";
// CTA-206: a repertoire's own view beside its board — the player's left panel.
export * from "./RepertoireDetails";
export * from "./TopPlayers";
export * from "./RepertoireEvaluationReport";
