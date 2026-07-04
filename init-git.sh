#!/bin/bash
set -e

if [ ! -d .git ]; then
  git init
  git branch -M main
  git add .
  git commit -m "Initial: Meteoblue + Solcast PV forecast PWA"
else
  echo "Git already initialized, skip init"
fi

echo ""
echo "下一步:"
echo "1. 用你的 GitHub 用户名替换 <USER>"
echo "2. 用 repo 名替换 <REPO>（如果不用 pv-forecast-pwa）"
echo "3. 运行下面这条命令:"
echo ""
echo "   git remote add origin git@github.com:<USER>/<REPO>.git"
echo "   git push -u origin main"
echo ""
echo "推送后 GitHub Actions 自动构建,约 30 秒完成部署到 Cloudflare Pages"
