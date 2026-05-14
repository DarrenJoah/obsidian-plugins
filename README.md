# Obsidian Plugins

Self-developed Obsidian plugins.

## Plugins

### [Rich Mindmap](./rich-mindmap/)

A free mindmap plugin with tree-style rendering, compatible with Markmind JSON format.

**Features:**
- Tree layout with SVG rendering
- Node add / edit / delete / drag
- Node marking: checkmark or cross (keyboard `v` / `x`, or right-click menu)
- Shift+Enter for multiline editing
- Leaf node click selection with visual feedback
- Cmd+Z undo (snapshot-based, up to 50 steps)

**Install:**
1. Copy `rich-mindmap/` into your vault's `.obsidian/plugins/` directory
2. Run `npm install && npm run build` in the `rich-mindmap/` directory
3. Enable the plugin in Obsidian Settings → Community plugins

**Usage:**
| Shortcut | Action |
|---|---|
| `v` | Toggle checkmark on selected node |
| `x` | Toggle cross on selected node |
| `Enter` | Confirm edit |
| `Shift+Enter` | New line in edit |
| `Cmd+Z` | Undo |
| `Esc` | Cancel edit |

### [Daily Diary Template](./daily-diary-template/)

Generate a daily diary template with an image placeholder and current time.
