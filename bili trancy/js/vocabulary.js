/**
 * 生词本管理
 */

export class Vocabulary {
    constructor() {
        // 生词列表
        this.words = this.loadWords();

        // 文件句柄
        this.fileHandle = null;
        this.filePath = localStorage.getItem('vocabPath') || '';

        // 回调
        this.onUpdate = null;
    }

    /**
     * 选择保存文件
     */
    async selectFile() {
        try {
            // 使用 File System Access API
            if ('showSaveFilePicker' in window) {
                this.fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'vocabulary.md',
                    types: [{
                        description: 'Markdown 文件',
                        accept: { 'text/markdown': ['.md'] }
                    }]
                });

                // 保存文件名供显示
                this.filePath = this.fileHandle.name;
                localStorage.setItem('vocabPath', this.filePath);

                return this.filePath;
            } else {
                throw new Error('您的浏览器不支持文件选择功能');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return null; // 用户取消
            }
            throw error;
        }
    }

    /**
     * 添加生词
     */
    async addWord(wordData) {
        const { word, phonetic, definitions, context, videoTime, videoName } = wordData;

        // 检查是否已存在
        if (this.words.find(w => w.word.toLowerCase() === word.toLowerCase())) {
            return { success: false, message: '该单词已在生词本中' };
        }

        const entry = {
            word,
            phonetic: phonetic || '',
            definitions: definitions || [],
            context: context || '',
            videoTime: videoTime || '',
            videoName: videoName || '',
            addedAt: new Date().toISOString()
        };

        this.words.push(entry);
        this.saveWords();

        // 保存到文件
        if (this.fileHandle) {
            await this.appendToFile(entry);
        }

        if (this.onUpdate) {
            this.onUpdate(this.words.length);
        }

        return { success: true, message: '已添加到生词本' };
    }

    /**
     * 移除生词
     */
    removeWord(word) {
        const index = this.words.findIndex(w => w.word.toLowerCase() === word.toLowerCase());
        if (index !== -1) {
            this.words.splice(index, 1);
            this.saveWords();

            if (this.onUpdate) {
                this.onUpdate(this.words.length);
            }

            return true;
        }
        return false;
    }

    /**
     * 检查单词是否在生词本中
     */
    hasWord(word) {
        return this.words.some(w => w.word.toLowerCase() === word.toLowerCase());
    }

    /**
     * 获取所有生词
     */
    getWords() {
        return [...this.words];
    }

    /**
     * 获取生词数量
     */
    get count() {
        return this.words.length;
    }

    /**
     * 追加到文件
     */
    async appendToFile(entry) {
        if (!this.fileHandle) return;

        try {
            // 读取现有内容
            const file = await this.fileHandle.getFile();
            let content = await file.text();

            // 生成 Markdown 内容
            const date = new Date().toLocaleDateString('zh-CN');
            const dateHeader = `## ${date}`;

            let newEntry = `\n### ${entry.word}\n`;
            if (entry.phonetic) {
                newEntry += `- **音标**: ${entry.phonetic}\n`;
            }
            if (entry.definitions && entry.definitions.length > 0) {
                for (const def of entry.definitions) {
                    if (def.pos) {
                        newEntry += `- **${def.pos}**: ${def.definition}\n`;
                    } else {
                        newEntry += `- **释义**: ${def.definition}\n`;
                    }
                    if (def.example) {
                        newEntry += `  - 例句: *${def.example}*\n`;
                    }
                }
            }
            if (entry.context) {
                newEntry += `- **上下文**: ${entry.context}\n`;
            }
            if (entry.videoName) {
                newEntry += `- **来源**: ${entry.videoName}`;
                if (entry.videoTime) {
                    newEntry += ` @ ${entry.videoTime}`;
                }
                newEntry += '\n';
            }

            // 检查是否已有今天的日期标题
            if (!content.includes(dateHeader)) {
                content += `\n${dateHeader}\n`;
            }

            content += newEntry;

            // 写入文件
            const writable = await this.fileHandle.createWritable();
            await writable.write(content);
            await writable.close();

        } catch (error) {
            console.error('写入文件失败:', error);
            throw error;
        }
    }

    /**
     * 导出所有生词到 Markdown
     */
    exportToMarkdown() {
        let markdown = '# 生词本\n\n';

        // 按日期分组
        const grouped = {};
        for (const entry of this.words) {
            const date = new Date(entry.addedAt).toLocaleDateString('zh-CN');
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(entry);
        }

        // 生成 Markdown
        for (const [date, words] of Object.entries(grouped)) {
            markdown += `## ${date}\n\n`;

            for (const entry of words) {
                markdown += `### ${entry.word}\n`;
                if (entry.phonetic) {
                    markdown += `- **音标**: ${entry.phonetic}\n`;
                }
                if (entry.definitions && entry.definitions.length > 0) {
                    for (const def of entry.definitions) {
                        if (def.pos) {
                            markdown += `- **${def.pos}**: ${def.definition}\n`;
                        } else {
                            markdown += `- **释义**: ${def.definition}\n`;
                        }
                        if (def.example) {
                            markdown += `  - 例句: *${def.example}*\n`;
                        }
                    }
                }
                if (entry.context) {
                    markdown += `- **上下文**: ${entry.context}\n`;
                }
                if (entry.videoName) {
                    markdown += `- **来源**: ${entry.videoName}`;
                    if (entry.videoTime) {
                        markdown += ` @ ${entry.videoTime}`;
                    }
                    markdown += '\n';
                }
                markdown += '\n';
            }
        }

        return markdown;
    }

    /**
     * 下载 Markdown 文件
     */
    downloadMarkdown() {
        const markdown = this.exportToMarkdown();
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'vocabulary.md';
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * 加载生词
     */
    loadWords() {
        try {
            const saved = localStorage.getItem('vocabularyWords');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    /**
     * 保存生词
     */
    saveWords() {
        try {
            localStorage.setItem('vocabularyWords', JSON.stringify(this.words));
        } catch {
            console.error('保存生词失败');
        }
    }

    /**
     * 清空生词本
     */
    clear() {
        this.words = [];
        this.saveWords();
        if (this.onUpdate) {
            this.onUpdate(0);
        }
    }
}

export default Vocabulary;
