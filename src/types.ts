export interface MindNode {
  id: string;
  text: string;
  isRoot?: boolean;
  main?: boolean;
  x: number;
  y: number;
  isExpand: boolean;
  layout: { layoutName: string; direct: string } | null;
  stroke: string;
  style: Record<string, string>;
  pid?: string;
  mark?: "check" | "cross" | null;
}

export interface MindmapOptions {
  background: string;
  fontFamily: string;
  fontSize: number;
}

export interface MindmapFile {
  theme: string;
  mindData: MindNode[][];
  induceData: unknown[];
  wireFrameData: unknown[];
  relateLinkData: unknown[];
  calloutData: unknown[];
  opt: MindmapOptions;
  scrollLeft?: number;
  scrollTop?: number;
  transformOrigin?: [number, number];
}

export interface TreeNode {
  data: MindNode;
  children: TreeNode[];
  parent: TreeNode | null;
  depth: number;
  totalChildren: number;
  layoutX: number;
  layoutY: number;
  subtreeHeight: number;
}

export interface ViewportState {
  panX: number;
  panY: number;
  scale: number;
}
