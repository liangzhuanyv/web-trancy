/**
 * 生词本管理 - 支持视频绑定
 */

export class Vocabulary {
    constructor() {
        // 当前视频的生词列表
        this.words = [];

        // 所有视频的生词数据 { videoName: [words] }
        this.allVideoWords = this.loadAllWords();

        // 当前视频名称
        this.currentVideoName = '';

        // 文件句柄
        this.fileHandle = null;
        this.filePath = localStorage.getItem('vocabPath') || '';

        // 回调
        this.onUpdate = null;
    }

    /**
     * 切换到指定视频的生词本
     */
    switchToVideo(videoName) {
        // 保存当前视频的生词
        if (this.currentVideoName && this.words.length > 0) {
            this.allVideoWords[this.currentVideoName] = [...this.words];
            this.saveAllWords();
        }

        // 切换到新视频
        this.currentVideoName = videoName;
        this.words = this.allVideoWords[videoName] || [];

        if (this.onUpdate) {
            this.onUpdate(this.words.length);
        }
    }

    /**
     * 选择保存文件（打开已有的 MD 文件或创建新文件）
     */
    async selectFile() {
        try {
            // 使用 File System Access API
            if ('showOpenFilePicker' in window) {
                // 使用 showOpenFilePicker 打开已有文件
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Markdown 文件',
                        accept: { 'text/markdown': ['.md'] }
                    }],
                    multiple: false
                });

                this.fileHandle = handle;

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
        const { word, phonetic, definitions, wordSummaryZh, context, videoTime, videoName } = wordData;

        // 检查是否已存在于当前视频的生词本中
        if (this.words.find(w => w.word.toLowerCase() === word.toLowerCase())) {
            return { success: false, message: '该单词已在当前视频的生词本中' };
        }

        const entry = {
            word,
            phonetic: phonetic || '',
            definitions: definitions || [],
            wordSummaryZh: wordSummaryZh || '',  // 中文翻译
            context: context || '',
            videoTime: videoTime || '',
            videoName: videoName || this.currentVideoName,
            addedAt: new Date().toISOString()
        };

        this.words.push(entry);

        // 同步保存到 allVideoWords
        if (this.currentVideoName) {
            this.allVideoWords[this.currentVideoName] = [...this.words];
        }
        this.saveAllWords();

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

            // 同步保存
            if (this.currentVideoName) {
                this.allVideoWords[this.currentVideoName] = [...this.words];
            }
            this.saveAllWords();

            if (this.onUpdate) {
                this.onUpdate(this.words.length);
            }

            return true;
        }
        return false;
    }

    /**
     * 检查单词是否在当前视频的生词本中
     */
    hasWord(word) {
        return this.words.some(w => w.word.toLowerCase() === word.toLowerCase());
    }

    /**
     * 获取当前视频的所有生词
     */
    getWords() {
        return [...this.words];
    }

    /**
     * 获取所有视频的生词（用于统计）
     */
    getAllWords() {
        const allWords = [];
        for (const videoName of Object.keys(this.allVideoWords)) {
            allWords.push(...this.allVideoWords[videoName]);
        }
        return allWords;
    }

    /**
     * 获取当前视频的生词数量
     */
    get count() {
        return this.words.length;
    }

    /**
     * 获取所有视频的总生词数量
     */
    get totalCount() {
        let total = 0;
        for (const videoName of Object.keys(this.allVideoWords)) {
            total += this.allVideoWords[videoName].length;
        }
        return total;
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
            const videoHeader = `## 📺 ${entry.videoName || '未知视频'}`;
            const dateHeader = `### ${date}`;

            let newEntry = `\n#### ${entry.word}\n`;
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
            if (entry.videoTime) {
                newEntry += `- **时间点**: ${entry.videoTime}\n`;
            }

            // 检查是否已有该视频的标题
            if (!content.includes(videoHeader)) {
                content += `\n${videoHeader}\n`;
            }

            // 检查是否已有今天的日期标题（在该视频标题下）
            const videoSection = content.indexOf(videoHeader);
            const dateInVideo = content.indexOf(dateHeader, videoSection);
            if (dateInVideo === -1) {
                // 找到视频标题后的位置添加日期
                const insertPos = content.indexOf('\n', videoSection) + 1;
                content = content.slice(0, insertPos) + dateHeader + '\n' + content.slice(insertPos);
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
     * 导出当前视频的生词到 Markdown
     */
    exportToMarkdown() {
        let markdown = `# 生词本 - ${this.currentVideoName || '全部'}\n\n`;

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
                if (entry.videoTime) {
                    markdown += `- **时间点**: ${entry.videoTime}\n`;
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
        a.download = `vocabulary-${this.currentVideoName || 'all'}.md`;
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * 加载所有视频的生词
     */
    loadAllWords() {
        try {
            const saved = localStorage.getItem('vocabularyAllWords');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    }

    /**
     * 保存所有视频的生词
     */
    saveAllWords() {
        try {
            localStorage.setItem('vocabularyAllWords', JSON.stringify(this.allVideoWords));
        } catch {
            console.error('保存生词失败');
        }
    }

    /**
     * 清空当前视频的生词本
     */
    clear() {
        this.words = [];
        if (this.currentVideoName) {
            this.allVideoWords[this.currentVideoName] = [];
        }
        this.saveAllWords();
        if (this.onUpdate) {
            this.onUpdate(0);
        }
    }

    /**
     * 清空所有生词本
     */
    clearAll() {
        this.words = [];
        this.allVideoWords = {};
        this.saveAllWords();
        if (this.onUpdate) {
            this.onUpdate(0);
        }
    }
}

export default Vocabulary;
