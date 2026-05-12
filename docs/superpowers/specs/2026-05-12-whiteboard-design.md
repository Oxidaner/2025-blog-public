# Excalidraw 白板模块设计

## 目标

新增一个独立的白板模块，用官方 `@excalidraw/excalidraw` React 组件提供可用的 Excalidraw whiteboard。第一版不接 GitHub 存储，不接博客编辑器，只做独立页面、本地自动保存、导入和导出。

## 页面入口

- 新增页面路径：`/whiteboard`
- 导航新增入口：`白板`
- 页面采用全屏工具布局，不放在装饰卡片里

## 功能范围

- 内嵌 Excalidraw 编辑器
- 自动保存当前画布到浏览器 `localStorage`
- 页面加载时恢复上次画布
- 支持清空画布
- 支持导入 `.excalidraw` JSON 文件
- 支持导出 `.excalidraw` JSON 文件

## 技术设计

- 安装 `@excalidraw/excalidraw`
- 使用 `next/dynamic` 动态加载 Excalidraw，并关闭 SSR
- 将白板页面拆分为：
  - `src/app/whiteboard/page.tsx`：页面壳和 metadata
  - `src/app/whiteboard/whiteboard-client.tsx`：客户端白板 UI、localStorage、导入导出
  - `src/lib/excalidraw-storage.ts`：白板 JSON 序列化、反序列化、下载文件名等纯逻辑
- 使用 `@excalidraw/excalidraw/index.css` 引入官方样式

## 存储策略

- localStorage key：`oxidaner:whiteboard:v1`
- 保存内容为 `.excalidraw` 风格 JSON：
  - `type`: `excalidraw`
  - `version`: `2`
  - `source`: `https://website.oxidaner.shop/whiteboard`
  - `elements`
  - `appState`
  - `files`

## 非目标

- 第一版不做多人协作
- 第一版不保存到 GitHub
- 第一版不插入博客编辑器
- 第一版不做白板列表

## 验收标准

- `/whiteboard` 可访问
- 导航能进入白板页
- Excalidraw 画布正常渲染
- 画布变更会保存到 localStorage
- 刷新页面能恢复画布
- 可以导入和导出 `.excalidraw`
- 清空画布可用
- `pnpm test`、`pnpm exec tsc --noEmit`、`pnpm build` 通过
