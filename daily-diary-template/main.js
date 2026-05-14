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
            editorCallback: (editor) => {
                this.insertTemplate(editor);
            },
        });

        this.addSettingTab(new DailyDiaryTemplateSettingTab(this.app, this));
    }

    insertTemplate(editor) {
        const now = new Date();
        const timeStr = this.formatTime(now);
        const dateStr = this.formatDate(now);
        const weekday = this.getWeekday(now);
        const items = this.getTemplateItems();
        const itemLines = this.formatTemplateItems(items);

        const template = `**${dateStr} ${weekday} ${timeStr}**
${itemLines}

---

`;
        editor.replaceSelection(template);
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
