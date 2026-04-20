import { Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_RICH_MINDMAP } from "./constants";
import { MindmapView } from "./view/MindmapView";
import { MindmapData } from "./model/MindmapData";
import { hasMindmapFrontmatter } from "./util/parse";

export default class RichMindmapPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE_RICH_MINDMAP, (leaf) => new MindmapView(leaf));

    this.addCommand({
      id: "create-new-mindmap",
      name: "Create new mindmap",
      callback: async () => {
        const data = MindmapData.createEmpty();
        const file = await this.app.vault.create(
          `Mindmap ${Date.now()}.md`,
          data.toMarkdown()
        );
        await this.openMindmapFile(file);
      },
    });

    this.addCommand({
      id: "open-as-mindmap",
      name: "Open current file as mindmap",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (checking) return true;
        this.openMindmapFile(file);
        return true;
      },
    });

    this.registerEvent(
      this.app.workspace.on("file-open", async (file) => {
        if (!file || file.extension !== "md") return;
        const content = await this.app.vault.read(file);
        if (hasMindmapFrontmatter(content)) {
          const leaf = this.app.workspace.getActiveViewOfType(MindmapView);
          if (!leaf) {
            await this.openMindmapFile(file);
          }
        }
      })
    );
  }

  private async openMindmapFile(file: TFile): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_RICH_MINDMAP);
    let leaf: WorkspaceLeaf;

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      const activeLeaf = this.app.workspace.getLeaf(false);
      if (activeLeaf) {
        leaf = activeLeaf;
      } else {
        leaf = this.app.workspace.getLeaf(true);
      }
    }

    await leaf.setViewState({
      type: VIEW_TYPE_RICH_MINDMAP,
      active: true,
    });

    const view = leaf.view as MindmapView;
    if (view && view.getViewType() === VIEW_TYPE_RICH_MINDMAP) {
      await view.loadFile(file);
    }

    this.app.workspace.revealLeaf(leaf);
  }

  onunload(): void {}
}
