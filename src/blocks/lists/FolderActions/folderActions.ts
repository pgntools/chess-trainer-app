/** A folder's actions, in the order every folder shows them. */
export const FOLDER_ACTIONS = ["new", "upload", "download", "rename", "move", "delete"] as const;

export type FolderAction = (typeof FOLDER_ACTIONS)[number];
