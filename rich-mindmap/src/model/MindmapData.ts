import { MindNode, MindmapFile } from "../types";
import { extractJson, buildMarkdown } from "../util/parse";
import { generateId } from "../util/id";
import { assignBranchColor } from "../util/color";

export class MindmapData {
  file: MindmapFile;
  private frontmatterValue: string;
  private undoStack: string[] = [];
  private static MAX_UNDO = 50;

  constructor(file: MindmapFile, frontmatterValue?: string) {
    this.file = file;
    this.frontmatterValue = frontmatterValue || "rich-free";
  }

  static fromMarkdown(content: string): MindmapData | null {
    const file = extractJson(content);
    if (!file) return null;
    const fmMatch = content.match(/mindmap-plugin:\s*(\S+)/);
    const fmVal = fmMatch ? fmMatch[1] : "rich-free";
    return new MindmapData(file, fmVal);
  }

  static createEmpty(): MindmapData {
    const rootNode: MindNode = {
      id: generateId(),
      text: "Central Topic",
      isRoot: true,
      main: true,
      x: 4000,
      y: 4000,
      isExpand: true,
      layout: { layoutName: "mindmap2", direct: "right" },
      stroke: "",
      style: {},
    };
    const file: MindmapFile = {
      theme: "",
      mindData: [[rootNode]],
      induceData: [],
      wireFrameData: [],
      relateLinkData: [],
      calloutData: [],
      opt: { background: "transparent", fontFamily: "", fontSize: 16 },
    };
    return new MindmapData(file);
  }

  toMarkdown(): string {
    return buildMarkdown(this.file, this.frontmatterValue);
  }

  getNodes(): MindNode[] {
    return this.file.mindData[0] || [];
  }

  getNode(id: string): MindNode | undefined {
    return this.getNodes().find((n) => n.id === id);
  }

  getChildren(parentId: string): MindNode[] {
    return this.getNodes().filter((n) => n.pid === parentId);
  }

  pushUndo(): void {
    const snapshot = JSON.stringify(this.file.mindData[0]);
    this.undoStack.push(snapshot);
    if (this.undoStack.length > MindmapData.MAX_UNDO) {
      this.undoStack.shift();
    }
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    const snapshot = this.undoStack.pop()!;
    this.file.mindData[0] = JSON.parse(snapshot);
    return true;
  }

  addChild(parentId: string, text: string): MindNode {
    this.pushUndo();
    const parent = this.getNode(parentId);
    const siblings = this.getChildren(parentId);
    const parentColor = parent?.stroke || "";
    const rootChildren = this.getChildren(
      this.getNodes().find((n) => n.isRoot)?.id || ""
    );
    const colorIndex = parent?.isRoot
      ? rootChildren.length
      : 0;

    const color = parent?.isRoot
      ? assignBranchColor("", colorIndex)
      : parentColor;

    const node: MindNode = {
      id: generateId(),
      text,
      x: 0,
      y: 0,
      isExpand: true,
      layout: null,
      stroke: color,
      style: {},
      pid: parentId,
    };
    this.file.mindData[0].push(node);

    if (parent && !parent.isExpand) {
      parent.isExpand = true;
    }

    return node;
  }

  addSibling(nodeId: string, text: string): MindNode | null {
    const node = this.getNode(nodeId);
    if (!node || node.isRoot || !node.pid) return null;
    return this.addChild(node.pid, text);
  }

  moveNode(nodeId: string, direction: "up" | "down"): boolean {
    const node = this.getNode(nodeId);
    if (!node || node.isRoot || !node.pid) return false;

    const siblings = this.getChildren(node.pid);
    const siblingIndex = siblings.findIndex((sibling) => sibling.id === nodeId);
    const targetSiblingIndex = direction === "up"
      ? siblingIndex - 1
      : siblingIndex + 1;
    return this.moveNodeToIndex(nodeId, targetSiblingIndex);
  }

  moveNodeToIndex(nodeId: string, targetSiblingIndex: number): boolean {
    const node = this.getNode(nodeId);
    if (!node || node.isRoot || !node.pid) return false;

    const siblings = this.getChildren(node.pid);
    const siblingIndex = siblings.findIndex((sibling) => sibling.id === nodeId);
    if (
      siblingIndex < 0 ||
      targetSiblingIndex < 0 ||
      targetSiblingIndex >= siblings.length ||
      targetSiblingIndex === siblingIndex
    ) return false;

    const nodes = this.getNodes();
    const siblingNodeIndices = siblings.map((sibling) =>
      nodes.findIndex((item) => item.id === sibling.id)
    );
    if (siblingNodeIndices.some((index) => index < 0)) return false;

    const reorderedSiblings = [...siblings];
    const [movedNode] = reorderedSiblings.splice(siblingIndex, 1);
    reorderedSiblings.splice(targetSiblingIndex, 0, movedNode);

    this.pushUndo();
    siblingNodeIndices.forEach((nodeIndex, index) => {
      nodes[nodeIndex] = reorderedSiblings[index];
    });
    return true;
  }

  deleteNode(nodeId: string): void {
    this.pushUndo();
    const node = this.getNode(nodeId);
    if (!node || node.isRoot) return;

    const toDelete = new Set<string>();
    const collectDescendants = (id: string) => {
      toDelete.add(id);
      this.getChildren(id).forEach((c) => collectDescendants(c.id));
    };
    collectDescendants(nodeId);

    this.file.mindData[0] = this.file.mindData[0].filter(
      (n) => !toDelete.has(n.id)
    );
  }

  updateText(nodeId: string, text: string): void {
    const node = this.getNode(nodeId);
    if (node && node.text !== text) {
      this.pushUndo();
      node.text = text;
    }
  }

  toggleExpand(nodeId: string): void {
    this.pushUndo();
    const node = this.getNode(nodeId);
    if (node) node.isExpand = !node.isExpand;
  }

  toggleMark(nodeId: string, kind: "check" | "cross"): void {
    this.pushUndo();
    const node = this.getNode(nodeId);
    if (node) node.mark = node.mark === kind ? null : kind;
  }
}
