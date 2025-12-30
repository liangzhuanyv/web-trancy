/**
 * Bili Trancy - 双语字幕播放器主应用 V2.0
 */

import { Player } from './player.js';
import { SubtitleParser } from './subtitle-parser.js';
import { Translator } from './translator.js';
import { Dictionary } from './dictionary.js';
import { Vocabulary } from './vocabulary.js';
import { Statistics } from './statistics.js';

class App {
    constructor() {
        // 模块实例
        this.player = new Player();
        this.translator = new Translator();
        this.dictionary = new Dictionary();
        this.vocabulary = new Vocabulary();
        this.statistics = new Statistics();

        // 观看时间追踪
        this.lastWatchTimeUpdate = 0;

        // 字幕数据
        this.subtitles = [];
        this.currentSubtitleIndex = -1;

        // 模式
        this.isLearningMode = false;
        this.subtitlesVisible = true;

        // 当前视频信息
        this.currentVideoName = '';

        // AI 对话历史
        this.chatHistory = [];
        this.chatSessions = []; // 所有对话会话
        this.currentChatId = null; // 当前对话 ID

        // DOM 元素
        this.elements = {
            // 工具栏
            loadVideoBtn: document.getElementById('loadVideoBtn'),
            loadSubtitleBtn: document.getElementById('loadSubtitleBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            videoTitle: document.getElementById('videoTitle'),
            modeButtons: document.querySelectorAll('.mode-btn'),

            // 视频
            videoInput: document.getElementById('videoInput'),
            subtitleInput: document.getElementById('subtitleInput'),

            // 字幕
            subtitleOverlay: document.getElementById('subtitleOverlay'),
            subtitleOriginal: document.getElementById('subtitleOriginal'),
            subtitleTranslation: document.getElementById('subtitleTranslation'),
            subtitleToggleBtn: document.getElementById('subtitleToggleBtn'),

            // 学习面板
            learningPanel: document.getElementById('learningPanel'),
            panelResizer: document.getElementById('panelResizer'),
            subtitleList: document.getElementById('subtitleList'),
            closePanelBtn: document.getElementById('closePanelBtn'),

            // 面板头部按钮
            aiChatBtnHeader: document.getElementById('aiChatBtnHeader'),
            translateBtnHeader: document.getElementById('translateBtnHeader'),

            // 浮动按钮
            translateBtn: document.getElementById('translateBtn'),
            aiChatBtn: document.getElementById('aiChatBtn'),
            moreOptionsBtn: document.getElementById('moreOptionsBtn'),

            // 设置弹窗
            settingsModal: document.getElementById('settingsModal'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            saveSettingsBtn: document.getElementById('saveSettingsBtn'),
            apiBaseUrl: document.getElementById('apiBaseUrl'),
            apiKey: document.getElementById('apiKey'),
            apiModel: document.getElementById('apiModel'),
            sourceLang: document.getElementById('sourceLang'),
            targetLang: document.getElementById('targetLang'),
            vocabPath: document.getElementById('vocabPath'),
            selectVocabPathBtn: document.getElementById('selectVocabPathBtn'),

            // 词典弹窗
            dictionaryPopup: document.getElementById('dictionaryPopup'),
            dictDragHandle: document.getElementById('dictDragHandle'),
            closeDictBtn: document.getElementById('closeDictBtn'),
            dictWord: document.getElementById('dictWord'),
            dictWordZh: document.getElementById('dictWordZh'),
            dictPhonetic: document.getElementById('dictPhonetic'),
            dictContent: document.getElementById('dictContent'),
            addToVocabBtn: document.getElementById('addToVocabBtn'),

            // AI 对话弹窗
            chatModal: document.getElementById('chatModal'),
            closeChatBtn: document.getElementById('closeChatBtn'),
            chatMessages: document.getElementById('chatMessages'),
            chatInput: document.getElementById('chatInput'),
            chatSendBtn: document.getElementById('chatSendBtn'),
            newChatBtn: document.getElementById('newChatBtn'),
            chatHistoryList: document.getElementById('chatHistoryList'),

            // 生词本
            vocabBtn: document.getElementById('vocabBtn'),
            vocabCount: document.getElementById('vocabCount'),

            // 完成观看按钮
            completeBtn: document.getElementById('completeBtn'),

            // 统计弹窗
            statsBtn: document.getElementById('statsBtn'),
            statsModal: document.getElementById('statsModal'),
            closeStatsBtn: document.getElementById('closeStatsBtn'),
            statTotalVideos: document.getElementById('statTotalVideos'),
            statTotalTime: document.getElementById('statTotalTime'),
            statVocabCount: document.getElementById('statVocabCount'),
            statStreak: document.getElementById('statStreak'),
            statTodayTime: document.getElementById('statTodayTime'),
            statWordLookups: document.getElementById('statWordLookups'),
            statLearningDays: document.getElementById('statLearningDays'),
            recentVideosList: document.getElementById('recentVideosList'),
            achievementsList: document.getElementById('achievementsList')
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
        this.setupPlayerCallbacks();
        this.updateVocabCount();

        // 创建 toast 容器
        this.createToastContainer();

        // 启动观看时间追踪（每5秒记录一次）
        setInterval(() => this.trackWatchTime(), 5000);
    }

    bindEvents() {
        // 加载视频
        this.elements.loadVideoBtn.addEventListener('click', () => {
            this.elements.videoInput.click();
        });

        this.elements.videoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadVideo(file);
            }
        });

        // 加载字幕
        this.elements.loadSubtitleBtn.addEventListener('click', () => {
            this.elements.subtitleInput.click();
        });

        this.elements.subtitleInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadSubtitle(file);
            }
        });

        // 模式切换
        this.elements.modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.switchMode(mode);
            });
        });

        // 字幕显示切换
        this.elements.subtitleToggleBtn.addEventListener('click', () => {
            this.toggleSubtitles();
        });

        // 关闭学习面板
        this.elements.closePanelBtn.addEventListener('click', () => {
            this.switchMode('normal');
        });

        // 浮动按钮
        if (this.elements.translateBtn) {
            this.elements.translateBtn.addEventListener('click', () => {
                this.translateSubtitles();
            });
        }

        if (this.elements.aiChatBtn) {
            this.elements.aiChatBtn.addEventListener('click', () => {
                console.log('[App] AI Chat floating button clicked');
                this.openChat();
            });
        }

        // 面板头部按钮
        if (this.elements.aiChatBtnHeader) {
            console.log('[App] Binding aiChatBtnHeader event');
            this.elements.aiChatBtnHeader.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[App] AI Chat header button clicked');
                this.openChat();
            });
        } else {
            console.warn('[App] aiChatBtnHeader not found');
        }

        if (this.elements.translateBtnHeader) {
            console.log('[App] Binding translateBtnHeader event');
            this.elements.translateBtnHeader.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[App] Translate header button clicked');
                this.translateSubtitles();
            });
        } else {
            console.warn('[App] translateBtnHeader not found');
        }

        // 设置弹窗
        this.elements.settingsBtn.addEventListener('click', () => {
            this.openSettings();
        });

        this.elements.closeSettingsBtn.addEventListener('click', () => {
            this.closeSettings();
        });

        this.elements.settingsModal.querySelector('.modal-backdrop').addEventListener('click', () => {
            this.closeSettings();
        });

        this.elements.saveSettingsBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        // 选择生词本路径
        this.elements.selectVocabPathBtn.addEventListener('click', async () => {
            const path = await this.vocabulary.selectFile();
            if (path) {
                this.elements.vocabPath.value = path;
            }
        });

        // 词典弹窗关闭
        document.addEventListener('click', (e) => {
            if (!this.elements.dictionaryPopup.contains(e.target) &&
                !e.target.classList.contains('word')) {
                this.closeDictionary();
            }
        });

        // 加入生词本按钮
        this.elements.addToVocabBtn.addEventListener('click', () => {
            this.addCurrentWordToVocab();
        });

        // 关闭词典按钮
        if (this.elements.closeDictBtn) {
            this.elements.closeDictBtn.addEventListener('click', () => {
                this.closeDictionary();
            });
        }

        // 词典拖拽功能
        if (this.elements.dictDragHandle) {
            this.setupDictDrag();
        }

        // 生词本按钮
        this.elements.vocabBtn.addEventListener('click', () => {
            this.showVocabulary();
        });

        // 生词本更新回调
        this.vocabulary.onUpdate = (count) => {
            this.updateVocabCount();
        };

        // 完成观看按钮
        if (this.elements.completeBtn) {
            this.elements.completeBtn.addEventListener('click', () => {
                this.markVideoCompleted();
            });
        }

        // 统计弹窗
        if (this.elements.statsBtn) {
            this.elements.statsBtn.addEventListener('click', () => {
                this.openStats();
            });
        }

        if (this.elements.closeStatsBtn) {
            this.elements.closeStatsBtn.addEventListener('click', () => {
                this.closeStats();
            });

            this.elements.statsModal.querySelector('.modal-backdrop').addEventListener('click', () => {
                this.closeStats();
            });
        }

        // AI 对话
        if (this.elements.closeChatBtn) {
            this.elements.closeChatBtn.addEventListener('click', () => {
                this.closeChat();
            });

            this.elements.chatModal.querySelector('.modal-backdrop').addEventListener('click', () => {
                this.closeChat();
            });

            this.elements.chatSendBtn.addEventListener('click', () => {
                this.sendChatMessage();
            });

            this.elements.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            });

            // 新建对话
            if (this.elements.newChatBtn) {
                this.elements.newChatBtn.addEventListener('click', () => {
                    this.createNewChat();
                });
            }

            // 历史对话列表点击
            if (this.elements.chatHistoryList) {
                this.elements.chatHistoryList.addEventListener('click', (e) => {
                    const item = e.target.closest('.chat-history-item');
                    if (!item) return;

                    // 删除按钮
                    if (e.target.closest('.item-delete')) {
                        e.stopPropagation();
                        this.deleteChatSession(item.dataset.id);
                        return;
                    }

                    // 切换到该对话
                    this.switchChatSession(item.dataset.id);
                });
            }
        }

        // 拖拽上传
        document.body.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        document.body.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleFileDrop(e.dataTransfer.files);
        });

        // 初始化面板调整功能
        this.setupPanelResize();
    }

    setupPlayerCallbacks() {
        // 视频时间更新时同步字幕
        this.player.onTimeUpdate = (currentTime) => {
            this.updateCurrentSubtitle(currentTime);
        };
    }

    /**
     * 加载视频
     */
    loadVideo(file) {
        this.player.loadVideo(file);
        this.currentVideoName = file.name;
        this.elements.videoTitle.textContent = file.name;

        // 切换到该视频的生词本
        this.vocabulary.switchToVideo(file.name);
        this.updateVocabCount();

        this.showToast(`已加载视频: ${file.name}`);
    }

    /**
     * 加载字幕
     */
    async loadSubtitle(file) {
        try {
            const content = await file.text();
            this.subtitles = SubtitleParser.parse(content, file.name);

            if (this.subtitles.length === 0) {
                this.showToast('字幕文件为空或格式不正确', 'error');
                return;
            }

            // 检查是否需要翻译
            const needsTranslation = this.subtitles.some(s => !s.translation);

            this.showToast(`已加载 ${this.subtitles.length} 条字幕`, 'success');

            // 渲染学习面板
            this.renderSubtitleList();

            // 如果需要翻译，询问用户
            if (needsTranslation && this.translator.apiKey) {
                this.showTranslatePrompt();
            }
        } catch (error) {
            console.error('字幕加载失败:', error);
            this.showToast('字幕加载失败: ' + error.message, 'error');
        }
    }

    /**
     * 显示翻译提示
     */
    showTranslatePrompt() {
        const confirm = window.confirm('检测到字幕缺少翻译，是否使用 AI 翻译？');
        if (confirm) {
            this.translateSubtitles();
        }
    }

    /**
     * 翻译字幕
     */
    async translateSubtitles() {
        if (!this.translator.apiKey) {
            this.showToast('请先在设置中配置 API Key', 'error');
            return;
        }

        try {
            this.showToast('正在翻译字幕...');

            this.subtitles = await this.translator.translateBatchOptimized(
                this.subtitles,
                (current, total) => {
                    console.log(`翻译进度: ${current}/${total}`);
                }
            );

            this.showToast('字幕翻译完成！', 'success');
            this.renderSubtitleList();
        } catch (error) {
            console.error('翻译失败:', error);
            this.showToast('翻译失败: ' + error.message, 'error');
        }
    }

    /**
     * 更新当前字幕
     */
    updateCurrentSubtitle(currentTime) {
        // 查找当前时间对应的字幕
        let newIndex = -1;

        for (let i = 0; i < this.subtitles.length; i++) {
            const sub = this.subtitles[i];
            if (currentTime >= sub.start && currentTime <= sub.end) {
                newIndex = i;
                break;
            }
        }

        // 如果字幕变化了，更新显示
        if (newIndex !== this.currentSubtitleIndex) {
            this.currentSubtitleIndex = newIndex;

            if (newIndex >= 0) {
                const sub = this.subtitles[newIndex];
                this.elements.subtitleOriginal.textContent = sub.text;
                this.elements.subtitleTranslation.textContent = sub.translation || '';

                // 更新学习面板中的高亮
                this.highlightSubtitleItem(newIndex);
            } else {
                this.elements.subtitleOriginal.textContent = '';
                this.elements.subtitleTranslation.textContent = '';
            }
        }
    }

    /**
     * 渲染字幕列表（歌词风格）
     */
    renderSubtitleList() {
        if (this.subtitles.length === 0) {
            this.elements.subtitleList.innerHTML = `
                <div class="empty-state">
                    <p>加载字幕后将在此显示</p>
                </div>
            `;
            return;
        }

        const html = this.subtitles.map((sub, index) => {
            const time = SubtitleParser.formatTime(sub.start);
            const words = this.tokenizeText(sub.text);

            return `
                <div class="subtitle-item" data-index="${index}" data-time="${sub.start}">
                    <div class="time">${time}</div>
                    <div class="original-text">${words}</div>
                    <div class="translation-text">${sub.translation || ''}</div>
                </div>
            `;
        }).join('');

        this.elements.subtitleList.innerHTML = html;

        // 绑定点击事件
        this.elements.subtitleList.querySelectorAll('.subtitle-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // 如果点击的是单词，不跳转
                if (e.target.classList.contains('word')) return;

                const time = parseFloat(item.dataset.time);
                this.player.seekTo(time);
            });
        });

        // 绑定单词点击事件
        this.elements.subtitleList.querySelectorAll('.word').forEach(word => {
            word.addEventListener('click', (e) => {
                e.stopPropagation();
                this.lookupWord(word);
            });
        });
    }

    /**
     * 将文本分割成可点击的单词
     */
    tokenizeText(text) {
        // 保留标点符号，只把单词变成可点击的
        return text.replace(/([a-zA-Z]+(?:'[a-zA-Z]+)?)/g, '<span class="word">$1</span>');
    }

    /**
     * 高亮当前字幕项（歌词效果）
     */
    highlightSubtitleItem(index) {
        // 移除之前的高亮和临近效果
        this.elements.subtitleList.querySelectorAll('.subtitle-item').forEach((el, i) => {
            el.classList.remove('active', 'near-active');

            // 添加临近效果
            if (Math.abs(i - index) === 1) {
                el.classList.add('near-active');
            }
        });

        // 添加新高亮
        const item = this.elements.subtitleList.querySelector(`[data-index="${index}"]`);
        if (item) {
            item.classList.add('active');

            // 滚动到可见区域（居中）
            item.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    /**
     * 查询单词
     */
    async lookupWord(wordElement) {
        const word = wordElement.textContent.trim();

        // 获取上下文
        const subtitleItem = wordElement.closest('.subtitle-item');
        const context = subtitleItem?.querySelector('.original-text')?.textContent || '';

        // 显示弹窗
        this.showDictionary(word, wordElement);

        // 记录查词统计
        this.statistics.addWordLookup();

        // 查询词典
        const result = await this.dictionary.lookup(word, context);

        if (result) {
            this.displayDictionaryResult(result, context);
        }
    }

    /**
     * 显示词典弹窗
     */
    showDictionary(word, targetElement) {
        const popup = this.elements.dictionaryPopup;

        // 显示加载状态
        this.elements.dictWord.textContent = word;
        this.elements.dictWordZh.textContent = ''; // 清空之前的翻译
        this.elements.dictPhonetic.textContent = '';
        this.elements.dictContent.innerHTML = '<div class="loading-spinner"></div>';

        // 检查是否已在生词本
        if (this.vocabulary.hasWord(word)) {
            this.elements.addToVocabBtn.classList.add('added');
            this.elements.addToVocabBtn.innerHTML = '✓';
        } else {
            this.elements.addToVocabBtn.classList.remove('added');
            this.elements.addToVocabBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                </svg>
            `;
        }

        // 定位弹窗
        const rect = targetElement.getBoundingClientRect();
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + 8}px`;

        // 检查是否超出屏幕
        popup.classList.remove('hidden');
        const popupRect = popup.getBoundingClientRect();

        if (popupRect.right > window.innerWidth) {
            popup.style.left = `${window.innerWidth - popupRect.width - 16}px`;
        }

        if (popupRect.bottom > window.innerHeight) {
            popup.style.top = `${rect.top - popupRect.height - 8}px`;
        }

        // 保存当前单词和上下文
        this.currentDictWord = word;
        const subtitleItem = targetElement.closest('.subtitle-item');
        this.currentDictContext = subtitleItem?.querySelector('.original-text')?.textContent || '';
    }

    /**
     * 显示词典结果（含中文）
     */
    displayDictionaryResult(result, context) {
        // 显示简短中文翻译
        if (result.wordSummaryZh) {
            this.elements.dictWordZh.textContent = result.wordSummaryZh;
        } else {
            this.elements.dictWordZh.textContent = '';
        }

        this.elements.dictPhonetic.textContent = result.phonetic || '';

        let html = '';

        if (result.definitions && result.definitions.length > 0) {
            for (const def of result.definitions) {
                html += '<div class="dict-definition">';

                if (def.pos) {
                    html += `<span class="dict-pos">${def.pos}</span>`;
                }

                html += `<p class="dict-meaning">${def.definition}</p>`;

                // 中文释义
                if (def.definitionZh) {
                    html += `<p class="dict-meaning-zh">${def.definitionZh}</p>`;
                }

                if (def.example) {
                    html += `<p class="dict-example">${def.example}</p>`;
                }

                html += '</div>';
            }
        } else {
            html = '<p class="dict-meaning">未找到释义</p>';
        }

        this.elements.dictContent.innerHTML = html;

        // 保存当前结果
        this.currentDictResult = result;
    }

    /**
     * 关闭词典弹窗
     */
    closeDictionary() {
        this.elements.dictionaryPopup.classList.add('hidden');
    }

    /**
     * 设置词典拖拽功能
     */
    setupDictDrag() {
        const popup = this.elements.dictionaryPopup;
        const handle = this.elements.dictDragHandle;

        let isDragging = false;
        let startX, startY, startLeft, startTop;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('.btn-close-small')) return; // 忽略关闭按钮

            isDragging = true;
            popup.classList.add('dragging');

            const rect = popup.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left;
            startTop = rect.top;

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            let newLeft = startLeft + deltaX;
            let newTop = startTop + deltaY;

            // 限制在屏幕内
            const popupRect = popup.getBoundingClientRect();
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - popupRect.width));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - popupRect.height));

            popup.style.left = `${newLeft}px`;
            popup.style.top = `${newTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                popup.classList.remove('dragging');
            }
        });
    }

    /**
     * 加入生词本
     */
    async addCurrentWordToVocab() {
        if (!this.currentDictWord || !this.currentDictResult) return;

        const result = await this.vocabulary.addWord({
            word: this.currentDictWord,
            phonetic: this.currentDictResult.phonetic,
            definitions: this.currentDictResult.definitions,
            context: this.currentDictContext,
            videoTime: SubtitleParser.formatTime(this.player.currentTime),
            videoName: this.currentVideoName
        });

        if (result.success) {
            this.elements.addToVocabBtn.classList.add('added');
            this.elements.addToVocabBtn.innerHTML = '✓';
            this.showToast(result.message, 'success');
        } else {
            this.showToast(result.message, 'error');
        }
    }

    /**
     * 更新生词数量显示
     */
    updateVocabCount() {
        this.elements.vocabCount.textContent = this.vocabulary.count;
    }

    /**
     * 显示生词本
     */
    showVocabulary() {
        const words = this.vocabulary.getWords();

        if (words.length === 0) {
            this.showToast('生词本为空');
            return;
        }

        // 下载生词本
        this.vocabulary.downloadMarkdown();
        this.showToast('已下载生词本');
    }

    /**
     * 切换模式
     */
    switchMode(mode) {
        this.isLearningMode = mode === 'learning';

        // 更新按钮状态
        this.elements.modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // 显示/隐藏学习面板和调整手柄
        if (this.isLearningMode) {
            this.elements.learningPanel.classList.remove('hidden');
            if (this.elements.panelResizer) {
                this.elements.panelResizer.classList.remove('hidden');
            }
        } else {
            this.elements.learningPanel.classList.add('hidden');
            if (this.elements.panelResizer) {
                this.elements.panelResizer.classList.add('hidden');
            }
        }
    }

    /**
     * 设置面板调整大小功能
     */
    setupPanelResize() {
        const resizer = this.elements.panelResizer;
        const panel = this.elements.learningPanel;
        const videoArea = document.querySelector('.video-area');

        if (!resizer || !panel) return;

        let isResizing = false;
        let startX, startWidth;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            // 获取当前 panel 宽度
            const rect = panel.getBoundingClientRect();
            startWidth = rect.width;

            resizer.classList.add('active');
            document.body.style.cursor = 'col-resize';

            // 防止选中文本
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            // 计算新宽度 (向左拖动宽度增加)
            const deltaX = startX - e.clientX;
            const newWidth = startWidth + deltaX;

            // 限制宽度范围
            if (newWidth >= 300 && newWidth <= 800) {
                panel.style.width = `${newWidth}px`;
                panel.style.flex = `0 0 ${newWidth}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizer.classList.remove('active');
                document.body.style.cursor = '';
            }
        });
    }

    /**
     * 切换字幕显示
     */
    toggleSubtitles() {
        this.subtitlesVisible = !this.subtitlesVisible;

        if (this.subtitlesVisible) {
            this.elements.subtitleOverlay.classList.remove('hidden');
        } else {
            this.elements.subtitleOverlay.classList.add('hidden');
        }
    }

    /**
     * 打开设置
     */
    openSettings() {
        // 加载当前设置
        this.elements.apiBaseUrl.value = localStorage.getItem('apiBaseUrl') || 'https://api.openai.com/v1';
        this.elements.apiKey.value = localStorage.getItem('apiKey') || '';
        this.elements.apiModel.value = localStorage.getItem('apiModel') || 'gpt-4o-mini';
        this.elements.sourceLang.value = localStorage.getItem('sourceLang') || 'en';
        this.elements.targetLang.value = localStorage.getItem('targetLang') || 'zh';
        this.elements.vocabPath.value = localStorage.getItem('vocabPath') || '';

        this.elements.settingsModal.classList.remove('hidden');
    }

    /**
     * 关闭设置
     */
    closeSettings() {
        this.elements.settingsModal.classList.add('hidden');
    }

    /**
     * 保存设置
     */
    saveSettings() {
        const settings = {
            baseUrl: this.elements.apiBaseUrl.value,
            apiKey: this.elements.apiKey.value,
            model: this.elements.apiModel.value,
            sourceLang: this.elements.sourceLang.value,
            targetLang: this.elements.targetLang.value
        };

        // 保存到 localStorage
        localStorage.setItem('apiBaseUrl', settings.baseUrl);
        localStorage.setItem('apiKey', settings.apiKey);
        localStorage.setItem('apiModel', settings.model);
        localStorage.setItem('sourceLang', settings.sourceLang);
        localStorage.setItem('targetLang', settings.targetLang);

        // 更新模块设置
        this.translator.updateSettings(settings);
        this.dictionary.updateSettings(settings);

        this.closeSettings();
        this.showToast('设置已保存', 'success');
    }

    /**
     * 加载设置
     */
    loadSettings() {
        const settings = {
            baseUrl: localStorage.getItem('apiBaseUrl') || 'https://api.openai.com/v1',
            apiKey: localStorage.getItem('apiKey') || '',
            model: localStorage.getItem('apiModel') || 'gpt-4o-mini',
            sourceLang: localStorage.getItem('sourceLang') || 'en',
            targetLang: localStorage.getItem('targetLang') || 'zh'
        };

        this.translator.updateSettings(settings);
        this.dictionary.updateSettings(settings);
    }

    /**
     * 打开 AI 对话
     */
    openChat() {
        console.log('[App] openChat called');
        if (this.elements.chatModal) {
            // 加载保存的对话会话
            this.loadChatSessions();

            // 渲染历史列表
            this.renderChatHistoryList();

            // 如果有上次的对话，恢复它；否则创建新对话
            if (this.chatSessions.length > 0 && !this.currentChatId) {
                this.switchChatSession(this.chatSessions[0].id);
            } else if (!this.currentChatId) {
                this.createNewChat();
            }

            this.elements.chatModal.classList.remove('hidden');
            if (this.elements.chatInput) {
                this.elements.chatInput.focus();
            }
        } else {
            console.error('[App] chatModal element not found');
        }
    }

    /**
     * 关闭 AI 对话
     */
    closeChat() {
        // 保存当前对话
        this.saveCurrentChatSession();
        this.elements.chatModal.classList.add('hidden');
    }

    /**
     * 创建新对话
     */
    createNewChat() {
        // 保存当前对话
        if (this.currentChatId && this.chatHistory.length > 0) {
            this.saveCurrentChatSession();
        }

        // 创建新会话
        const newId = Date.now().toString();
        const newSession = {
            id: newId,
            title: '新对话',
            messages: [],
            createdAt: new Date().toISOString()
        };

        this.chatSessions.unshift(newSession);
        this.currentChatId = newId;
        this.chatHistory = [];

        // 清空消息区域
        this.elements.chatMessages.innerHTML = `
            <div class="chat-message assistant">
                你好！我是你的英语学习助手。你可以问我关于视频内容、单词用法、语法问题等任何问题。
            </div>
        `;

        // 保存并刷新列表
        this.saveChatSessions();
        this.renderChatHistoryList();
    }

    /**
     * 切换到指定对话
     */
    switchChatSession(sessionId) {
        // 保存当前对话
        if (this.currentChatId && this.chatHistory.length > 0) {
            this.saveCurrentChatSession();
        }

        // 查找目标会话
        const session = this.chatSessions.find(s => s.id === sessionId);
        if (!session) return;

        this.currentChatId = sessionId;
        this.chatHistory = session.messages.map(m => ({ role: m.role, content: m.content }));

        // 渲染消息
        this.elements.chatMessages.innerHTML = '';

        // 添加欢迎消息
        this.addChatMessage('assistant', '你好！我是你的英语学习助手。你可以问我关于视频内容、单词用法、语法问题等任何问题。');

        // 添加历史消息
        for (const msg of session.messages) {
            this.addChatMessage(msg.role, msg.content);
        }

        // 更新列表高亮
        this.renderChatHistoryList();
    }

    /**
     * 删除对话
     */
    deleteChatSession(sessionId) {
        this.chatSessions = this.chatSessions.filter(s => s.id !== sessionId);

        // 如果删除的是当前对话，切换到第一个或创建新的
        if (this.currentChatId === sessionId) {
            this.currentChatId = null;
            if (this.chatSessions.length > 0) {
                this.switchChatSession(this.chatSessions[0].id);
            } else {
                this.createNewChat();
            }
        }

        this.saveChatSessions();
        this.renderChatHistoryList();
    }

    /**
     * 保存当前对话到会话
     */
    saveCurrentChatSession() {
        if (!this.currentChatId) return;

        const session = this.chatSessions.find(s => s.id === this.currentChatId);
        if (session) {
            session.messages = this.chatHistory.slice(); // 复制消息
            // 用第一条用户消息作为标题
            const firstUserMsg = this.chatHistory.find(m => m.role === 'user');
            if (firstUserMsg) {
                session.title = firstUserMsg.content.substring(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
            }
            this.saveChatSessions();
        }
    }

    /**
     * 渲染历史对话列表
     */
    renderChatHistoryList() {
        if (!this.elements.chatHistoryList) return;

        if (this.chatSessions.length === 0) {
            this.elements.chatHistoryList.innerHTML = '<div class="empty-hint">暂无历史对话</div>';
            return;
        }

        this.elements.chatHistoryList.innerHTML = this.chatSessions.map(session => `
            <button class="chat-history-item ${session.id === this.currentChatId ? 'active' : ''}" data-id="${session.id}">
                <span class="item-title">${session.title}</span>
                <span class="item-delete" title="删除">×</span>
            </button>
        `).join('');
    }

    /**
     * 从 localStorage 加载对话会话
     */
    loadChatSessions() {
        try {
            const saved = localStorage.getItem('chatSessions');
            this.chatSessions = saved ? JSON.parse(saved) : [];
        } catch {
            this.chatSessions = [];
        }
    }

    /**
     * 保存对话会话到 localStorage
     */
    saveChatSessions() {
        try {
            // 只保留最近 20 个对话
            const toSave = this.chatSessions.slice(0, 20);
            localStorage.setItem('chatSessions', JSON.stringify(toSave));
        } catch (e) {
            console.error('保存对话失败:', e);
        }
    }

    /**
     * 发送聊天消息（流式响应）
     */
    async sendChatMessage() {
        const message = this.elements.chatInput.value.trim();
        if (!message) return;

        // 清空输入
        this.elements.chatInput.value = '';

        // 添加用户消息到界面
        this.addChatMessage('user', message);

        // 添加到历史
        this.chatHistory.push({ role: 'user', content: message });

        // 禁用发送按钮
        this.elements.chatSendBtn.disabled = true;

        // 创建 AI 消息占位符
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'chat-message assistant streaming';
        aiMessageDiv.textContent = '';
        this.elements.chatMessages.appendChild(aiMessageDiv);

        try {
            // 调用 AI（流式响应）
            const response = await this.dictionary.chat(this.chatHistory, (chunk, fullContent) => {
                // 实时更新消息内容（流式时用纯文本，完成后渲染 markdown）
                aiMessageDiv.textContent = fullContent;
                this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
            });

            // 完成后移除 streaming 类，并渲染 Markdown
            aiMessageDiv.classList.remove('streaming');
            aiMessageDiv.innerHTML = this.parseMarkdown(response);

            // 添加到历史
            this.chatHistory.push({ role: 'assistant', content: response });
        } catch (error) {
            aiMessageDiv.textContent = `错误: ${error.message}`;
            aiMessageDiv.classList.remove('streaming');
            aiMessageDiv.classList.add('error');
        }

        // 启用发送按钮
        this.elements.chatSendBtn.disabled = false;

        // 滚动到底部
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    /**
     * 添加聊天消息到界面
     */
    addChatMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;

        // AI 消息使用 Markdown 渲染
        if (role === 'assistant') {
            messageDiv.innerHTML = this.parseMarkdown(content);
        } else {
            messageDiv.textContent = content;
        }

        this.elements.chatMessages.appendChild(messageDiv);

        // 滚动到底部
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    /**
     * 简单的 Markdown 解析器
     */
    parseMarkdown(text) {
        if (!text) return '';

        // 转义 HTML
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // 代码块 ```code```
        html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`;
        });

        // 行内代码 `code`
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 粗体 **text** 或 __text__
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

        // 斜体 *text* 或 _text_
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

        // 标题 ### heading
        html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

        // 列表 - item 或 * item
        html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // 有序列表 1. item
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

        // 分隔线 ---
        html = html.replace(/^---+$/gm, '<hr>');

        // 引用 > text
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

        // 换行
        html = html.replace(/\n/g, '<br>');

        // 清理连续的 <br>
        html = html.replace(/(<br>){3,}/g, '<br><br>');

        return html;
    }

    /**
     * 处理文件拖拽
     */
    handleFileDrop(files) {
        for (const file of files) {
            const ext = file.name.split('.').pop().toLowerCase();

            if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
                this.loadVideo(file);
            } else if (['srt', 'vtt', 'ass', 'ssa', 'json'].includes(ext)) {
                this.loadSubtitle(file);
            }
        }
    }

    /**
     * 创建 Toast 容器
     */
    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        this.toastContainer = container;
    }

    /**
     * 显示 Toast 消息
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        this.toastContainer.appendChild(toast);

        // 3秒后移除
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    /**
     * 标记视频完成观看
     */
    markVideoCompleted() {
        if (!this.currentVideoName) {
            this.showToast('请先加载视频', 'error');
            return;
        }

        const count = this.statistics.markVideoCompleted(this.currentVideoName);
        this.showToast(`🎉 已完成观看！累计完成 ${count} 个视频`, 'success');

        // 添加完成动画效果
        const btn = this.elements.completeBtn;
        btn.classList.add('completed');
        setTimeout(() => btn.classList.remove('completed'), 1000);
    }

    /**
     * 打开统计弹窗
     */
    openStats() {
        this.elements.statsModal.classList.remove('hidden');
        this.updateStatsDisplay();
    }

    /**
     * 关闭统计弹窗
     */
    closeStats() {
        this.elements.statsModal.classList.add('hidden');
    }

    /**
     * 更新统计显示
     */
    updateStatsDisplay() {
        const summary = this.statistics.getSummary();

        // 主要统计
        this.elements.statTotalVideos.textContent = summary.completedVideos;
        this.elements.statTotalTime.textContent = Statistics.formatDuration(summary.totalWatchTime);
        this.elements.statVocabCount.textContent = this.vocabulary.totalCount;
        this.elements.statStreak.textContent = summary.streak + ' 天';

        // 今日统计
        this.elements.statTodayTime.textContent = Statistics.formatDuration(summary.todayWatchTime);
        this.elements.statWordLookups.textContent = summary.wordLookups + ' 次';
        this.elements.statLearningDays.textContent = summary.learningDays + ' 天';

        // 最近观看
        this.renderRecentVideos();

        // 成就
        this.renderAchievements(summary);
    }

    /**
     * 渲染最近观看的视频
     */
    renderRecentVideos() {
        const videos = this.statistics.getRecentVideos(5);

        if (videos.length === 0) {
            this.elements.recentVideosList.innerHTML = '<p class="empty-hint">暂无观看记录</p>';
            return;
        }

        const html = videos.map(video => {
            const completedIcon = video.completed ? '✅' : '▶️';
            const watchTime = Statistics.formatDuration(video.watchTime);
            return `
                <div class="recent-video-item">
                    <span class="recent-video-icon">${completedIcon}</span>
                    <div class="recent-video-info">
                        <div class="recent-video-name">${video.name}</div>
                        <div class="recent-video-meta">观看 ${watchTime}${video.completedCount > 0 ? ` · 完成 ${video.completedCount} 次` : ''}</div>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.recentVideosList.innerHTML = html;
    }

    /**
     * 渲染成就
     */
    renderAchievements(summary) {
        const achievements = [
            { id: 'first_video', icon: '🎬', name: '初次观影', desc: '完成第一个视频', unlocked: summary.completedVideos >= 1 },
            { id: 'five_videos', icon: '🎥', name: '视频达人', desc: '完成5个视频', unlocked: summary.completedVideos >= 5 },
            { id: 'first_word', icon: '📝', name: '初学乍练', desc: '添加第一个生词', unlocked: this.vocabulary.totalCount >= 1 },
            { id: 'ten_words', icon: '📚', name: '词汇收集者', desc: '添加10个生词', unlocked: this.vocabulary.totalCount >= 10 },
            { id: 'fifty_words', icon: '🏆', name: '词汇大师', desc: '添加50个生词', unlocked: this.vocabulary.totalCount >= 50 },
            { id: 'streak_3', icon: '🔥', name: '坚持不懈', desc: '连续学习3天', unlocked: summary.streak >= 3 },
            { id: 'streak_7', icon: '💪', name: '一周坚持', desc: '连续学习7天', unlocked: summary.streak >= 7 },
            { id: 'one_hour', icon: '⏰', name: '时光飞逝', desc: '累计观看1小时', unlocked: summary.totalWatchTime >= 3600 }
        ];

        const html = achievements.map(a => `
            <div class="achievement ${a.unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${a.icon}</div>
                <div class="achievement-name">${a.name}</div>
                <div class="achievement-desc">${a.desc}</div>
            </div>
        `).join('');

        this.elements.achievementsList.innerHTML = html;
    }

    /**
     * 跟踪观看时间（每5秒调用一次）
     */
    trackWatchTime() {
        if (this.currentVideoName && this.player.isPlaying) {
            this.statistics.addWatchTime(this.currentVideoName, 5);
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
