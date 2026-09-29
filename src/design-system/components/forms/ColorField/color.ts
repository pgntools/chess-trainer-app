import { recomposeColor } from "@mui/material/styles";

/**
 * A colour as its four channels: red, green and blue 0–255, alpha 0–1.
 */
export type Rgba = { r: number; g: number; b: number; a: number };

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const CHANNEL = String.raw`\s*(\d{1,3})\s*`;
const ALPHA = String.raw`\s*(0|1|0?\.\d+|1\.0+)\s*`;
const RGB = new RegExp(`^rgb\\(${CHANNEL},${CHANNEL},${CHANNEL}\\)$`, "i");
const RGBA = new RegExp(`^rgba\\(${CHANNEL},${CHANNEL},${CHANNEL},${ALPHA}\\)$`, "i");

/**
 * **Reads a colour as `ColorField` accepts one** — `#rgb`, `#rgba`,
 * `#rrggbb`, `#rrggbbaa`, `rgb(r, g, b)` or `rgba(r, g, b, a)` — or `null`
 * for anything else (a name, `hsl()`, a channel over 255).
 */
export const parseColor = (text: string): Rgba | null => {
  const value = text.trim();
  const hex = HEX.exec(value);
  if (hex !== null) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map((digit) => digit + digit).join("") : hex[1];
    const [r, g, b, a = 255] = (digits.match(/../g) ?? []).map((pair) => parseInt(pair, 16));
    return { r, g, b, a: Math.round((a / 255) * 1000) / 1000 };
  }
  const rgb = RGBA.exec(value) ?? RGB.exec(value);
  if (rgb === null) return null;
  const [r, g, b] = rgb.slice(1, 4).map(Number);
  if ([r, g, b].some((channel) => channel > 255)) return null;
  return { r, g, b, a: rgb[4] === undefined ? 1 : Number(rgb[4]) };
};

const hexPair = (channel: number) => channel.toString(16).padStart(2, "0");

/** The colour without its alpha, as the native colour picker takes one: `#rrggbb`. */
export const hexOf = ({ r, g, b }: Rgba): string => `#${hexPair(r)}${hexPair(g)}${hexPair(b)}`;

/**
 * `picked` (the native picker's `#rrggbb`) with `current`'s alpha: a
 * translucent colour stays translucent — written `rgba(r, g, b, a)` — and an
 * opaque one is the picked hex.
 */
export const withPickedColor = (current: string, picked: string): string => {
  const alpha = parseColor(current)?.a ?? 1;
  const next = parseColor(picked);
  if (next === null || alpha >= 1) return picked;
  // MUI's own way of writing it, `rgba(r, g, b, a)` — as the themes write their translucent tokens.
  return recomposeColor({ type: "rgba", values: [next.r, next.g, next.b, alpha] });
};
