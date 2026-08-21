import { Plugin, TFile } from "obsidian";
import { VIEW_TYPE_RICH_MINDMAP } from "./constants";
import { MindmapView } from "./view/MindmapView";
import { MindmapData } from "./model/MindmapData";
import { hasMindmapFrontmatter } from "./util/parse";

export default class RichMindmapPlugin extends Plugin {
  private fileOpenGeneration = 0;

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
        const generation = ++this.fileOpenGeneration;
        if (!file || file.extension !== "md") return;
        const content = await this.app.vault.read(file);
        if (generation !== this.fileOpenGeneration) return;
        if (hasMindmapFrontmatter(content)) {
          const leaf = this.app.workspace.getActiveViewOfType(MindmapView);
          if (!leaf && this.app.workspace.getActiveFile()?.path === file.path) {
            await this.openMindmapFile(file);
          }
        }
      })
    );
  }

  private async openMindmapFile(file: TFile): Promise<void> {
    const activeLeaf = this.app.workspace.getLeaf(false);
    const leaf = activeLeaf ?? this.app.workspace.getLeaf(true);

    await leaf.setViewState({
      type: VIEW_TYPE_RICH_MINDMAP,
      active: true,
      state: {
        version: 1,
        file: file.path,
      },
    });

    this.app.workspace.revealLeaf(leaf);
  }

  onunload(): void {}
}
