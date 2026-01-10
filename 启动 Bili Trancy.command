#!/bin/bash

# ============================================
#   Bili Trancy 快速启动器
#   双击此文件即可启动应用
# ============================================

# 获取脚本所在目录
cd "$(dirname "$0")"

# 定义端口
PORT=8000

# 检查端口是否已被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，正在尝试关闭..."
    kill $(lsof -t -i:$PORT) 2>/dev/null
    sleep 1
fi

# 清屏并显示欢迎信息
clear
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║                                                   ║"
echo "║   🎬  Bili Trancy - 沉浸式双语字幕播放器         ║"
echo "║                                                   ║"
echo "╠═══════════════════════════════════════════════════╣"
echo "║   🌐  服务器地址: http://localhost:$PORT            ║"
echo "║   📁  项目目录: $(pwd)                            "
echo "║                                                   ║"
echo "║   按 Ctrl+C 停止服务器                            ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# 延迟后打开浏览器（给服务器启动时间）
(sleep 1.5 && open "http://localhost:$PORT") &

# 启动 Python HTTP 服务器
echo "🚀 正在启动服务器..."
echo ""
python3 -m http.server $PORT

# 服务器停止后的提示
echo ""
echo "✅ 服务器已停止"
echo ""
