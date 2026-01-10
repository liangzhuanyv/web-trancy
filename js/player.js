/**
 * 视频播放器控制器
 */

export class Player {
    constructor() {
        this.video = document.getElementById('videoPlayer');
        this.videoContainer = document.getElementById('videoContainer');
        this.placeholder = document.getElementById('videoPlaceholder');
        this.videoTitle = document.getElementById('videoTitle');

        // 控制按钮
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.backwardBtn = document.getElementById('backwardBtn');
        this.forwardBtn = document.getElementById('forwardBtn');
        this.muteBtn = document.getElementById('muteBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');

        // 进度条
        this.progressContainer = document.getElementById('progressContainer');
        this.progressPlayed = document.getElementById('progressPlayed');
        this.progressBuffered = document.getElementById('progressBuffered');
        this.progressHandle = document.getElementById('progressHandle');
        this.timeDisplay = document.getElementById('timeDisplay');

        // 状态
        this.isPlaying = false;
        this.isDragging = false;

        // 当前视频信息（用于续播）
        this.currentVideoName = '';
        this.lastSaveTime = 0; // 上次保存进度的时间

        // 回调函数
        this.onTimeUpdate = null;
        this.onVideoLoaded = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateVolumeUI();
    }

    bindEvents() {
        // 播放/暂停
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.video.addEventListener('click', () => this.togglePlay());

        // 快进/快退
        this.backwardBtn.addEventListener('click', () => this.seek(-5));
        this.forwardBtn.addEventListener('click', () => this.seek(5));

        // 音量
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));

        // 全屏
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // 进度条
        this.progressContainer.addEventListener('click', (e) => this.seekToPosition(e));
        this.progressContainer.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        // 视频事件
        this.video.addEventListener('play', () => this.onPlay());
        this.video.addEventListener('pause', () => this.onPause());
        this.video.addEventListener('timeupdate', () => this.onTimeUpdateInternal());
        this.video.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        this.video.addEventListener('progress', () => this.updateBuffered());
        this.video.addEventListener('ended', () => this.onEnded());

        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    /**
     * 加载视频文件
     */
    loadVideo(file) {
        const url = URL.createObjectURL(file);
        this.video.src = url;
        this.videoTitle.textContent = file.name;
        this.currentVideoName = file.name;
        this.placeholder.classList.add('hidden');

        // 恢复播放进度
        this.video.addEventListener('loadedmetadata', () => {
            this.restorePlaybackPosition();
        }, { once: true });

        // 自动播放
        this.video.play().catch(() => {
            // 如果自动播放被阻止，忽略错误
        });
    }

    /**
     * 切换播放/暂停
     */
    togglePlay() {
        if (this.video.paused) {
            this.video.play();
        } else {
            this.video.pause();
        }
    }

    /**
     * 播放
     */
    play() {
        this.video.play();
    }

    /**
     * 暂停
     */
    pause() {
        this.video.pause();
    }

    /**
     * 相对跳转
     */
    seek(seconds) {
        this.video.currentTime = Math.max(0, Math.min(
            this.video.currentTime + seconds,
            this.video.duration || 0
        ));
    }

    /**
     * 跳转到指定时间
     */
    seekTo(seconds) {
        this.video.currentTime = Math.max(0, Math.min(seconds, this.video.duration || 0));
    }

    /**
     * 点击进度条跳转
     */
    seekToPosition(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.video.currentTime = percent * (this.video.duration || 0);
    }

    /**
     * 开始拖动进度条
     */
    startDrag(e) {
        this.isDragging = true;
        this.seekToPosition(e);
    }

    /**
     * 拖动中
     */
    onDrag(e) {
        if (!this.isDragging) return;
        this.seekToPosition(e);
    }

    /**
     * 结束拖动
     */
    endDrag() {
        this.isDragging = false;
    }

    /**
     * 静音切换
     */
    toggleMute() {
        this.video.muted = !this.video.muted;
        this.updateVolumeUI();
    }

    /**
     * 设置音量
     */
    setVolume(value) {
        this.video.volume = value;
        this.video.muted = value === 0;
        this.updateVolumeUI();
    }

    /**
     * 更新音量UI
     */
    updateVolumeUI() {
        const isMuted = this.video.muted || this.video.volume === 0;
        const iconVolume = this.muteBtn.querySelector('.icon-volume');
        const iconMuted = this.muteBtn.querySelector('.icon-muted');

        if (isMuted) {
            iconVolume.classList.add('hidden');
            iconMuted.classList.remove('hidden');
        } else {
            iconVolume.classList.remove('hidden');
            iconMuted.classList.add('hidden');
        }

        this.volumeSlider.value = this.video.muted ? 0 : this.video.volume * 100;
    }

    /**
     * 全屏切换
     */
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.videoContainer.requestFullscreen();
        }
    }

    /**
     * 播放事件处理
     */
    onPlay() {
        this.isPlaying = true;
        const iconPlay = this.playPauseBtn.querySelector('.icon-play');
        const iconPause = this.playPauseBtn.querySelector('.icon-pause');
        iconPlay.classList.add('hidden');
        iconPause.classList.remove('hidden');
    }

    /**
     * 暂停事件处理
     */
    onPause() {
        this.isPlaying = false;
        const iconPlay = this.playPauseBtn.querySelector('.icon-play');
        const iconPause = this.playPauseBtn.querySelector('.icon-pause');
        iconPlay.classList.remove('hidden');
        iconPause.classList.add('hidden');
    }

    /**
     * 时间更新处理
     */
    onTimeUpdateInternal() {
        if (!this.video.duration) return;

        const current = this.video.currentTime;
        const duration = this.video.duration;
        const percent = (current / duration) * 100;

        // 更新进度条
        this.progressPlayed.style.width = `${percent}%`;
        this.progressHandle.style.left = `${percent}%`;

        // 更新时间显示
        this.timeDisplay.textContent = `${this.formatTime(current)} / ${this.formatTime(duration)}`;

        // 保存播放进度（每5秒保存一次，避免频繁写入）
        const now = Date.now();
        if (now - this.lastSaveTime > 5000) {
            this.savePlaybackPosition();
            this.lastSaveTime = now;
        }

        // 调用外部回调
        if (this.onTimeUpdate) {
            this.onTimeUpdate(current);
        }
    }

    /**
     * 视频元数据加载完成
     */
    onLoadedMetadata() {
        if (this.onVideoLoaded) {
            this.onVideoLoaded();
        }
    }

    /**
     * 更新缓冲进度
     */
    updateBuffered() {
        if (this.video.buffered.length > 0) {
            const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
            const duration = this.video.duration;
            const percent = (bufferedEnd / duration) * 100;
            this.progressBuffered.style.width = `${percent}%`;
        }
    }

    /**
     * 视频播放结束
     */
    onEnded() {
        this.onPause();
    }

    /**
     * 键盘快捷键处理
     */
    handleKeyboard(e) {
        // 如果焦点在输入框，不处理快捷键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.seek(-5);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.seek(5);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.setVolume(Math.min(1, this.video.volume + 0.1));
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.setVolume(Math.max(0, this.video.volume - 0.1));
                break;
            case 'KeyM':
                this.toggleMute();
                break;
            case 'KeyF':
                this.toggleFullscreen();
                break;
        }
    }

    /**
     * 格式化时间
     */
    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    /**
     * 获取当前时间
     */
    get currentTime() {
        return this.video.currentTime;
    }

    /**
     * 获取视频时长
     */
    get duration() {
        return this.video.duration;
    }

    /**
     * 保存播放进度
     */
    savePlaybackPosition() {
        if (!this.currentVideoName || !this.video.duration) return;

        try {
            // 获取已保存的进度记录
            const savedPositions = JSON.parse(localStorage.getItem('videoPlaybackPositions') || '{}');

            // 保存当前视频的进度
            savedPositions[this.currentVideoName] = {
                currentTime: this.video.currentTime,
                duration: this.video.duration,
                timestamp: Date.now()
            };

            // 只保留最近的20个视频进度记录，避免 localStorage 过大
            const entries = Object.entries(savedPositions);
            if (entries.length > 20) {
                // 按时间排序，删除最旧的
                entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
                const trimmed = Object.fromEntries(entries.slice(0, 20));
                localStorage.setItem('videoPlaybackPositions', JSON.stringify(trimmed));
            } else {
                localStorage.setItem('videoPlaybackPositions', JSON.stringify(savedPositions));
            }
        } catch (error) {
            console.error('保存播放进度失败:', error);
        }
    }

    /**
     * 恢复播放进度
     */
    restorePlaybackPosition() {
        if (!this.currentVideoName) return;

        try {
            const savedPositions = JSON.parse(localStorage.getItem('videoPlaybackPositions') || '{}');
            const position = savedPositions[this.currentVideoName];

            if (position && position.currentTime > 0) {
                // 如果上次播放进度超过视频总长度的95%，从头开始
                if (position.currentTime / this.video.duration > 0.95) {
                    console.log('[Player] 视频已近播完，从头开始');
                    return;
                }

                // 恢复到上次的位置
                this.video.currentTime = position.currentTime;
                console.log(`[Player] 续播: ${this.formatTime(position.currentTime)}`);
            }
        } catch (error) {
            console.error('恢复播放进度失败:', error);
        }
    }

    /**
     * 清除某个视频的播放进度
     */
    clearPlaybackPosition(videoName) {
        try {
            const savedPositions = JSON.parse(localStorage.getItem('videoPlaybackPositions') || '{}');
            delete savedPositions[videoName || this.currentVideoName];
            localStorage.setItem('videoPlaybackPositions', JSON.stringify(savedPositions));
        } catch (error) {
            console.error('清除播放进度失败:', error);
        }
    }
}

export default Player;
