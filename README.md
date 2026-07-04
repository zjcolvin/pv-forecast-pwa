# 光伏预报 PWA

Meteoblue 气象数据 + 物理公式估算发电量,可选与 Solcast 对比。轻量离线优先 PWA。

## 本地开发

```bash
npm install
npm run dev      # http://localhost:5173
```

## 构建与预览

```bash
npm run build
npm run preview
```

## 部署

推送到 `main` 分支即自动部署(GitHub Actions → Cloudflare Pages)。

## 配置

在浏览器里设置:
1. 电站参数(装机容量、组件面积、PR)—— 保存在 localStorage
2. 可选 Solcast API Key —— 启用双源对比

## 技术栈

Vite + React + 手写 SVG 图表 + Canvas 地图 + Service Worker。无 UI 库依赖,JS bundle <170KB。
