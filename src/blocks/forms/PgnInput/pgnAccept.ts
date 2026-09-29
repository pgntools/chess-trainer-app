/** What a PGN pick offers: the extension, the registered type, and plain text (what most exports are sent as). */
export const PGN_ACCEPT = [".pgn", "application/x-chess-pgn", "text/plain"] as const;

/** A PGN, or a zip of them (the Library's upload). */
export const PGN_OR_ZIP_ACCEPT = [...PGN_ACCEPT, ".zip", "application/zip", "application/x-zip-compressed"] as const;
