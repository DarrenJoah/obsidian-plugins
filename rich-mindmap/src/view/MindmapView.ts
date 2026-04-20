import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_RICH_MINDMAP } from "../constants";
import { TreeNode } from "../types";
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
  }

  async loadFile(file: TFile): Promise<void> {
    this.file = file;
    const content = await this.app.vault.read(file);
    this.data = MindmapData.fromMarkdown(content);
    if (!this.data) {
      this.container?.setText("Failed to parse mindmap data.");
      return;
    }

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
        this.applyViewport();
      });
    }

    this.rebuildAndRender();

    if (this.tree) {
      this.canvas.fitToView(this.tree.layoutX, this.tree.layoutY);
      this.applyViewport();
    }

    this.setupKeyboard();
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
    this.applyViewport();
  }

  private applyViewport(): void {
    this.renderer?.applyViewport(this.canvas.viewport);
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
    this.canvas.detach();
    this.editor.cancelEdit();
  }
}
