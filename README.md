# Obsidian 插件

自用 Obsidian 插件集合。

## 插件

### [Rich Mindmap](./rich-mindmap/)

一个免费的思维导图插件，支持树状渲染，兼容 Markmind JSON 格式。

**功能：**
- 使用 SVG 渲染树状布局
- 支持节点新增、编辑、删除、拖拽
- 支持节点标记为对号或叉号，可通过快捷键 `v` / `x` 或右键菜单操作
- 支持 `Shift+Enter` 多行编辑
- 支持叶子节点点击选中，并显示选中状态
- 支持 `Cmd+Z` 撤销，最多保留 50 步快照

**安装：**
1. 将 `rich-mindmap/` 复制到你的 Obsidian 仓库 `.obsidian/plugins/` 目录下
2. 在 `rich-mindmap/` 目录中执行 `npm install && npm run build`
3. 在 Obsidian 设置 → 第三方插件中启用插件

**使用：**
| 快捷键 | 操作 |
|---|---|
| `v` | 切换选中节点的对号标记 |
| `x` | 切换选中节点的叉号标记 |
| `Enter` | 确认编辑 |
| `Shift+Enter` | 编辑时换行 |
| `Cmd+Z` | 撤销 |
| `Esc` | 取消编辑 |

### [Daily Diary Template](./daily-diary-template/)

一个快速插入日记模板的插件，会自动生成当前日期、星期和时间，并插入预设的日记条目。

**功能：**
- 一键插入当天日记模板
- 自动生成当前日期、星期和时间
- 默认包含 `工作`、`技能提升`、`今日新知`、`读书`、`生活` 等条目
- 支持自定义日记条目
- 支持指定哪些条目需要自动生成子列表
- 子列表支持无序列表和有序列表两种格式
- 默认快捷键为 `Cmd/Ctrl + Shift + K`

**安装：**
1. 将 `daily-diary-template/` 复制到你的 Obsidian 仓库 `.obsidian/plugins/` 目录下
2. 在 Obsidian 设置 → 第三方插件中启用插件
3. 可在 Obsidian 设置 → Daily Diary Template 中修改插件配置

**使用：**
- 在命令面板中执行 `Insert Daily Diary Template`
- 或使用默认快捷键 `Cmd/Ctrl + Shift + K`
