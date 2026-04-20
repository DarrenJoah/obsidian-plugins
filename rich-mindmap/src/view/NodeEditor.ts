export class NodeEditor {
  private input: HTMLTextAreaElement | null = null;
  private onCommit: ((text: string) => void) | null = null;
  private committed = false;

  isEditing(): boolean {
    return this.input !== null;
  }

  startEdit(
    screenRect: { x: number; y: number; width: number; height: number },
    currentText: string,
    container: HTMLElement,
    onCommit: (text: string) => void
  ): void {
    this.commitAndClose();
    this.onCommit = onCommit;
    this.committed = false;

    const textarea = document.createElement("textarea");
    textarea.value = currentText;
    textarea.classList.add("mindmap-text-input");

    const containerRect = container.getBoundingClientRect();
    textarea.style.position = "absolute";
    textarea.style.left = `${screenRect.x - containerRect.left}px`;
    textarea.style.top = `${screenRect.y - containerRect.top}px`;
    textarea.style.width = `${Math.max(screenRect.width, 120)}px`;
    textarea.style.minHeight = `${screenRect.height}px`;
    textarea.style.fontSize = "14px";
    textarea.style.lineHeight = "20px";
    textarea.style.zIndex = "100";
    textarea.style.resize = "none";

    container.appendChild(textarea);
    this.input = textarea;

    textarea.focus();
    textarea.select();

    textarea.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.commitAndClose();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.cancelEdit();
      }
    });

    const onMouseDown = (e: MouseEvent) => {
      if (e.target !== textarea) {
        document.removeEventListener("mousedown", onMouseDown, true);
        this.commitAndClose();
      }
    };
    document.addEventListener("mousedown", onMouseDown, true);
  }

  commitAndClose(): void {
    if (this.committed || !this.input) return;
    this.committed = true;
    const text = this.input.value.trim();
    const cb = this.onCommit;
    this.cleanup();
    if (text && cb) {
      cb(text);
    }
  }

  cancelEdit(): void {
    this.committed = true;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.input && this.input.parentElement) {
      this.input.parentElement.removeChild(this.input);
    }
    this.input = null;
    this.onCommit = null;
  }
}
