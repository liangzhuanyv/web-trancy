/**
 * 字幕解析器 - 支持 SRT、VTT、ASS 格式
 */

export class SubtitleParser {
    /**
     * 解析字幕文件
     * @param {string} content - 字幕文件内容
     * @param {string} filename - 文件名（用于检测格式）
     * @returns {Array<{start: number, end: number, text: string, translation?: string}>}
     */
    static parse(content, filename) {
        const ext = filename.split('.').pop().toLowerCase();

        console.log('[SubtitleParser] Parsing file:', filename, 'Extension:', ext);
        console.log('[SubtitleParser] Content preview:', content.substring(0, 200));

        let result = [];

        switch (ext) {
            case 'srt':
                result = this.parseSRT(content);
                break;
            case 'vtt':
                result = this.parseVTT(content);
                break;
            case 'ass':
            case 'ssa':
                result = this.parseASS(content);
                break;
            case 'json':
                result = this.parseJSON(content);
                break;
            default:
                // 尝试自动检测格式
                if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                    result = this.parseJSON(content);
                } else if (content.includes('WEBVTT')) {
                    result = this.parseVTT(content);
                } else if (content.includes('[Script Info]')) {
                    result = this.parseASS(content);
                } else {
                    result = this.parseSRT(content);
                }
        }

        console.log('[SubtitleParser] Parsed subtitles count:', result.length);
        if (result.length > 0) {
            console.log('[SubtitleParser] First subtitle:', result[0]);
        }

        return result;
    }

    /**
     * 解析 JSON 格式字幕（B站格式）
     */
    static parseJSON(content) {
        try {
            const data = JSON.parse(content);
            const subtitles = [];

            // B站格式: { body: [{ from, to, content }] }
            if (data.body && Array.isArray(data.body)) {
                for (const item of data.body) {
                    const text = item.content || item.text || '';
                    subtitles.push({
                        start: item.from || item.start || 0,
                        end: item.to || item.end || 0,
                        text: text,
                        translation: ''
                    });
                }
                return subtitles;
            }

            // 其他常见格式: 直接是数组
            if (Array.isArray(data)) {
                for (const item of data) {
                    subtitles.push({
                        start: item.from || item.start || item.startTime || 0,
                        end: item.to || item.end || item.endTime || 0,
                        text: item.content || item.text || item.subtitle || '',
                        translation: item.translation || ''
                    });
                }
                return subtitles;
            }

            console.warn('[SubtitleParser] Unknown JSON format');
            return [];
        } catch (error) {
            console.error('[SubtitleParser] JSON parse error:', error);
            return [];
        }
    }

    /**
     * 解析 SRT 格式字幕
     */
    static parseSRT(content) {
        const subtitles = [];

        // 预处理：移除 BOM，统一换行符
        let cleanContent = content
            .replace(/^\uFEFF/, '')  // 移除 UTF-8 BOM
            .replace(/\r\n/g, '\n')  // Windows CRLF -> LF
            .replace(/\r/g, '\n')    // Old Mac CR -> LF
            .trim();

        console.log('[SubtitleParser] SRT cleaned content preview:', cleanContent.substring(0, 300));

        // 按空行分割成块
        const blocks = cleanContent.split(/\n\n+/);

        console.log('[SubtitleParser] SRT blocks count:', blocks.length);

        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length < 2) continue;

            // 跳过序号行，找到时间行
            let timeLineIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('-->')) {
                    timeLineIndex = i;
                    break;
                }
            }

            if (timeLineIndex === -1) continue;

            const timeLine = lines[timeLineIndex];

            const timeMatch = timeLine.match(
                /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/
            );

            if (!timeMatch) {
                console.log('[SubtitleParser] Time match failed for:', timeLine);
                continue;
            }

            const start = this.timeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
            const end = this.timeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);

            // 获取文本行 - 时间行之后的所有非空行
            const textLines = lines.slice(timeLineIndex + 1).filter(line => line.trim());

            console.log('[SubtitleParser] Text lines for block:', textLines);

            const { original, translation } = this.splitBilingualText(textLines);

            subtitles.push({
                start,
                end,
                text: original,
                translation: translation
            });
        }

        console.log('[SubtitleParser] SRT parsed total:', subtitles.length);
        if (subtitles.length > 0 && subtitles.length <= 3) {
            console.log('[SubtitleParser] All subtitles:', subtitles);
        }

        return subtitles;
    }

    /**
     * 解析 VTT 格式字幕
     */
    static parseVTT(content) {
        const subtitles = [];
        // 移除 WEBVTT 头部和样式块
        const cleanContent = content
            .replace(/^WEBVTT.*$/m, '')
            .replace(/^NOTE.*$/gm, '')
            .replace(/^STYLE[\s\S]*?^\s*$/gm, '')
            .trim();

        const blocks = cleanContent.split(/\n\s*\n/);

        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length < 2) continue;

            // 找到时间行
            let timeLineIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('-->')) {
                    timeLineIndex = i;
                    break;
                }
            }

            if (timeLineIndex === -1) continue;

            const timeLine = lines[timeLineIndex];
            // VTT 支持 mm:ss.mmm 和 hh:mm:ss.mmm 格式
            const timeMatch = timeLine.match(
                /(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})/
            );

            if (!timeMatch) continue;

            const start = this.timeToSeconds(
                timeMatch[1] || '00',
                timeMatch[2],
                timeMatch[3],
                timeMatch[4]
            );
            const end = this.timeToSeconds(
                timeMatch[5] || '00',
                timeMatch[6],
                timeMatch[7],
                timeMatch[8]
            );

            // 获取文本行，移除 VTT 标签
            const textLines = lines.slice(timeLineIndex + 1)
                .filter(line => line.trim())
                .map(line => this.stripVTTTags(line));

            const { original, translation } = this.splitBilingualText(textLines);

            subtitles.push({
                start,
                end,
                text: original,
                translation: translation
            });
        }

        return subtitles;
    }

    /**
     * 解析 ASS/SSA 格式字幕
     */
    static parseASS(content) {
        const subtitles = [];
        const lines = content.split('\n');

        let inEvents = false;
        let formatFields = [];

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed === '[Events]') {
                inEvents = true;
                continue;
            }

            if (trimmed.startsWith('[') && trimmed !== '[Events]') {
                inEvents = false;
                continue;
            }

            if (!inEvents) continue;

            if (trimmed.startsWith('Format:')) {
                formatFields = trimmed
                    .substring(7)
                    .split(',')
                    .map(f => f.trim().toLowerCase());
                continue;
            }

            if (trimmed.startsWith('Dialogue:')) {
                const values = trimmed.substring(9).split(',');

                // 找到各字段的位置
                const startIdx = formatFields.indexOf('start');
                const endIdx = formatFields.indexOf('end');
                const textIdx = formatFields.indexOf('text');

                if (startIdx === -1 || endIdx === -1 || textIdx === -1) continue;

                const startTime = this.parseASSTime(values[startIdx].trim());
                const endTime = this.parseASSTime(values[endIdx].trim());

                // Text 字段可能包含逗号，需要从 textIdx 开始合并
                const rawText = values.slice(textIdx).join(',');
                const cleanText = this.stripASSTags(rawText);

                const textLines = cleanText.split('\\N').filter(t => t.trim());
                const { original, translation } = this.splitBilingualText(textLines);

                subtitles.push({
                    start: startTime,
                    end: endTime,
                    text: original,
                    translation: translation
                });
            }
        }

        return subtitles;
    }

    /**
     * 时间转换为秒数
     */
    static timeToSeconds(hours, minutes, seconds, milliseconds) {
        return (
            parseInt(hours, 10) * 3600 +
            parseInt(minutes, 10) * 60 +
            parseInt(seconds, 10) +
            parseInt(milliseconds, 10) / 1000
        );
    }

    /**
     * 解析 ASS 时间格式 (h:mm:ss.cc)
     */
    static parseASSTime(timeStr) {
        const match = timeStr.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
        if (!match) return 0;

        return (
            parseInt(match[1], 10) * 3600 +
            parseInt(match[2], 10) * 60 +
            parseInt(match[3], 10) +
            parseInt(match[4], 10) / 100
        );
    }

    /**
     * 移除 VTT 标签
     */
    static stripVTTTags(text) {
        return text
            .replace(/<[^>]+>/g, '')  // 移除 <c>, <v>, <b> 等标签
            .replace(/\{[^}]+\}/g, '') // 移除 {样式} 标记
            .trim();
    }

    /**
     * 移除 ASS 样式标签
     */
    static stripASSTags(text) {
        return text
            .replace(/\{[^}]*\}/g, '')  // 移除 {\样式} 标签
            .replace(/\\N/g, '\n')       // 替换换行符
            .replace(/\\n/g, '\n')
            .replace(/\\h/g, ' ')        // 替换硬空格
            .trim();
    }

    /**
     * 分离双语字幕
     * 尝试检测并分离原文和翻译
     */
    static splitBilingualText(lines) {
        if (lines.length === 0) {
            return { original: '', translation: '' };
        }

        if (lines.length === 1) {
            // 单行，检查是否包含中英文混合
            const text = lines[0].trim();

            // 检测是否有明显的分隔符
            const separators = [' - ', ' | ', ' / ', '  '];
            for (const sep of separators) {
                if (text.includes(sep)) {
                    const parts = text.split(sep);
                    if (parts.length === 2) {
                        const [part1, part2] = parts;
                        // 判断哪个是原文哪个是译文
                        const part1HasChinese = this.containsChinese(part1);
                        const part2HasChinese = this.containsChinese(part2);

                        if (part1HasChinese !== part2HasChinese) {
                            // 假设英文是原文，中文是译文
                            if (part1HasChinese) {
                                return { original: part2.trim(), translation: part1.trim() };
                            } else {
                                return { original: part1.trim(), translation: part2.trim() };
                            }
                        }
                    }
                }
            }

            return { original: text, translation: '' };
        }

        if (lines.length >= 2) {
            // 多行字幕，通常第一行是原文，第二行是译文
            const line1 = lines[0].trim();
            const line2 = lines[1].trim();

            const line1HasChinese = this.containsChinese(line1);
            const line2HasChinese = this.containsChinese(line2);

            // 如果第一行是英文，第二行是中文，那就是标准双语格式
            if (!line1HasChinese && line2HasChinese) {
                return { original: line1, translation: line2 };
            }

            // 如果第一行是中文，第二行是英文
            if (line1HasChinese && !line2HasChinese) {
                return { original: line2, translation: line1 };
            }

            // 其他情况，可能两行都是同一语言，合并
            return {
                original: lines.join(' '),
                translation: ''
            };
        }

        return { original: lines.join(' '), translation: '' };
    }

    /**
     * 检测文本是否包含中文字符
     */
    static containsChinese(text) {
        return /[\u4e00-\u9fa5]/.test(text);
    }

    /**
     * 秒数转换为时间字符串
     */
    static formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    /**
     * 合并相邻的相同字幕
     */
    static mergeConsecutive(subtitles) {
        if (subtitles.length === 0) return [];

        const merged = [{ ...subtitles[0] }];

        for (let i = 1; i < subtitles.length; i++) {
            const current = subtitles[i];
            const last = merged[merged.length - 1];

            // 如果文本相同且时间接近，合并
            if (current.text === last.text && current.start - last.end < 0.5) {
                last.end = current.end;
            } else {
                merged.push({ ...current });
            }
        }

        return merged;
    }
}

export default SubtitleParser;
