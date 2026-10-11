/**
 * **Which fields a stored record did not carry** (CTA-181) — a normaliser
 * fills a missing field with its default, and that is right for everything
 * the record drives; but one question needs the difference: "were these
 * engine settings different from the ones in effect now?" A record written
 * before a field existed never chose it, so it must not say it differs
 * (`lib/engineSearchSettings.ts`, `searchSettingsChanges`).
 *
 * The normalisers (`analysisSettingsFrom`, `engineSettingsFrom`) mark the
 * object they return; nothing else is changed — the record's shape, its
 * writes and the export zip never see it. An object built in the app, not
 * read back, carries no mark: it has every field.
 */

const missing = new WeakMap<object, ReadonlySet<string>>();

const NONE: ReadonlySet<string> = new Set();

/** `value`, marked as read from a record that lacked `fields`. The same object. */
export const withMissingFields = <T extends object>(value: T, fields: readonly string[]): T => {
  if (fields.length > 0) missing.set(value, new Set(fields));
  return value;
};

/** The fields `value`'s record did not carry — none for anything not read back by a normaliser. */
export const missingFieldsOf = (value: object): ReadonlySet<string> => missing.get(value) ?? NONE;
