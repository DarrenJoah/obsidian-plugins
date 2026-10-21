import { TreeNode } from "../types";
import { NODE_HEIGHT, NODE_MIN_WIDTH, NODE_PADDING_H, H_GAP, V_GAP, ROOT_X, ROOT_Y } from "../constants";

let measureCanvas: HTMLCanvasElement | null = null;
const NODE_MAX_LINE_LENGTH = 40;

export function measureTextWidth(text: string, fontSize: number): number {
  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas");
  }
  const ctx = measureCanvas.getContext("2d")!;
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  return Math.max(
    ...splitNodeLines(text).map((line) => ctx.measureText(line).width),
    0
  );
}

export function splitNodeLines(text: string): string[] {
  const lines: string[] = [];
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const characters = Array.from(line);
    if (characters.length === 0) {
      lines.push("");
      continue;
    }
    for (let start = 0; start < characters.length; start += NODE_MAX_LINE_LENGTH) {
      lines.push(characters.slice(start, start + NODE_MAX_LINE_LENGTH).join(""));
    }
  }
  return lines;
}

export function getNodeHeight(text: string): number {
  return Math.max(NODE_HEIGHT, splitNodeLines(text).length * 20 + 12);
}

const MARK_WIDTH = 20;

export function getNodeWidth(text: string, fontSize: number = 16, hasMark = false): number {
  const textWidth = measureTextWidth(text, fontSize);
  const base = Math.max(NODE_MIN_WIDTH, textWidth + NODE_PADDING_H * 2);
  return hasMark ? base + MARK_WIDTH : base;
}

function computeSubtreeHeight(node: TreeNode, fontSize: number): void {
  const nodeHeight = getNodeHeight(node.data.text);
  if (node.children.length === 0 || !node.data.isExpand) {
    node.subtreeHeight = nodeHeight;
    return;
  }
  for (const child of node.children) {
    computeSubtreeHeight(child, fontSize);
  }
  const totalChildrenHeight =
    node.children.reduce((sum, c) => sum + c.subtreeHeight, 0) +
    V_GAP * (node.children.length - 1);
  node.subtreeHeight = Math.max(nodeHeight, totalChildrenHeight);
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
