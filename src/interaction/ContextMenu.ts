import { Menu } from "obsidian";

export interface ContextMenuCallbacks {
  onAddChild: () => void;
  onAddSibling: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleExpand: () => void;
  onToggleCheck: () => void;
  onToggleCross: () => void;
}

export function showContextMenu(
  event: MouseEvent,
  isRoot: boolean,
  hasChildren: boolean,
  currentMark: "check" | "cross" | null | undefined,
  callbacks: ContextMenuCallbacks
): void {
  const menu = new Menu();

  menu.addItem((item) =>
    item.setTitle("Add child node").setIcon("plus").onClick(callbacks.onAddChild)
  );

  if (!isRoot) {
    menu.addItem((item) =>
      item
        .setTitle("Add sibling node")
        .setIcon("list-plus")
        .onClick(callbacks.onAddSibling)
    );
  }

  menu.addItem((item) =>
    item.setTitle("Edit text").setIcon("pencil").onClick(callbacks.onEdit)
  );

  menu.addSeparator();
  menu.addItem((item) =>
    item
      .setTitle(currentMark === "check" ? "Clear \u2705" : "Mark \u2705 done")
      .setIcon("check")
      .onClick(callbacks.onToggleCheck)
  );
  menu.addItem((item) =>
    item
      .setTitle(currentMark === "cross" ? "Clear \u274C" : "Mark \u274C cancelled")
      .setIcon("x")
      .onClick(callbacks.onToggleCross)
  );

  if (hasChildren) {
    menu.addItem((item) =>
      item
        .setTitle("Toggle expand")
        .setIcon("chevrons-right")
        .onClick(callbacks.onToggleExpand)
    );
  }

  if (!isRoot) {
    menu.addSeparator();
    menu.addItem((item) =>
      item.setTitle("Delete node").setIcon("trash").onClick(callbacks.onDelete)
    );
  }

  menu.showAtMouseEvent(event);
}
