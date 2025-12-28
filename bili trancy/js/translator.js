/**
 * 翻译器 - OpenAI Compatible API
 */

export class Translator {
    constructor() {
        this.baseUrl = localStorage.getItem('apiBaseUrl') || 'https://api.openai.com/v1';
        this.apiKey = localStorage.getItem('apiKey') || '';
        this.model = localStorage.getItem('apiModel') || 'gpt-4o-mini';
        this.sourceLang = localStorage.getItem('sourceLang') || 'en';
        this.targetLang = localStorage.getItem('targetLang') || 'zh';

        // 翻译缓存
        this.cache = this.loadCache();
    }

    /**
     * 更新设置
     */
    updateSettings(settings) {
        if (settings.baseUrl) this.baseUrl = settings.baseUrl;
        if (settings.apiKey) this.apiKey = settings.apiKey;
        if (settings.model) this.model = settings.model;
        if (settings.sourceLang) this.sourceLang = settings.sourceLang;
        if (settings.targetLang) this.targetLang = settings.targetLang;
    }

    /**
     * 翻译单条字幕
     */
    async translate(text) {
        if (!text || !text.trim()) return '';

        // 检查缓存
        const cacheKey = this.getCacheKey(text);
        if (this.cache[cacheKey]) {
            return this.cache[cacheKey];
        }

        if (!this.apiKey) {
            throw new Error('请先设置 API Key');
        }

        const langNames = {
            'zh': '中文',
            'en': '英语',
            'ja': '日语',
            'ko': '韩语'
        };

        const targetLangName = langNames[this.targetLang] || this.targetLang;

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: `你是一个专业的字幕翻译器。将用户输入的文本翻译成${targetLangName}。只输出翻译结果，不要有任何解释或额外内容。保持原文的语气和风格。`
                        },
                        {
                            role: 'user',
                            content: text
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || '翻译请求失败');
            }

            const data = await response.json();
            const translation = data.choices[0]?.message?.content?.trim() || '';

            // 缓存结果
            this.cache[cacheKey] = translation;
            this.saveCache();

            return translation;
        } catch (error) {
            console.error('翻译失败:', error);
            throw error;
        }
    }

    /**
     * 批量翻译字幕
     */
    async translateBatch(subtitles, onProgress) {
        const results = [];
        const total = subtitles.length;

        for (let i = 0; i < subtitles.length; i++) {
            const subtitle = subtitles[i];

            // 如果已有翻译，跳过
            if (subtitle.translation) {
                results.push(subtitle);
                continue;
            }

            try {
                const translation = await this.translate(subtitle.text);
                results.push({
                    ...subtitle,
                    translation
                });
            } catch (error) {
                // 翻译失败，保留原字幕
                results.push({
                    ...subtitle,
                    translation: `[翻译失败] ${error.message}`
                });
            }

            // 更新进度
            if (onProgress) {
                onProgress(i + 1, total);
            }

            // 添加延迟避免 API 限流
            if (i < subtitles.length - 1) {
                await this.delay(300);
            }
        }

        return results;
    }

    /**
     * 翻译字幕（优化版本：合并请求）
     */
    async translateBatchOptimized(subtitles, onProgress) {
        const needTranslation = subtitles.filter(s => !s.translation);

        if (needTranslation.length === 0) {
            return subtitles;
        }

        if (!this.apiKey) {
            throw new Error('请先设置 API Key');
        }

        const batchSize = 10; // 每批翻译10条
        const results = [...subtitles];
        let translated = 0;

        for (let i = 0; i < needTranslation.length; i += batchSize) {
            const batch = needTranslation.slice(i, i + batchSize);
            const textsToTranslate = batch.map((s, idx) => `[${idx + 1}] ${s.text}`).join('\n');

            const langNames = {
                'zh': '中文',
                'en': '英语',
                'ja': '日语',
                'ko': '韩语'
            };
            const targetLangName = langNames[this.targetLang] || this.targetLang;

            try {
                const response = await fetch(`${this.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: this.model,
                        messages: [
                            {
                                role: 'system',
                                content: `你是一个专业的字幕翻译器。将下列编号的句子逐条翻译成${targetLangName}。保持相同的编号格式输出，每行一条翻译。只输出翻译结果。`
                            },
                            {
                                role: 'user',
                                content: textsToTranslate
                            }
                        ],
                        temperature: 0.3,
                        max_tokens: 2000
                    })
                });

                if (!response.ok) {
                    throw new Error('翻译请求失败');
                }

                const data = await response.json();
                const translationText = data.choices[0]?.message?.content || '';

                // 解析批量翻译结果
                const translations = this.parseBatchTranslation(translationText, batch.length);

                // 更新结果
                batch.forEach((originalSub, idx) => {
                    const index = subtitles.indexOf(originalSub);
                    if (index !== -1) {
                        results[index] = {
                            ...originalSub,
                            translation: translations[idx] || ''
                        };
                        // 缓存
                        const cacheKey = this.getCacheKey(originalSub.text);
                        this.cache[cacheKey] = translations[idx] || '';
                    }
                });

                this.saveCache();

            } catch (error) {
                console.error('批量翻译失败:', error);
                // 失败时标记
                batch.forEach((originalSub) => {
                    const index = subtitles.indexOf(originalSub);
                    if (index !== -1) {
                        results[index] = {
                            ...originalSub,
                            translation: '[翻译失败]'
                        };
                    }
                });
            }

            translated += batch.length;
            if (onProgress) {
                onProgress(translated, needTranslation.length);
            }

            // 延迟避免限流
            if (i + batchSize < needTranslation.length) {
                await this.delay(500);
            }
        }

        return results;
    }

    /**
     * 解析批量翻译结果
     */
    parseBatchTranslation(text, expectedCount) {
        const lines = text.split('\n').filter(line => line.trim());
        const results = [];

        for (let i = 0; i < expectedCount; i++) {
            // 查找对应编号的翻译
            const pattern = new RegExp(`^\\[${i + 1}\\]\\s*(.+)$`);
            let found = false;

            for (const line of lines) {
                const match = line.match(pattern);
                if (match) {
                    results.push(match[1].trim());
                    found = true;
                    break;
                }
            }

            if (!found && lines[i]) {
                // 如果没有编号匹配，尝试按顺序使用
                results.push(lines[i].replace(/^\[\d+\]\s*/, '').trim());
            } else if (!found) {
                results.push('');
            }
        }

        return results;
    }

    /**
     * 生成缓存键
     */
    getCacheKey(text) {
        return `${this.targetLang}:${text.trim().toLowerCase()}`;
    }

    /**
     * 加载翻译缓存
     */
    loadCache() {
        try {
            const cached = localStorage.getItem('translationCache');
            return cached ? JSON.parse(cached) : {};
        } catch {
            return {};
        }
    }

    /**
     * 保存翻译缓存
     */
    saveCache() {
        try {
            // 限制缓存大小
            const keys = Object.keys(this.cache);
            if (keys.length > 1000) {
                // 只保留最新的500条
                const newCache = {};
                keys.slice(-500).forEach(key => {
                    newCache[key] = this.cache[key];
                });
                this.cache = newCache;
            }
            localStorage.setItem('translationCache', JSON.stringify(this.cache));
        } catch {
            // 存储满了，清空缓存
            this.cache = {};
        }
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.cache = {};
        localStorage.removeItem('translationCache');
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default Translator;
