/**
 * 数据管理器 - 导入/导出所有应用数据
 */

export class DataManager {
    constructor() {
        // 所有需要导出的 localStorage 键
        this.dataKeys = [
            'learningStatistics',       // 学习统计
            'vocabularyAllWords',       // 生词本（所有视频）
            'vocabPath',                // 生词文件路径
            'chatSessions',             // AI 对话记录
            'videoPlaybackPositions',   // 视频播放位置
            'dictionaryCache',          // 词典缓存
            'translationCache',         // 翻译缓存
        ];

        // API 设置键
        this.settingsKeys = [
            'apiBaseUrl',
            'apiKey',
            'apiModel',
            'sourceLang',
            'targetLang'
        ];
    }

    /**
     * 导出所有数据到 JSON
     */
    exportAllData() {
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            data: {},
            settings: {}
        };

        // 导出主要数据
        for (const key of this.dataKeys) {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    exportData.data[key] = JSON.parse(value);
                } catch {
                    exportData.data[key] = value;
                }
            }
        }

        // 导出设置
        for (const key of this.settingsKeys) {
            const value = localStorage.getItem(key);
            if (value) {
                exportData.settings[key] = value;
            }
        }

        return exportData;
    }

    /**
     * 下载数据为 JSON 文件
     */
    downloadAsJson() {
        const data = this.exportAllData();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // 生成文件名：bili-trancy-backup-20260102.json
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const filename = `bili-trancy-backup-${date}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);

        return { success: true, filename };
    }

    /**
     * 从文件导入数据
     */
    async importFromFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    resolve({ success: false, message: '未选择文件' });
                    return;
                }

                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    const result = this.importAllData(data);
                    resolve(result);
                } catch (error) {
                    resolve({ success: false, message: '文件解析失败: ' + error.message });
                }
            };

            input.oncancel = () => {
                resolve({ success: false, message: '已取消' });
            };

            input.click();
        });
    }

    /**
     * 导入数据
     */
    importAllData(importData) {
        // 验证数据格式
        if (!importData || !importData.version || !importData.data) {
            return { success: false, message: '无效的备份文件格式' };
        }

        try {
            // 导入主要数据
            for (const key of this.dataKeys) {
                if (importData.data[key] !== undefined) {
                    const value = typeof importData.data[key] === 'string'
                        ? importData.data[key]
                        : JSON.stringify(importData.data[key]);
                    localStorage.setItem(key, value);
                }
            }

            // 导入设置
            if (importData.settings) {
                for (const key of this.settingsKeys) {
                    if (importData.settings[key] !== undefined) {
                        localStorage.setItem(key, importData.settings[key]);
                    }
                }
            }

            return {
                success: true,
                message: '数据导入成功！请刷新页面以加载新数据。',
                exportedAt: importData.exportedAt
            };
        } catch (error) {
            return { success: false, message: '导入失败: ' + error.message };
        }
    }

    /**
     * 获取数据统计信息
     */
    getDataStats() {
        const stats = {
            vocabularyCount: 0,
            videosCount: 0,
            chatSessionsCount: 0,
            hasStatistics: false
        };

        try {
            const vocab = localStorage.getItem('vocabularyAllWords');
            if (vocab) {
                const parsed = JSON.parse(vocab);
                stats.videosCount = Object.keys(parsed).length;
                stats.vocabularyCount = Object.values(parsed).reduce((sum, words) => sum + words.length, 0);
            }

            const chatSessions = localStorage.getItem('chatSessions');
            if (chatSessions) {
                stats.chatSessionsCount = JSON.parse(chatSessions).length;
            }

            stats.hasStatistics = !!localStorage.getItem('learningStatistics');
        } catch {
            // 忽略解析错误
        }

        return stats;
    }
}

export default DataManager;
