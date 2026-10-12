import type { PickableCase } from "./CasePickerDialog";

/*
  The Cases a Case may link to (CTA-188): two Projects, a Game and a Position
  each, a Hebrew name. Imported only by the block's gallery and its test.
*/

export const PROJECTS: readonly { id: string; name: string }[] = [
  { id: "p-najdorf", name: "Najdorf studies" },
  { id: "p-endgames", name: "Endgames" },
  { id: "p-empty", name: "Nothing to pick" },
];

export const CASES: readonly PickableCase[] = [
  { id: "c1", projectId: "p-najdorf", name: "Carlsen – Caruana, Norway Chess, 2024", type: "game" },
  { id: "c2", projectId: "p-najdorf", name: "White to move, move 14", type: "position" },
  { id: "c3", projectId: "p-endgames", name: "עמדת לוסנה", type: "position" },
];
