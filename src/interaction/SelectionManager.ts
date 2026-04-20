export class SelectionManager {
  selectedNodeId: string | null = null;

  select(nodeId: string): void {
    this.selectedNodeId = nodeId;
  }

  deselect(): void {
    this.selectedNodeId = null;
  }

  isSelected(nodeId: string): boolean {
    return this.selectedNodeId === nodeId;
  }
}
