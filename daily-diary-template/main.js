"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");

const DEFAULT_SETTINGS = {
    templateItems: ['工作', '技能提升', '今日新知', '读书', '生活'],
    childListItems: ['工作', '技能提升', '今日新知', '读书', '生活'],
    subListStyle: 'unordered',
};

class DailyDiaryTemplatePlugin extends obsidian_1.Plugin {
    async onload() {
        await this.loadSettings();

        this.addCommand({
            id: 'insert-daily-diary-template',
            name: 'Insert Daily Diary Template',
            hotkeys: [
                {
                    modifiers: ['Shift', 'Mod'],
                    key: 'K',
                },
            ],
            editorCallback: async (editor) => {
                await this.insertTemplate(editor);
            },
            allowPreview: true,
        });

        this.addCommand({
            id: 'insert-diary-template-for-date',
            name: 'Insert Diary Template for Date',
            editorCallback: (editor) => {
                new DiaryDateModal(this.app, async (date) => {
                    await this.insertTemplate(editor, date);
                }).open();
            },
            allowPreview: true,
        });

        this.addCommand({
            id: 'insert-diary-template-for-pending-date',
            name: 'Insert Diary Template for Pending Date',
            editorCallback: async (editor) => {
                await this.insertTemplateForPendingDate(editor);
            },
            allowPreview: true,
        });

        this.addSettingTab(new DailyDiaryTemplateSettingTab(this.app, this));
    }

    async insertTemplate(editor, date = new Date()) {
        const template = this.buildTemplate(date);
        editor.replaceSelection(template);

        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            await this.app.vault.modify(activeFile, editor.getValue());
        }
    }

    async insertTemplateForPendingDate(editor) {
        const pendingDatePath = '.obsidian/plugins/daily-diary-template/pending-date.txt';
        let value;

        try {
            value = (await this.app.vault.adapter.read(pendingDatePath)).trim();
        } catch (error) {
            new obsidian_1.Notice('No pending diary date was provided.');
            return;
        }

        const date = this.parseDate(value);
        if (!date) {
            new obsidian_1.Notice('Pending diary date must use YYYY-MM-DD.');
            return;
        }

        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new obsidian_1.Notice('Open a diary file before inserting a pending date template.');
            return;
        }

        const content = await this.app.vault.read(activeFile);
        const template = this.buildTemplate(date);
        await this.app.vault.modify(
            activeFile,
            this.insertTemplateInDateOrder(content, template, this.formatDate(date)),
        );
        await this.app.vault.adapter.remove(pendingDatePath);
    }

    insertTemplateInDateOrder(content, template, targetDate) {
        const entryPattern = /^\*\*(\d{4}-\d{2}-\d{2})\b.*$/gm;
        let entry;

        while ((entry = entryPattern.exec(content)) !== null) {
            if (entry[1] < targetDate) {
                return `${content.slice(0, entry.index)}${template}${content.slice(entry.index)}`;
            }
        }

        return `${content}${content.endsWith('\n') ? '' : '\n'}${template}`;
    }

    buildTemplate(date) {
        const timeStr = this.formatTime(date);
        const dateStr = this.formatDate(date);
        const weekday = this.getWeekday(date);
        const itemLines = this.formatTemplateItems(this.getTemplateItems());

        return `**${dateStr} ${weekday} ${timeStr}**
${itemLines}

---

`;
    }

    parseDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!match) {
            return null;
        }

        const now = new Date();
        const date = new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            now.getHours(),
            now.getMinutes(),
        );

        return this.formatDate(date) === value ? date : null;
    }

    getTemplateItems() {
        if (!Array.isArray(this.settings.templateItems)) {
            return DEFAULT_SETTINGS.templateItems;
        }

        const items = this.settings.templateItems
            .map((item) => `${item}`.trim())
            .filter((item) => item.length > 0);

        return items.length > 0 ? items : DEFAULT_SETTINGS.templateItems;
    }

    formatTemplateItems(items) {
        const subItemPrefix = this.settings.subListStyle === 'ordered' ? '1.' : '-';
        const childListItems = new Set(this.getChildListItems());

        return items.map((item, index) => {
            const topLevelItem = `${index + 1}. ${item}`;
            if (!childListItems.has(item)) {
                return topLevelItem;
            }

            return `${topLevelItem}\n\t${subItemPrefix} `;
        }).join('\n');
    }

    getChildListItems() {
        if (!Array.isArray(this.settings.childListItems)) {
            return this.getTemplateItems();
        }

        return this.settings.childListItems
            .map((item) => `${item}`.trim())
            .filter((item) => item.length > 0);
    }

    formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getWeekday(date) {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return weekdays[date.getDay()];
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {}
}

class DiaryDateModal extends obsidian_1.Modal {
    constructor(app, onSubmit) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        this.contentEl.createEl('h2', { text: 'Insert Diary Template for Date' });
        const dateInput = this.contentEl.createEl('input', { type: 'date' });
        dateInput.value = formatDateForInput(new Date());
        dateInput.style.width = '100%';

        const actions = this.contentEl.createDiv({ cls: 'modal-button-container' });
        const insertButton = actions.createEl('button', { text: 'Insert', cls: 'mod-cta' });
        actions.createEl('button', { text: 'Cancel' }).addEventListener('click', () => this.close());

        const submit = async () => {
            const date = parseInputDate(dateInput.value);
            if (!date) {
                new obsidian_1.Notice('Please enter a valid date.');
                return;
            }

            this.close();
            await this.onSubmit(date);
        };

        insertButton.addEventListener('click', submit);
        dateInput.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                await submit();
            }
        });
        dateInput.focus();
    }
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseInputDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return null;
    }

    const now = new Date();
    const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        now.getHours(),
        now.getMinutes(),
    );
    return formatDateForInput(date) === value ? date : null;
}

class DailyDiaryTemplateSettingTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Daily Diary Template' });

        new obsidian_1.Setting(containerEl)
            .setName('Diary sections')
            .setDesc('One section per line. These lines will be inserted as top-level ordered items.')
            .addTextArea((text) => {
                text
                    .setPlaceholder(DEFAULT_SETTINGS.templateItems.join('\n'))
                    .setValue(this.plugin.getTemplateItems().join('\n'))
                    .onChange(async (value) => {
                        this.plugin.settings.templateItems = value
                            .split('\n')
                            .map((item) => item.trim())
                            .filter((item) => item.length > 0);
                        await this.plugin.saveSettings();
                    });

                text.inputEl.rows = 8;
                text.inputEl.style.width = '100%';
            });

        new obsidian_1.Setting(containerEl)
            .setName('Sub-list style')
            .setDesc('Choose how the empty child item under each diary section is inserted.')
            .addDropdown((dropdown) => {
                dropdown
                    .addOption('unordered', 'Unordered list')
                    .addOption('ordered', 'Ordered list')
                    .setValue(this.plugin.settings.subListStyle || DEFAULT_SETTINGS.subListStyle)
                    .onChange(async (value) => {
                        this.plugin.settings.subListStyle = value;
                        await this.plugin.saveSettings();
                    });
            });

        new obsidian_1.Setting(containerEl)
            .setName('Sections with child list')
            .setDesc('One section per line. Only these top-level sections will get an empty child item.')
            .addTextArea((text) => {
                text
                    .setPlaceholder(DEFAULT_SETTINGS.childListItems.join('\n'))
                    .setValue(this.plugin.getChildListItems().join('\n'))
                    .onChange(async (value) => {
                        this.plugin.settings.childListItems = value
                            .split('\n')
                            .map((item) => item.trim())
                            .filter((item) => item.length > 0);
                        await this.plugin.saveSettings();
                    });

                text.inputEl.rows = 8;
                text.inputEl.style.width = '100%';
            });

        new obsidian_1.Setting(containerEl)
            .setName('Hotkey')
            .setDesc('Change it in Obsidian Settings > Hotkeys, search for "Insert Daily Diary Template". Default: Cmd/Ctrl + Shift + K.');
    }
}

module.exports = DailyDiaryTemplatePlugin;
