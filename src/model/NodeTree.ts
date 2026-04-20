import { MindNode, TreeNode } from "../types";

export function buildTree(nodes: MindNode[]): TreeNode | null {
  if (nodes.length === 0) return null;

  const map = new Map<string, TreeNode>();
  let root: TreeNode | null = null;

  for (const node of nodes) {
    map.set(node.id, {
      data: node,
      children: [],
      parent: null,
      depth: 0,
      totalChildren: 0,
      layoutX: 0,
      layoutY: 0,
      subtreeHeight: 0,
    });
  }

  for (const node of nodes) {
    const treeNode = map.get(node.id)!;
    if (node.isRoot || !node.pid) {
      root = treeNode;
    } else {
      const parent = map.get(node.pid);
      if (parent) {
        treeNode.parent = parent;
        parent.children.push(treeNode);
      }
    }
  }

  // Assign depth and totalChildren
  if (root) {
    const queue: TreeNode[] = [root];
    while (queue.length > 0) {
      const n = queue.shift()!;
      n.totalChildren = n.children.length;
      for (const c of n.children) {
        c.depth = n.depth + 1;
        queue.push(c);
      }
    }
  }

  return root;
}

export function flattenTree(root: TreeNode): MindNode[] {
  const result: MindNode[] = [];
  const queue: TreeNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node.data);
    for (const child of node.children) {
      queue.push(child);
    }
  }
  return result;
}

export function getVisibleTree(root: TreeNode): TreeNode {
  const clone: TreeNode = {
    data: root.data,
    children: [],
    parent: root.parent,
    depth: root.depth,
    totalChildren: root.totalChildren,
    layoutX: root.layoutX,
    layoutY: root.layoutY,
    subtreeHeight: root.subtreeHeight,
  };
  if (root.data.isExpand) {
    clone.children = root.children.map((c) => {
      const child = getVisibleTree(c);
      child.parent = clone;
      return child;
    });
  }
  return clone;
}
