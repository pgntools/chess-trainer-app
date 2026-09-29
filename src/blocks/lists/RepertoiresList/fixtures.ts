import { DEFAULT_REPERTOIRE_SETTINGS } from "../../../lib/repertoireSettings";
import type { SavedRepertoire } from "../../../lib/savedRepertoires";
import type { RepertoireFolder } from "../../../lib/savedRepertoireFolders";
import type { RepertoireFolderEntry } from "./RepertoiresList";

/*
  The repertoires list's sample data (CTA-113), typed with `src/lib/`'s own
  record and folder. Imported only by the block's gallery and its test.
*/

const AT = "2026-09-03T12:00:00.000Z";
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const SICILIAN = "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2";

const repertoire = (id: string, name: string, extra: Partial<SavedRepertoire> = {}): SavedRepertoire => ({
  id,
  name,
  pgn: "1. e4 c5 2. Nf3 (2. c3) d6 *",
  previewFen: SICILIAN,
  stats: { moves: 3, variations: 1 },
  settings: DEFAULT_REPERTOIRE_SETTINGS,
  folderId: null,
  savedAt: AT,
  updatedAt: AT,
  ...extra,
});

const folder = (id: string, name: string): RepertoireFolder => ({ id, name, savedAt: AT, updatedAt: AT });

export const FOLDERS: readonly RepertoireFolderEntry[] = [
  { folder: folder("fwhite", "White"), count: 4 },
  { folder: folder("fempty", "Empty"), count: 0 },
];

export const REPERTOIRES: readonly SavedRepertoire[] = [
  repertoire("r1", "Sicilian, the Alapin", { settings: { ...DEFAULT_REPERTOIRE_SETTINGS, description: "Against 2...Nf6, play 3.e5." } }),
  repertoire("r2", "", { previewFen: START, stats: { moves: 12, variations: 0 }, settings: { ...DEFAULT_REPERTOIRE_SETTINGS, color: "black" } }),
  repertoire("r3", "Before the one-game rule", { pgn: '[Event "One"]\n\n1. e4 e5 *\n\n[Event "Two"]\n\n1. d4 d5 *', stats: undefined }),
];

export const LONG_REPERTOIRES: readonly SavedRepertoire[] = [
  repertoire("long", "A repertoire whose name goes on and on well past any card or row it could be shown in", {
    settings: { ...DEFAULT_REPERTOIRE_SETTINGS, description: "A description long enough to wrap onto a second and a third line in a narrow panel." },
  }),
];

export const HEBREW_REPERTOIRES: readonly SavedRepertoire[] = [repertoire("heb", "הגנה סיציליאנית", { settings: { ...DEFAULT_REPERTOIRE_SETTINGS, description: "לזכור את הקו הראשי" } })];

export const HEBREW_FOLDERS: readonly RepertoireFolderEntry[] = [{ folder: folder("fheb", "פתיחות"), count: 1 }];
