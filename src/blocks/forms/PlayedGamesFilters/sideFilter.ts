/** The Lobby's side filter: the side the reader played, or either. */
export type PlayedGameSideFilter = "all" | "white" | "black";

/** `?color=` read back: anything but `white` or `black` is either side. */
export const playedGameSideFilterOf = (value: string | null): PlayedGameSideFilter =>
  value === "white" || value === "black" ? value : "all";
