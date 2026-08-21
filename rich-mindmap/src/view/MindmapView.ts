import { ItemView, TFile, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_RICH_MINDMAP } from "../constants";
import { ContentBounds, MindmapViewState, TreeNode, ViewportState } from "../types";
import { MindmapData } from "../model/MindmapData";
import { buildTree, getVisibleTree } from "../model/NodeTree";
import { layoutTree } from "../layout/TreeLayout";
import { SvgRenderer } from "./SvgRenderer";
import { CanvasController } from "./CanvasController";
import { NodeEditor } from "./NodeEditor";
import { SelectionManager } from "../interaction/SelectionManager";
import { showContextMenu } from "../interaction/ContextMenu";

export class MindmapView extends ItemView {
  private data: MindmapData | null = null;
  private tree: TreeNode | null = null;
  private renderer: SvgRenderer | null = null;
  private canvas: CanvasController;
  private editor: NodeEditor;
  private selection: SelectionManager;
  private file: TFile | null = null;
  private container: HTMLElement | null = null;
  private saving = false;
  private keyboardSetup = false;
  private scrollbar: HTMLElement | null = null;
  private scrollbarSpacer: HTMLElement | null = null;
  private errorEl: HTMLElement | null = null;
  private contentBounds: ContentBounds | null = null;
  private pendingScrollbarTop: number | null = null;
  private pendingInitialFit = false;
  private loadGeneration = 0;

  private static readonly VIEW_STATE_VERSION = 1;
  private static readonly SCROLL_PADDING = 48;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.canvas = new CanvasController();
    this.editor = new NodeEditor();
    this.selection = new SelectionManager();
  }

  getViewType(): string {
    return VIEW_TYPE_RICH_MINDMAP;
  }

  getDisplayText(): string {
    return this.file?.basename ?? "Mindmap";
  }

  getIcon(): string {
    return "git-branch";
  }

  async onOpen(): Promise<void> {
    this.container = this.contentEl;
    this.container.empty();
    this.container.classList.add("mindmap-container");
    this.errorEl = this.container.createDiv({ cls: "mindmap-error" });
    this.errorEl.hide();

    this.scrollbar = this.container.createDiv({
      cls: "mindmap-scrollbar is-hidden",
    });
    this.scrollbarSpacer = this.scrollbar.createDiv({
      cls: "mindmap-scrollbar-spacer",
    });
    this.scrollbar.addEventListener("scroll", this.handleScrollbarScroll);
  }

  getState(): Record<string, unknown> {
    if (!this.file) return {};
    const state: MindmapViewState = {
      version: MindmapView.VIEW_STATE_VERSION,
      file: this.file.path,
      viewport: this.canvas.getViewport(),
    };
    return state as unknown as Record<string, unknown>;
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    await super.setState(state, result);
    const parsed = this.parseViewState(state);
    if (!parsed) return;

    const file = this.app.vault.getAbstractFileByPath(parsed.file);
    if (!(file instanceof TFile)) {
      this.showError(`Mindmap file not found: ${parsed.file}`);
      return;
    }

    await this.loadFile(file, parsed.viewport);
  }

  async loadFile(file: TFile, restoredViewport?: ViewportState): Promise<void> {
    const generation = ++this.loadGeneration;
    const sameFile = this.file?.path === file.path;
    const previousViewport = sameFile ? this.canvas.getViewport() : null;
    const content = await this.app.vault.read(file);
    if (generation !== this.loadGeneration) return;

    const data = MindmapData.fromMarkdown(content);
    if (!data) {
      this.showError("Failed to parse mindmap data.");
      return;
    }

    this.errorEl?.hide();
    this.file = file;
    this.data = data;

    if (!this.renderer) {
      this.renderer = new SvgRenderer(
        this.container!,
        this.data.file.opt.fontSize || 16
      );
      this.setupRendererCallbacks();
      this.canvas.attach(this.renderer.getSvgElement(), () => {
        if (this.editor.isEditing()) {
          this.editor.commitAndClose();
        }
        this.applyViewport(true);
      });
    }

    this.rebuildAndRender();

    const viewport = restoredViewport ?? previousViewport;
    if (viewport && this.canvas.setViewport(viewport, false)) {
      this.pendingInitialFit = false;
      this.applyViewport(false);
    } else if (!this.tryInitialFit()) {
      this.pendingInitialFit = true;
    }

    this.setupKeyboard();
    this.app.workspace.requestSaveLayout();
  }

  private showError(message: string): void {
    if (!this.errorEl) return;
    this.errorEl.setText(message);
    this.errorEl.show();
  }

  private setupRendererCallbacks(): void {
    if (!this.renderer) return;

    this.renderer.onNodeClick = (id) => {
      if (this.editor.isEditing()) {
        this.editor.commitAndClose();
      }
      this.selection.select(id);
      this.renderSvg();
    };

    this.renderer.onNodeDblClick = (id) => {
      this.startEditNode(id);
    };

    this.renderer.onNodeContextMenu = (id, event) => {
      this.selection.select(id);
      this.renderSvg();
      this.showNodeMenu(id, event);
    };

    this.renderer.onExpandToggle = (id) => {
      this.data?.toggleExpand(id);
      this.rebuildAndRender();
      this.save();
    };

    this.renderer.onBackgroundClick = () => {
      // commitAndClose already triggers rebuildAndRender via callback,
      // so just deselect without extra renderSvg
      if (this.editor.isEditing()) return;
      this.selection.deselect();
      this.renderSvg();
    };
  }

  private rebuildAndRender(): void {
    if (!this.data) return;
    const nodes = this.data.getNodes();
    const fullTree = buildTree(nodes);
    if (!fullTree) return;
    this.tree = getVisibleTree(fullTree);
    layoutTree(this.tree, this.data.file.opt.fontSize || 16);
    this.renderSvg();
  }

  private renderSvg(): void {
    if (!this.renderer || !this.tree) return;
    this.renderer.render(this.tree, this.selection.selectedNodeId);
    this.contentBounds = this.renderer.getContentBounds();
    this.applyViewport(false);
  }

  private applyViewport(requestSave = false): void {
    this.clampVerticalViewport();
    this.renderer?.applyViewport(this.canvas.viewport);
    this.updateScrollbar();
    if (requestSave) this.app.workspace.requestSaveLayout();
  }

  private clampVerticalViewport(): void {
    if (!this.contentBounds) return;
    const range = this.getScrollRange();
    if (range.viewportHeight <= 0) return;
    const topPanY = this.getPanYForScrollTop(0, range);
    const bottomPanY = this.getPanYForScrollTop(range.maxScroll, range);
    const clamped = range.maxScroll > 0
      ? Math.max(bottomPanY, Math.min(topPanY, this.canvas.viewport.panY))
      : (range.viewportHeight - this.contentBounds.height * this.canvas.viewport.scale) / 2
        - this.contentBounds.y * this.canvas.viewport.scale;
    if (Math.abs(clamped - this.canvas.viewport.panY) >= 0.5) {
      this.canvas.setPanY(clamped, false);
    }
  }

  private tryInitialFit(): boolean {
    if (!this.tree || !this.renderer) return false;
    const svg = this.renderer.getSvgElement();
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    this.canvas.fitToView(this.tree.layoutX, this.tree.layoutY);
    this.pendingInitialFit = false;
    this.applyViewport(true);
    return true;
  }

  onResize(): void {
    if (this.pendingInitialFit && this.tryInitialFit()) return;
    this.applyViewport(false);
  }

  private parseViewState(state: unknown): MindmapViewState | null {
    if (!state || typeof state !== "object") return null;
    const value = state as Record<string, unknown>;
    if (value.version !== MindmapView.VIEW_STATE_VERSION || typeof value.file !== "string") {
      return null;
    }
    const viewport = value.viewport;
    return {
      version: MindmapView.VIEW_STATE_VERSION,
      file: value.file,
      viewport: CanvasController.isValidViewport(viewport) ? viewport : undefined,
    };
  }

  private handleScrollbarScroll = (): void => {
    if (!this.scrollbar || !this.contentBounds) return;
    if (
      this.pendingScrollbarTop !== null &&
      Math.abs(this.scrollbar.scrollTop - this.pendingScrollbarTop) < 0.5
    ) {
      this.pendingScrollbarTop = null;
      return;
    }
    this.pendingScrollbarTop = null;
    const range = this.getScrollRange();
    const panY = this.getPanYForScrollTop(this.scrollbar.scrollTop, range);
    if (Math.abs(panY - this.canvas.viewport.panY) < 0.5) return;
    this.canvas.setPanY(panY, false);
    this.applyViewport(true);
  };

  private getScrollRange(): { maxScroll: number; viewportHeight: number; padding: number } {
    const svg = this.renderer?.getSvgElement();
    const viewportHeight = svg?.getBoundingClientRect().height ?? 0;
    const padding = MindmapView.SCROLL_PADDING;
    const contentHeight = (this.contentBounds?.height ?? 0) * this.canvas.viewport.scale + padding * 2;
    return {
      maxScroll: Math.max(0, contentHeight - viewportHeight),
      viewportHeight,
      padding,
    };
  }

  private getPanYForScrollTop(scrollTop: number, range: { maxScroll: number; padding: number }): number {
    const clamped = Math.max(0, Math.min(range.maxScroll, scrollTop));
    return range.padding - (this.contentBounds?.y ?? 0) * this.canvas.viewport.scale - clamped;
  }

  private updateScrollbar(): void {
    if (!this.scrollbar || !this.scrollbarSpacer || !this.contentBounds) return;
    const range = this.getScrollRange();
    const shouldShow = range.maxScroll > 0 && range.viewportHeight > 0;
    this.scrollbar.classList.toggle("is-hidden", !shouldShow);
    if (!shouldShow) return;

    this.scrollbarSpacer.style.height = `${range.viewportHeight + range.maxScroll}px`;
    const scrollTop = range.padding - this.contentBounds.y * this.canvas.viewport.scale - this.canvas.viewport.panY;
    const clamped = Math.max(0, Math.min(range.maxScroll, scrollTop));
    if (Math.abs(this.scrollbar.scrollTop - clamped) < 0.5) return;
    this.pendingScrollbarTop = clamped;
    this.scrollbar.scrollTop = clamped;
  }

  private startEditNodeThenSelect(nodeId: string, selectAfter: string): void {
    if (!this.renderer || !this.data || !this.container) return;
    const node = this.data.getNode(nodeId);
    if (!node) return;
    const rect = this.renderer.getNodeScreenRect(nodeId, this.canvas.viewport);
    if (!rect) return;

    this.editor.startEdit(rect, node.text, this.container, (newText) => {
      this.data?.updateText(nodeId, newText);
      this.selection.select(selectAfter);
      this.rebuildAndRender();
      this.save();
      this.contentEl.focus();
    });
  }

  private startEditNode(nodeId: string): void {
    if (!this.renderer || !this.data || !this.container) return;
    const node = this.data.getNode(nodeId);
    if (!node) return;
    const rect = this.renderer.getNodeScreenRect(nodeId, this.canvas.viewport);
    if (!rect) return;

    this.editor.startEdit(rect, node.text, this.container, (newText) => {
      this.data?.updateText(nodeId, newText);
      this.rebuildAndRender();
      this.save();
      this.contentEl.focus();
    });
  }

  private showNodeMenu(nodeId: string, event: MouseEvent): void {
    if (!this.data) return;
    const node = this.data.getNode(nodeId);
    if (!node) return;
    const hasChildren = this.data.getChildren(nodeId).length > 0;

    showContextMenu(event, !!node.isRoot, hasChildren, node.mark ?? null, {
      onAddChild: () => {
        const child = this.data!.addChild(nodeId, "New node");
        this.rebuildAndRender();
        this.save();
        if (child) {
          this.selection.select(child.id);
          this.renderSvg();
          setTimeout(() => this.startEditNodeThenSelect(child.id, nodeId), 100);
        }
      },
      onAddSibling: () => {
        const sibling = this.data!.addSibling(nodeId, "New node");
        this.rebuildAndRender();
        this.save();
        if (sibling) {
          this.selection.select(sibling.id);
          this.renderSvg();
          setTimeout(() => this.startEditNode(sibling.id), 100);
        }
      },
      onEdit: () => this.startEditNode(nodeId),
      onDelete: () => {
        this.data!.deleteNode(nodeId);
        this.selection.deselect();
        this.rebuildAndRender();
        this.save();
      },
      onToggleExpand: () => {
        this.data!.toggleExpand(nodeId);
        this.rebuildAndRender();
        this.save();
      },
      onToggleCheck: () => {
        this.data!.toggleMark(nodeId, "check");
        this.rebuildAndRender();
        this.save();
      },
      onToggleCross: () => {
        this.data!.toggleMark(nodeId, "cross");
        this.rebuildAndRender();
        this.save();
      },
    });
  }

  private setupKeyboard(): void {
    if (this.keyboardSetup) return;
    this.keyboardSetup = true;
    this.contentEl.setAttribute("tabindex", "0");

    // Capture phase: undo works even when textarea is focused
    this.contentEl.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        e.stopPropagation();
        if (this.editor.isEditing()) this.editor.cancelEdit();
        if (this.data?.undo()) {
          this.selection.deselect();
          this.rebuildAndRender();
          this.save();
        }
      }
    }, true);

    this.contentEl.addEventListener("keydown", (e) => {
      // Ignore keyboard when editing text
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!this.data || !this.selection.selectedNodeId) return;
      const id = this.selection.selectedNodeId;

      switch (e.key) {
        case "Enter":
          e.preventDefault();
          e.stopPropagation();
          this.startEditNode(id);
          break;
        case "Tab": {
          e.preventDefault();
          e.stopPropagation();
          const parentId = id;
          const child = this.data.addChild(parentId, "New node");
          this.rebuildAndRender();
          this.save();
          if (child) {
            this.selection.select(child.id);
            this.renderSvg();
            setTimeout(() => {
              this.startEditNodeThenSelect(child.id, parentId);
            }, 150);
          }
          break;
        }
        case "Delete":
        case "Backspace":
          if (!this.data.getNode(id)?.isRoot) {
            e.preventDefault();
            e.stopPropagation();
            this.data.deleteNode(id);
            this.selection.deselect();
            this.rebuildAndRender();
            this.save();
          }
          break;
        case " ":
          e.preventDefault();
          e.stopPropagation();
          this.data.toggleExpand(id);
          this.rebuildAndRender();
          this.save();
          break;
        case "v":
          e.preventDefault();
          e.stopPropagation();
          this.data.toggleMark(id, "check");
          this.rebuildAndRender();
          this.save();
          break;
        case "x":
          e.preventDefault();
          e.stopPropagation();
          this.data.toggleMark(id, "cross");
          this.rebuildAndRender();
          this.save();
          break;
      }
    });
  }

  private async save(): Promise<void> {
    if (!this.data || !this.file || this.saving) return;
    this.saving = true;
    try {
      const markdown = this.data.toMarkdown();
      await this.app.vault.modify(this.file, markdown);
    } finally {
      this.saving = false;
    }
  }

  async onClose(): Promise<void> {
    this.loadGeneration++;
    this.scrollbar?.removeEventListener("scroll", this.handleScrollbarScroll);
    this.canvas.detach();
    this.editor.cancelEdit();
    this.scrollbar = null;
    this.scrollbarSpacer = null;
  }
}
