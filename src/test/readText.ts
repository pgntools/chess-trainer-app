/**
 * **What an element says, as a screen reader would read its content**
 * (CTA-128) — its text with every `aria-hidden` part left out and an image
 * read by its `alt`, the spaces collapsed. A table's row header with a title
 * chip and a flag reads "Grandmaster Firouzja, Alireza France", where its
 * `textContent` would be "GMGrandmaster Firouzja, Alireza ". For a test that
 * lists several elements' words; `toHaveAccessibleName` checks one.
 */
export const readText = (element: Element): string => {
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? "");
      return;
    }
    if (!(node instanceof Element) || node.getAttribute("aria-hidden") === "true") return;
    if (node.tagName === "IMG") {
      parts.push(` ${node.getAttribute("alt") ?? ""} `);
      return;
    }
    node.childNodes.forEach(walk);
  };
  walk(element);
  return parts.join("").replace(/\s+/g, " ").trim();
};
