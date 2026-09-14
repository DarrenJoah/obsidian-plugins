# Obsidian 插件开发约定

## 仓库与安装目录

- 源码仓库：`/Users/zhangchaocun/Obsidian/obsidian-plugins`
- Obsidian 插件安装目录：`/Users/zhangchaocun/Obsidian/Obsidian-Knowledge/.obsidian/plugins`
- 远程仓库：`git@github.com:DarrenJoah/obsidian-plugins.git`
- 默认分支：`main`

## rich-mindmap

- 源码目录：`/Users/zhangchaocun/Obsidian/obsidian-plugins/rich-mindmap`
- 安装目录：`/Users/zhangchaocun/Obsidian/Obsidian-Knowledge/.obsidian/plugins/rich-mindmap`
- 修改功能时编辑 `rich-mindmap/src/` 和相关样式，不要直接修改构建后的 `main.js`。
- 修改完成后在 `rich-mindmap` 目录执行 `npm ci`、`npx tsc --noEmit` 和 `npm run build`。
- 构建成功后，只将 `main.js`、`manifest.json`、`styles.css` 同步到安装目录。
- 验证后提交源码与构建产物，并推送到远程 `main`。
- 不要覆盖安装目录中的用户配置文件 `data.json`。

## 提交范围

- 只提交当前任务涉及的插件文件。
- 不提交安装目录中的第三方插件、用户配置或工作区状态。
- Code comments and commit messages must use English.
