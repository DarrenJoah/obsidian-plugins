import { TreeNode } from "../types";
import { NODE_HEIGHT, NODE_MIN_WIDTH, NODE_PADDING_H, H_GAP, V_GAP, ROOT_X, ROOT_Y } from "../constants";

let measureCanvas: HTMLCanvasElement | null = null;

export function measureTextWidth(text: string, fontSize: number): number {
  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas");
  }
  const ctx = measureCanvas.getContext("2d")!;
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  return ctx.measureText(text).width;
}

const MARK_WIDTH = 20;

export function getNodeWidth(text: string, fontSize: number = 16, hasMark = false): number {
  const textWidth = measureTextWidth(text, fontSize);
  const base = Math.max(NODE_MIN_WIDTH, textWidth + NODE_PADDING_H * 2);
  return hasMark ? base + MARK_WIDTH : base;
}

function computeSubtreeHeight(node: TreeNode, fontSize: number): void {
  if (node.children.length === 0 || !node.data.isExpand) {
    node.subtreeHeight = NODE_HEIGHT;
    return;
  }
  for (const child of node.children) {
    computeSubtreeHeight(child, fontSize);
  }
  const totalChildrenHeight =
    node.children.reduce((sum, c) => sum + c.subtreeHeight, 0) +
    V_GAP * (node.children.length - 1);
  node.subtreeHeight = Math.max(NODE_HEIGHT, totalChildrenHeight);
}

function assignPositions(
  node: TreeNode,
  x: number,
  yCenter: number,
  fontSize: number
): void {
  node.layoutX = x;
  node.layoutY = yCenter;

  if (node.children.length === 0 || !node.data.isExpand) return;

  const nodeWidth = getNodeWidth(node.data.text, fontSize, !!node.data.mark);
  const childX = x + nodeWidth + H_GAP;

  const totalChildrenHeight =
    node.children.reduce((sum, c) => sum + c.subtreeHeight, 0) +
    V_GAP * (node.children.length - 1);

  let currentY = yCenter - totalChildrenHeight / 2;

  for (const child of node.children) {
    const childCenter = currentY + child.subtreeHeight / 2;
    assignPositions(child, childX, childCenter, fontSize);
    currentY += child.subtreeHeight + V_GAP;
  }
}

export function layoutTree(root: TreeNode, fontSize: number = 16): void {
  computeSubtreeHeight(root, fontSize);
  assignPositions(root, ROOT_X, ROOT_Y, fontSize);
}
