#!/bin/bash

# 定义变量
REMOTE_USER="xygao"              # 替换为你的服务器用户名
REMOTE_HOST="192.168.74.19"     # 目标服务器 IP
REMOTE_DIR="~/workspace/msEvent" # 目标目录
LOCAL_DIR="./dist"              # 本地 dist 文件夹

# 检查本地 dist 文件夹是否存在
if [ ! -d "$LOCAL_DIR" ]; then
  echo "错误：本地 dist 文件夹不存在，请先运行 pnpm build"
  exit 1
fi

# 通过 SSH 操作服务器上的文件
echo "正在处理服务器上的文件..."
ssh "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
  # 进入目标目录
  cd "$HOME/workspace/msEvent" || {
    echo "错误：无法进入 $REMOTE_DIR 目录，请检查是否存在"
    exit 1
  }

  # 删除 dist-d 文件夹（如果存在）
  if [ -d "dist-d" ]; then
    rm -rf "dist-d" && echo "已删除服务器上的 dist-d 文件夹"
  else
    echo "服务器上没有 dist-d 文件夹，跳过删除"
  fi

  # 重命名 dist 为 dist-d（如果存在）
  if [ -d "dist" ]; then
    mv "dist" "dist-d" && echo "已将服务器上的 dist 重命名为 dist-d"
  else
    echo "服务器上没有 dist 文件夹，跳过重命名"
  fi
EOF

# 检查 SSH 操作是否成功
if [ $? -ne 0 ]; then
  echo "服务器文件操作失败，脚本退出"
  exit 1
fi

# 使用 scp 上传本地 dist 文件夹
echo "正在上传本地 dist 文件夹到 $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR ..."
scp -r "$LOCAL_DIR" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"

# 检查上传是否成功
if [ $? -eq 0 ]; then
  echo "上传成功！"
else
  echo "上传失败，请检查网络或权限设置。"
  exit 1
fi