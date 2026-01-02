# Bili Trancy - 沉浸式双语字幕播放器

**Bili Trancy** 是一个专为语言学习者设计的本地视频播放器。它结合了类似 Trancy 的双语字幕体验、即时查词功能和 AI 辅助学习工具，助你在观看视频的同时高效提升语言能力。

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ 主要功能

- **📺 本地视频播放**: 支持 MP4, WebM 等主流视频格式，直接从本地加载播放。
- **📝 双语字幕支持**:
    - 支持加载 SRT, VTT, ASS, JSON 等多种格式字幕。
    - **双语对照**: 同时显示原文和译文（支持 AI 自动翻译）。
    - **智能分词**: 英文歌词/字幕自动分词，支持点击单词交互。
- **🔍 即时查词系统**:
    - **点击查词**: 视频暂停时点击任意单词，即刻显示释义。
    - **上下文记忆**: 查词时自动记录当前句子作为上下文，通过 Prompt 回溯学习场景。
    - **智能词典**: 提供音标、词性、释义及例句。
- **🤖 AI 学习助手**:
    - **内置 Chat**: 随时与 AI 对话，询问语法、文化背景或视频内容。
    - **全文翻译**: 基于 OpenAI API 的高质量字幕翻译。
- **📚 生词本管理**:
    - 一键保存生词及其上下文。
    - 支持导出为 Markdown 格式，方便导入 Anki 或 Notion。
- **🎨 现代化界面**: 简洁优雅的 UI 设计，支持深色模式，提供舒适的学习环境。
- 历史记录与成就系统
- 数据的导入导出

## 🚀 快速开始

本项目是一个纯前端应用，无需复杂的后端环境。

### 1. 获取代码

```bash
git clone https://github.com/your-username/bili-trancy.git
cd bili-trancy
```

### 2. 运行项目

由于浏览器安全策略（CORS），建议使用本地服务器运行，而不是直接打开 HTML 文件。

你可以在项目根目录下使用以下任一方式启动：

**使用 Python (Mac/Linux/Windows):**
```bash
# Python 3
python3 -m http.server 8000
```
然后浏览器访问: `http://localhost:8000`

**使用 VS Code:**
安装 "Live Server" 插件，右键 `index.html` 选择 "Open with Live Server"。

**使用 Node.js:**
```bash
npx http-server .
```

### 3. 配置 AI 功能 (可选)

要使用 AI 翻译和对话功能，需要配置 OpenAI 或兼容的 API Key。

1. 点击右上角的 **设置 (⚙️)** 按钮。
2. 填入你的 API Base URL (例如 `https://api.openai.com/v1` 或其他中转地址)。
3. 填入你的 **API Key**。
4. 选择或输入模型名称 (如 `gpt-4o-mini`, `gpt-3.5-turbo`)。
5. 点击保存。

## 🛠️ 技术栈

- **Core**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Storage**: LocalStorage (配置及生词本)
- **Icons**: SVG Icons, Google Fonts (Inter, Noto Sans SC)

## 📁 目录结构

```
.
├── css/                # 样式文件
│   └── style.css
├── js/                 # 核心逻辑
│   ├── app.js          # 应用入口与状态管理
│   ├── player.js       # 视频播放器控制
│   ├── subtitle-parser.js # 字幕解析 (SRT/VTT/ASS/JSON)
│   ├── dictionary.js   # 词典查询服务
│   ├── translator.js   # AI 翻译服务
│   └── vocabulary.js   # 生词本管理
├── index.html          # 主页面
└── README.md           # 项目文档
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 许可证

本项目采用 [MIT License](LICENSE) 授权。
