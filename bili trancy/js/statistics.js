/**
 * 学习统计管理
 */

export class Statistics {
    constructor() {
        this.data = this.loadData();
    }

    /**
     * 加载统计数据
     */
    loadData() {
        try {
            const saved = localStorage.getItem('learningStatistics');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
        }

        // 默认数据结构
        return {
            // 首次使用时间
            firstUsedAt: new Date().toISOString(),
            // 今日观看时间（秒）
            todayWatchTime: 0,
            // 今日日期（用于判断是否需要重置）
            todayDate: this.getTodayDate(),
            // 总观看时间（秒）
            totalWatchTime: 0,
            // 观看的视频记录 { videoName: { watchTime, completed, lastWatched } }
            videos: {},
            // 完成观看的视频数（用户手动标记）
            completedVideos: 0,
            // 查询单词次数
            wordLookups: 0,
            // 学习天数记录
            learningDays: [],
            // 连续学习天数
            streak: 0,
            // 最长连续天数
            maxStreak: 0
        };
    }

    /**
     * 保存统计数据
     */
    saveData() {
        try {
            localStorage.setItem('learningStatistics', JSON.stringify(this.data));
        } catch (error) {
            console.error('保存统计数据失败:', error);
        }
    }

    /**
     * 获取今天的日期字符串
     */
    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * 检查并重置今日数据
     */
    checkDayReset() {
        const today = this.getTodayDate();
        if (this.data.todayDate !== today) {
            // 新的一天，重置今日数据
            this.data.todayWatchTime = 0;
            this.data.todayDate = today;

            // 更新学习天数记录
            this.updateLearningDays();
            this.saveData();
        }
    }

    /**
     * 更新学习天数和连续学习记录
     */
    updateLearningDays() {
        const today = this.getTodayDate();

        if (!this.data.learningDays.includes(today)) {
            // 检查是否是连续学习
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (this.data.learningDays.includes(yesterdayStr)) {
                this.data.streak++;
            } else {
                this.data.streak = 1;
            }

            if (this.data.streak > this.data.maxStreak) {
                this.data.maxStreak = this.data.streak;
            }

            this.data.learningDays.push(today);

            // 只保留最近 365 天的记录
            if (this.data.learningDays.length > 365) {
                this.data.learningDays = this.data.learningDays.slice(-365);
            }
        }
    }

    /**
     * 记录视频观看时间（增量）
     */
    addWatchTime(videoName, seconds) {
        this.checkDayReset();

        // 更新今日观看时间
        this.data.todayWatchTime += seconds;
        // 更新总观看时间
        this.data.totalWatchTime += seconds;

        // 更新视频记录
        if (!this.data.videos[videoName]) {
            this.data.videos[videoName] = {
                watchTime: 0,
                completed: false,
                completedCount: 0,
                firstWatched: new Date().toISOString(),
                lastWatched: new Date().toISOString()
            };
        }

        this.data.videos[videoName].watchTime += seconds;
        this.data.videos[videoName].lastWatched = new Date().toISOString();

        // 更新今天的学习记录
        this.updateLearningDays();

        this.saveData();
    }

    /**
     * 标记视频完成观看（用户手动点击）
     */
    markVideoCompleted(videoName) {
        this.checkDayReset();

        if (!this.data.videos[videoName]) {
            this.data.videos[videoName] = {
                watchTime: 0,
                completed: true,
                completedCount: 1,
                firstWatched: new Date().toISOString(),
                lastWatched: new Date().toISOString()
            };
        } else {
            this.data.videos[videoName].completed = true;
            this.data.videos[videoName].completedCount =
                (this.data.videos[videoName].completedCount || 0) + 1;
        }

        this.data.completedVideos++;
        this.updateLearningDays();
        this.saveData();

        return this.data.completedVideos;
    }

    /**
     * 记录单词查询
     */
    addWordLookup() {
        this.checkDayReset();
        this.data.wordLookups++;
        this.updateLearningDays();
        this.saveData();
    }

    /**
     * 获取统计摘要
     */
    getSummary() {
        this.checkDayReset();

        return {
            completedVideos: this.data.completedVideos || 0,
            totalWatchTime: this.data.totalWatchTime,
            todayWatchTime: this.data.todayWatchTime,
            wordLookups: this.data.wordLookups,
            learningDays: this.data.learningDays.length,
            streak: this.data.streak,
            maxStreak: this.data.maxStreak,
            firstUsedAt: this.data.firstUsedAt
        };
    }

    /**
     * 获取最近观看的视频列表
     */
    getRecentVideos(limit = 5) {
        const videos = Object.entries(this.data.videos)
            .map(([name, data]) => ({
                name,
                ...data
            }))
            .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));

        return videos.slice(0, limit);
    }

    /**
     * 格式化时间显示
     */
    static formatDuration(seconds) {
        if (!seconds || seconds < 0) return '0分钟';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}小时${minutes}分钟`;
        }
        return `${minutes}分钟`;
    }

    /**
     * 重置所有统计数据
     */
    reset() {
        localStorage.removeItem('learningStatistics');
        this.data = this.loadData();
    }
}

export default Statistics;
