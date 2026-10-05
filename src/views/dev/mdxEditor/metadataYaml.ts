import { isMap, isScalar, isSeq, parseDocument, type Document } from "yaml";

import { FRONTMATTER_KEYS, type FrontmatterKey } from "../../../lib/articleFrontmatter";

/**
 * **The Metadata tab's edits** (CTA-135) — a form field changed is one key
 * set or taken out of the frontmatter's YAML, through the `yaml` library's
 * document model rather than a fresh `stringify`: so a comment, the keys'
 * order, a key the form does not have and the quoting the file chose all
 * survive an edit from the form. The YAML view and the form are two views of
 * this one text.
 */

/** A value the form gives a key — `undefined` takes the key out (an empty field, a switch turned off). */
export type MetadataValue = string | number | boolean | readonly string[] | undefined;

/**
 * The frontmatter with `key` set to `value`, or taken out; the rest of it as
 * it was. A value is written afresh — so a quote the YAML needed for a
 * moment while it was typed ("My ") does not stay — keeping the comment on
 * its line. A key the text has not got goes where the schema lists it among
 * the keys it has, so a field emptied and filled again does not move. Lists
 * are written `[a, b]`.
 */
export const setMetadataKey = (yaml: string, key: FrontmatterKey, value: MetadataValue): string => {
  // Widened from the parsed document's type, whose contents only a parse may set.
  const document: Document = parseDocument(yaml);
  // An empty text (or comments alone) has no map yet: start one, keeping the comments.
  if (!isMap(document.contents)) document.contents = document.createNode({});
  const map = document.contents;
  if (!isMap(map)) return yaml;

  if (value === undefined || (Array.isArray(value) && value.length === 0)) {
    document.delete(key);
  } else {
    const node = document.createNode(Array.isArray(value) ? [...value] : value);
    if (isSeq(node)) node.flow = true;
    const previous = map.get(key, true);
    if (isScalar(previous) && isScalar(node)) node.comment = previous.comment;
    const had = map.has(key);
    map.set(key, node);
    if (!had) {
      // Moved from the end to before the first key the schema lists after it.
      const rank = (name: unknown) => {
        const index = FRONTMATTER_KEYS.indexOf(String(isScalar(name) ? name.value : name) as FrontmatterKey);
        return index === -1 ? Number.POSITIVE_INFINITY : index;
      };
      const pair = map.items.pop()!;
      const at = map.items.findIndex((item) => rank(item.key) > FRONTMATTER_KEYS.indexOf(key));
      map.items.splice(at === -1 ? map.items.length : at, 0, pair);
    }
  }
  return map.items.length === 0 ? "" : document.toString({ lineWidth: 0 });
};

/** The YAML a new article starts from — a draft, dated today (`YYYY-MM-DD`). */
export const starterFrontmatter = (today: string): string =>
  `title: A new article\nsummary: One line about it, for the index pages.\ndate: ${today}\ndraft: true\n`;

/** Today as frontmatter writes a date. */
export const todayIso = (): string => new Date().toISOString().slice(0, 10);
