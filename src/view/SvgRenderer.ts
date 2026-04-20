import { TreeNode, ViewportState } from "../types";
import { NODE_HEIGHT, NODE_BORDER_RADIUS } from "../constants";
import { getNodeWidth, measureTextWidth } from "../layout/TreeLayout";

const SVG_NS = "http://www.w3.org/2000/svg";

export class SvgRenderer {
  private svg: SVGSVGElement;
  private wrapper: SVGGElement;
  private linesGroup: SVGGElement;
  private nodesGroup: SVGGElement;
  private fontSize: number;

  onNodeClick: ((nodeId: string) => void) | null = null;
  onNodeDblClick: ((nodeId: string) => void) | null = null;
  onNodeContextMenu: ((nodeId: string, event: MouseEvent) => void) | null = null;
  onExpandToggle: ((nodeId: string) => void) | null = null;
  onBackgroundClick: (() => void) | null = null;

  constructor(container: HTMLElement, fontSize: number = 16) {
    this.fontSize = fontSize;
    this.svg = document.createElementNS(SVG_NS, "svg");
    this.svg.classList.add("mindmap-svg");
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", "100%");

    this.wrapper = document.createElementNS(SVG_NS, "g");
    this.linesGroup = document.createElementNS(SVG_NS, "g");
    this.nodesGroup = document.createElementNS(SVG_NS, "g");
    this.wrapper.appendChild(this.linesGroup);
    this.wrapper.appendChild(this.nodesGroup);
    this.svg.appendChild(this.wrapper);
    container.appendChild(this.svg);

    this.svg.addEventListener("click", (e) => {
      const target = e.target as Element;
      if (!target.closest(".mindmap-node") && !target.closest(".mindmap-expand-btn")) {
        this.onBackgroundClick?.();
      }
    });
  }

  getSvgElement(): SVGSVGElement {
    return this.svg;
  }

  applyViewport(viewport: ViewportState): void {
    this.wrapper.setAttribute(
      "transform",
      `translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.scale})`
    );
  }

  render(root: TreeNode, selectedId: string | null): void {
    this.linesGroup.innerHTML = "";
    this.nodesGroup.innerHTML = "";
    this.renderNode(root, selectedId);
  }

  private renderNode(node: TreeNode, selectedId: string | null): void {
    const hasMark = !!node.data.mark;
    const nodeWidth = getNodeWidth(node.data.text, this.fontSize, hasMark);
    const x = node.layoutX;
    const y = node.layoutY - NODE_HEIGHT / 2;
    const isSelected = node.data.id === selectedId;
    const depth = node.depth;

    const g = document.createElementNS(SVG_NS, "g");
    g.classList.add("mindmap-node");
    if (isSelected) g.classList.add("selected");
    g.setAttribute("data-node-id", node.data.id);

    if (depth <= 1) {
      // Root (depth 0) and level-1 nodes: rectangle with border
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(nodeWidth));
      rect.setAttribute("height", String(NODE_HEIGHT));
      rect.setAttribute("rx", String(NODE_BORDER_RADIUS));
      rect.setAttribute("ry", String(NODE_BORDER_RADIUS));
      rect.classList.add("mindmap-node-rect");
      if (depth === 0) {
        rect.classList.add("root-node");
      } else {
        rect.classList.add("level1-node");
        if (node.data.stroke) {
          rect.style.stroke = node.data.stroke;
        }
      }
      g.appendChild(rect);
    } else {
      // Depth 2+: invisible hit area, visible when selected
      const hitRect = document.createElementNS(SVG_NS, "rect");
      hitRect.setAttribute("x", String(x));
      hitRect.setAttribute("y", String(y));
      hitRect.setAttribute("width", String(nodeWidth));
      hitRect.setAttribute("height", String(NODE_HEIGHT));
      hitRect.classList.add("mindmap-node-rect", "leaf-node");
      hitRect.style.fill = "transparent";
      hitRect.style.pointerEvents = "all";
      g.appendChild(hitRect);
    }

    // Text centered in the base width (excluding mark space)
    const baseWidth = hasMark ? nodeWidth - 20 : nodeWidth;
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(x + baseWidth / 2));
    text.setAttribute("y", String(node.layoutY));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.classList.add("mindmap-node-text");
    if (depth === 0) text.classList.add("root-node-text");
    text.textContent = node.data.text;
    g.appendChild(text);

    // Mark icon (✅ or ❌) right after text
    if (node.data.mark) {
      const textW = measureTextWidth(node.data.text, 14);
      const textCenterX = x + baseWidth / 2;
      const markX = textCenterX + textW / 2 + 5;
      const markText = document.createElementNS(SVG_NS, "text");
      markText.setAttribute("x", String(markX));
      markText.setAttribute("y", String(node.layoutY));
      markText.setAttribute("text-anchor", "start");
      markText.setAttribute("dominant-baseline", "central");
      markText.classList.add("mindmap-mark");
      markText.classList.add(node.data.mark === "check" ? "mindmap-mark-check" : "mindmap-mark-cross");
      markText.textContent = node.data.mark === "check" ? "\u2705" : "\u274C";
      g.appendChild(markText);
    }

    // Expand/collapse button: show when has visible children OR has hidden children (collapsed)
    if (node.children.length > 0 || node.totalChildren > 0) {
      const btnX = x + nodeWidth;
      const btnY = node.layoutY;
      const btn = document.createElementNS(SVG_NS, "g");
      btn.classList.add("mindmap-expand-btn");
      btn.setAttribute("data-expand-id", node.data.id);

      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", String(btnX));
      circle.setAttribute("cy", String(btnY));
      circle.setAttribute("r", "8");
      btn.appendChild(circle);

      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", String(btnX));
      label.setAttribute("y", String(btnY));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "central");
      label.classList.add("mindmap-expand-text");
      label.textContent = node.data.isExpand ? "\u2212" : "+";
      btn.appendChild(label);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.onExpandToggle?.(node.data.id);
      });

      g.appendChild(btn);
    }

    // Event handlers
    g.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onNodeClick?.(node.data.id);
    });
    g.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      this.onNodeDblClick?.(node.data.id);
    });
    g.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onNodeContextMenu?.(node.data.id, e);
    });

    this.nodesGroup.appendChild(g);

    // Render children and lines
    if (node.data.isExpand) {
      for (const child of node.children) {
        this.drawLine(node, child, nodeWidth);
        this.renderNode(child, selectedId);
      }
    }
  }

  private drawLine(parent: TreeNode, child: TreeNode, parentWidth: number): void {
    const startX = parent.layoutX + parentWidth;
    const startY = parent.layoutY;
    const endX = child.layoutX;
    const endY = child.layoutY;
    const midX = startX + (endX - startX) / 2;

    const polyline = document.createElementNS(SVG_NS, "polyline");
    polyline.setAttribute(
      "points",
      `${startX},${startY} ${midX},${startY} ${midX},${endY} ${endX},${endY}`
    );
    polyline.classList.add("mindmap-line");
    if (child.data.stroke) {
      polyline.style.stroke = child.data.stroke;
    }
    this.linesGroup.appendChild(polyline);
  }


  getNodeScreenRect(
    nodeId: string,
    _viewport: ViewportState
  ): { x: number; y: number; width: number; height: number } | null {
    const el = this.nodesGroup.querySelector(
      `[data-node-id="${nodeId}"] rect`
    ) as SVGRectElement | null;
    if (!el) return null;
    const bbox = el.getBoundingClientRect();
    return {
      x: bbox.left,
      y: bbox.top,
      width: bbox.width,
      height: bbox.height,
    };
  }
}
