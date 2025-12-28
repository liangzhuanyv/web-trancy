#!/bin/bash

# Bili Trancy 启动脚本
# 双击此文件即可启动服务器并打开浏览器

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 进入项目目录
cd "$SCRIPT_DIR"

echo "🚀 正在启动 Bili Trancy 服务器..."
echo "📁 项目目录: $SCRIPT_DIR"
echo ""
echo "✨ 服务器地址: http://localhost:8080"
echo "💡 按 Ctrl+C 关闭服务器"
echo ""

# 2秒后打开浏览器
(sleep 2 && open "http://localhost:8080") &

# 启动服务器
python3 -m http.server 8080
