import type { TreeNode } from "./TreeView";

/**
 * The ids of the branches above `id`, outermost first — what has to be open
 * for a node to be in view (the node on screen, a search's match). Empty for
 * a top-level node and for an id the tree does not hold. Depth-first, and
 * cut at a node already walked, so a malformed tree still answers.
 */
export const ancestorsOf = (nodes: readonly TreeNode[], id: string): string[] => {
  const seen = new Set<string>();
  const walk = (level: readonly TreeNode[], path: string[]): string[] | undefined => {
    for (const node of level) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      if (node.id === id) return path;
      if (node.children !== undefined) {
        const found = walk(node.children, [...path, node.id]);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };
  return walk(nodes, []) ?? [];
};
