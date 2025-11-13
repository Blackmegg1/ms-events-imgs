#!/bin/bash

# === 部署脚本 ===
# 功能：将本地 dist 上传至远程服务器，并备份旧版本
# 作者：你自己
# 日期：$(date +"%Y-%m-%d")

# 定义变量
REMOTE_USER="xygao"              # 服务器用户名
REMOTE_HOST="192.168.74.19"     # 服务器 IP
REMOTE_DIR="~/workspace/msEvent" # 服务器目标目录
LOCAL_DIR="./dist"              # 本地构建目录

# === Step 1: 确认是否已构建 ===
echo "⚠️ 请确保已经运行了 'pnpm build' 并生成了最新的 dist 包。"
read -p "是否已经构建完成？(y/n): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "❌ 请先运行 pnpm build 后再执行此脚本。"
  exit 1
fi

# === Step 2: 检查本地 dist 文件夹是否存在 ===
if [ ! -d "$LOCAL_DIR" ]; then
  echo "❌ 错误：本地 dist 文件夹不存在，请先运行 pnpm build"
  exit 1
fi

# === Step 3: SSH 操作远程服务器 ===
echo "🚀 正在连接服务器并处理旧文件..."
ssh "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
  cd "$HOME/workspace/msEvent" || {
    echo "❌ 错误：无法进入 $REMOTE_DIR 目录，请检查是否存在"
    exit 1
  }

  if [ -d "dist-d" ]; then
    rm -rf "dist-d" && echo "🗑️ 已删除服务器上的 dist-d 文件夹"
  else
    echo "ℹ️ 服务器上没有 dist-d 文件夹，跳过删除"
  fi

  if [ -d "dist" ]; then
    mv "dist" "dist-d" && echo "📦 已将 dist 重命名为 dist-d（作为备份）"
  else
    echo "ℹ️ 服务器上没有 dist 文件夹，跳过重命名"
  fi
EOF

if [ $? -ne 0 ]; then
  echo "❌ 服务器操作失败，脚本退出"
  exit 1
fi

# === Step 4: 上传新版本 ===
echo "⬆️ 正在上传本地 dist 文件夹到 $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR ..."
scp -r "$LOCAL_DIR" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"

if [ $? -eq 0 ]; then
  echo "✅ 上传成功！部署完成。"
else
  echo "❌ 上传失败，请检查网络或权限设置。"
  exit 1
fi
