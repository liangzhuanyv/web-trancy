/**
 * 词典 - 使用 LLM 解释单词（中英双语）
 */

export class Dictionary {
    constructor() {
        this.baseUrl = localStorage.getItem('apiBaseUrl') || 'https://api.openai.com/v1';
        this.apiKey = localStorage.getItem('apiKey') || '';
        this.model = localStorage.getItem('apiModel') || 'gpt-4o-mini';

        // 缓存
        this.cache = this.loadCache();
    }

    /**
     * 更新设置
     */
    updateSettings(settings) {
        if (settings.baseUrl) this.baseUrl = settings.baseUrl;
        if (settings.apiKey) this.apiKey = settings.apiKey;
        if (settings.model) this.model = settings.model;
    }

    /**
     * 查询单词
     */
    async lookup(word, context = '') {
        if (!word || !word.trim()) return null;

        const cleanWord = word.trim().toLowerCase();

        // 检查缓存
        const cacheKey = context ? `${cleanWord}:${context.substring(0, 50)}` : cleanWord;
        const cached = this.cache[cacheKey];

        // 如果缓存存在且已有中文翻译，直接返回
        if (cached && cached.wordSummaryZh) {
            console.log('[Dictionary] 使用缓存（含中文翻译）:', cleanWord);
            return cached;
        }

        // 如果缓存存在但没有中文翻译，尝试补充翻译
        if (cached && this.apiKey) {
            console.log('[Dictionary] 缓存无中文翻译，尝试补充:', cleanWord);
            const enrichedResult = await this.enrichWithChinese({ ...cached }, context);
            if (enrichedResult.wordSummaryZh) {
                this.cache[cacheKey] = enrichedResult;
                this.saveCache();
            }
            return enrichedResult;
        }

        // 没有 API Key 时也返回缓存
        if (cached) {
            return cached;
        }

        // 先尝试免费词典
        try {
            const freeResult = await this.lookupFreeDict(cleanWord);
            if (freeResult) {
                // 尝试添加中文翻译
                const enrichedResult = await this.enrichWithChinese(freeResult, context);
                this.cache[cacheKey] = enrichedResult;
                this.saveCache();
                return enrichedResult;
            }
        } catch (e) {
            console.log('免费词典查询失败，尝试 LLM');
        }

        // 使用 LLM 解释
        return this.lookupWithLLM(word, context, cacheKey);
    }

    /**
     * 使用免费词典 API
     */
    async lookupFreeDict(word) {
        try {
            const response = await fetch(
                `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
            );

            if (!response.ok) return null;

            const data = await response.json();
            if (!data || !data[0]) return null;

            const entry = data[0];
            const phonetics = entry.phonetics?.find(p => p.text) || {};
            const meanings = entry.meanings || [];

            // 格式化释义
            let definitions = [];
            for (const meaning of meanings.slice(0, 3)) {
                const partOfSpeech = meaning.partOfSpeech;
                const defs = meaning.definitions?.slice(0, 2) || [];

                for (const def of defs) {
                    definitions.push({
                        pos: partOfSpeech,
                        definition: def.definition,
                        definitionZh: '', // 将由 enrichWithChinese 填充
                        example: def.example || ''
                    });
                }
            }

            return {
                word: entry.word,
                wordSummaryZh: '', // 简短中文翻译，会由 enrichWithChinese 填充
                phonetic: phonetics.text || '',
                audio: phonetics.audio || '',
                definitions: definitions,
                source: 'Free Dictionary API'
            };
        } catch (error) {
            console.error('免费词典查询失败:', error);
            return null;
        }
    }

    /**
     * 为英文释义添加中文翻译
     */
    async enrichWithChinese(result, context) {
        if (!this.apiKey) {
            return result;
        }

        try {
            // 同时获取单词简短翻译和释义翻译
            const defsToTranslate = result.definitions
                .map(d => d.definition)
                .join('\n');

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
                            content: `你是一个英语词典助手。请用 JSON 格式回复：
{
  "wordSummary": "单词最常用的中文翻译，简短一点，比如 'activity' 翻译为 '活动'",
  "definitions": ["释义1的中文翻译", "释义2的中文翻译", ...]
}
只输出 JSON，不要其他内容。`
                        },
                        {
                            role: 'user',
                            content: `单词: ${result.word}\n英文释义:\n${defsToTranslate}`
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: 400
                })
            });

            if (response.ok) {
                const data = await response.json();
                const content = data.choices[0]?.message?.content || '';
                console.log('[Dictionary] LLM 翻译响应:', content);

                // 解析 JSON - 尝试多种方式
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[0]);
                        console.log('[Dictionary] 解析后的 JSON:', parsed);

                        // 支持多种可能的字段名
                        result.wordSummaryZh = parsed.wordSummary || parsed.word_summary || parsed.summary || parsed.translation || '';
                        console.log('[Dictionary] 提取的 wordSummaryZh:', result.wordSummaryZh);

                        if (parsed.definitions && Array.isArray(parsed.definitions)) {
                            result.definitions.forEach((def, index) => {
                                if (parsed.definitions[index]) {
                                    def.definitionZh = parsed.definitions[index];
                                }
                            });
                        }
                    } catch (e) {
                        console.error('[Dictionary] 解析翻译 JSON 失败:', e, '原始内容:', content);
                    }
                } else {
                    console.warn('[Dictionary] 无法从响应中提取 JSON:', content);
                }
            } else {
                console.error('[Dictionary] 翻译 API 请求失败:', response.status);
            }
        } catch (error) {
            console.error('中文翻译失败:', error);
        }

        return result;
    }

    /**
     * 使用 LLM 解释单词（包含中文）
     */
    async lookupWithLLM(word, context, cacheKey) {
        if (!this.apiKey) {
            return {
                word: word,
                phonetic: '',
                definitions: [{
                    pos: '',
                    definition: 'Please set API Key in settings to enable dictionary.',
                    definitionZh: '请先在设置中配置 API Key 以启用词典功能',
                    example: ''
                }],
                source: 'error'
            };
        }

        const prompt = context
            ? `解释单词 "${word}"，在句子 "${context}" 中的含义。`
            : `解释单词 "${word}" 的含义。`;

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
                            content: `你是一个英语词典助手。请用以下 JSON 格式回复：
{
  "word": "单词",
  "phonetic": "音标（如 /wɜːrd/）",
  "definitions": [
    {
      "pos": "词性（如 noun, verb, adjective）",
      "definition": "英文释义",
      "definitionZh": "中文释义",
      "example": "英文例句"
    }
  ]
}
只输出 JSON，不要有其他内容。最多3个释义。释义要准确、简洁。`
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 600
                })
            });

            if (!response.ok) {
                throw new Error('API 请求失败');
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || '';

            // 解析 JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                result.source = 'LLM';

                // 缓存结果
                this.cache[cacheKey] = result;
                this.saveCache();

                return result;
            }

            throw new Error('无法解析响应');
        } catch (error) {
            console.error('LLM 词典查询失败:', error);
            return {
                word: word,
                phonetic: '',
                definitions: [{
                    pos: '',
                    definition: `Query failed: ${error.message}`,
                    definitionZh: `查询失败: ${error.message}`,
                    example: ''
                }],
                source: 'error'
            };
        }
    }

    /**
     * AI 对话（流式响应）
     */
    async chat(messages, onChunk = null) {
        if (!this.apiKey) {
            throw new Error('请先在设置中配置 API Key');
        }

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
                        content: `你是一个友好的英语学习助手。帮助用户理解视频内容、单词用法、语法问题等。
回答要简洁明了，使用中文回复。如果涉及英语例句，请同时给出中文翻译。`
                    },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 1000,
                stream: !!onChunk // 如果有回调，使用流式
            })
        });

        if (!response.ok) {
            throw new Error('API 请求失败');
        }

        // 流式响应
        if (onChunk && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const content = data.choices?.[0]?.delta?.content || '';
                            if (content) {
                                fullContent += content;
                                onChunk(content, fullContent);
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }

            return fullContent;
        }

        // 非流式响应
        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    }

    /**
     * 加载缓存
     */
    loadCache() {
        try {
            const cached = localStorage.getItem('dictionaryCache');
            return cached ? JSON.parse(cached) : {};
        } catch {
            return {};
        }
    }

    /**
     * 保存缓存
     */
    saveCache() {
        try {
            const keys = Object.keys(this.cache);
            if (keys.length > 500) {
                const newCache = {};
                keys.slice(-250).forEach(key => {
                    newCache[key] = this.cache[key];
                });
                this.cache = newCache;
            }
            localStorage.setItem('dictionaryCache', JSON.stringify(this.cache));
        } catch {
            this.cache = {};
        }
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.cache = {};
        localStorage.removeItem('dictionaryCache');
    }
}

export default Dictionary;
