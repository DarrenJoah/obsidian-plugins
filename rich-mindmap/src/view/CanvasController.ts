import { ViewportState } from "../types";

export class CanvasController {
  viewport: ViewportState = { panX: 0, panY: 0, scale: 1 };
  private svgEl: SVGSVGElement | null = null;
  private onUpdate: (() => void) | null = null;
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;

  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: () => void;
  private boundWheel: (e: WheelEvent) => void;

  constructor() {
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundWheel = this.onWheel.bind(this);
  }

  attach(svgEl: SVGSVGElement, onUpdate: () => void): void {
    this.svgEl = svgEl;
    this.onUpdate = onUpdate;
    svgEl.addEventListener("mousedown", this.boundMouseDown);
    window.addEventListener("mousemove", this.boundMouseMove);
    window.addEventListener("mouseup", this.boundMouseUp);
    svgEl.addEventListener("wheel", this.boundWheel, { passive: false });
  }

  detach(): void {
    if (!this.svgEl) return;
    this.svgEl.removeEventListener("mousedown", this.boundMouseDown);
    window.removeEventListener("mousemove", this.boundMouseMove);
    window.removeEventListener("mouseup", this.boundMouseUp);
    this.svgEl.removeEventListener("wheel", this.boundWheel);
    this.svgEl = null;
  }

  centerOn(x: number, y: number): void {
    if (!this.svgEl) return;
    const rect = this.svgEl.getBoundingClientRect();
    this.viewport.panX = rect.width / 2 - x * this.viewport.scale;
    this.viewport.panY = rect.height / 2 - y * this.viewport.scale;
    this.onUpdate?.();
  }

  fitToView(rootX: number, rootY: number): void {
    this.viewport.scale = 1;
    this.centerOn(rootX, rootY);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const target = e.target as Element;
    if (target.closest(".mindmap-node") || target.closest(".mindmap-expand-btn"))
      return;
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    e.preventDefault();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.viewport.panX += dx;
    this.viewport.panY += dy;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.onUpdate?.();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (!this.svgEl) return;

    const rect = this.svgEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldScale = this.viewport.scale;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.2, Math.min(3, oldScale + delta));

    const worldX = (mouseX - this.viewport.panX) / oldScale;
    const worldY = (mouseY - this.viewport.panY) / oldScale;

    this.viewport.scale = newScale;
    this.viewport.panX = mouseX - worldX * newScale;
    this.viewport.panY = mouseY - worldY * newScale;

    this.onUpdate?.();
  }
}
