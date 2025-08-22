# Vue3 文件预览组件库 (YLY Search Viewer)

**一个支持多格式文件预览的Vue3组件库，提供标准化SDK接口，实现即插即用的文件预览功能。**

## 🎯 项目概述

本项目基于Vue3技术栈，实现了一个完整的文件预览系统，支持多种文件格式的在线预览和编辑功能。该组件库设计为SDK化架构，提供标准化接口，可以轻松集成到任何Vue3项目中。

### 核心特性

- 🎯 **多格式支持**: PDF、图片、视频、Office文档、文本文件等
- 🎨 **主题系统**: 内置浅色/深色主题，支持自定义样式
- 📱 **响应式设计**: 自适应不同屏幕尺寸，支持移动端
- ⚡ **性能优化**: 懒加载、分片加载、缓存机制
- 🔧 **TypeScript**: 完整的类型定义和开发体验
- 🎛️ **灵活配置**: 丰富的配置选项和插槽扩展
- ♿ **无障碍**: 支持键盘导航和屏幕阅读器

## 📦 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建项目
npm run build

# 构建组件库
npm run build:lib
```

## 🏗️ 技术架构

### 技术栈

- **前端框架**: Vue3 + Composition API
- **构建工具**: Vite
- **UI组件库**: Element Plus
- **类型系统**: TypeScript
- **状态管理**: Pinia
- **HTTP客户端**: Axios

### 文件预览组件

1. **PDF预览**: 基于PDF.js实现，支持分页、缩放、搜索
2. **图片预览**: 支持缩放、旋转、全屏、拖拽操作
3. **视频播放**: 集成HLS.js，支持多种格式和流媒体
4. **Office文档**: 使用vue-office组件，支持docx/xlsx/pptx
5. **文本编辑**: 支持语法高亮、搜索、编辑模式

### 组件设计

```
src/
├── components/
│   ├── core/
│   │   └── FileViewer.vue        # 核心文件预览组件
│   └── preview/
│       ├── ImagePreview.vue      # 图片预览
│       ├── PdfPreview.vue        # PDF预览
│       ├── VideoPreview.vue      # 视频播放
│       ├── OfficePreview.vue     # Office文档
│       └── TextPreview.vue       # 文本编辑
├── types/
│   └── index.ts                  # TypeScript类型定义
├── utils/
│   └── file.ts                   # 文件处理工具
└── examples/
    └── App.vue                   # 示例应用
```

## 🎮 使用示例

### 基本用法

```vue
<template>
  <FileViewer 
    :file="fileObject" 
    :config="config" 
    @load="handleLoad"
    @error="handleError"
  />
</template>

<script setup lang="ts">
import { FileViewer, createFileObject } from './index'

const fileObject = createFileObject('document.pdf', {
  meta: { title: '示例文档' }
})

const config = {
  theme: 'light',
  toolbar: true,
  zoom: 1.0
}
</script>
```

### 支持的文件类型

| 类型 | 格式 | 功能特性 |
|------|------|----------|
| 图片 | JPG, PNG, GIF, WebP | 缩放、旋转、全屏 |
| PDF | PDF | 分页、搜索、缩略图 |
| 视频 | MP4, WebM, M3U8 | 播放控制、倍速、字幕 |
| Office | DOCX, XLSX, PPTX | 文档查看、缩放 |
| 文本 | TXT, MD, JSON, JS | 语法高亮、搜索、编辑 |

## 📋 原始需求

本项目实现了以下原始需求中的文件预览部分：

### 1. 高级搜索界面
- 左右布局，支持文件过滤和搜索结果展示
- 多种搜索模式：全文搜索、语义搜索、图片搜索
- 搜索结果聚合和分页功能

### 2. 文件预览界面 ✅ **已实现**
- 多栏目布局：标题栏(header) + 内容栏(content)
- 文件预览栏目：调用第三方插件预览，支持多种格式
- AI工具栏目：集成摘要、标签、实体抽取等功能
- 文本抽取和翻译功能
- 权限管理和申请流程

### 3. AI 工具条目
- 摘要、标签、NER信息提取
- 自定义信息提取表单
- 文档问答功能
- 翻译功能

### 4. 技术选型 ✅ **已实现**
- Vue3 + Vite + ElementPlus 脚手架
- 状态管理和HTTP库集成
- 富文本编辑组件（预留Milkdown集成）
- PDF.js文件预览 ✅
- AI接口流式输出支持

## 🔄 开发状态

- ✅ **已完成**: 核心文件预览组件库
- ✅ **已完成**: TypeScript类型系统
- ✅ **已完成**: 多格式文件支持
- ✅ **已完成**: 主题系统和响应式设计
- 🚧 **进行中**: AI工具集成
- 📋 **计划中**: 搜索界面实现
- 📋 **计划中**: 完整的用户界面

## 📚 文档

详细的API文档和使用指南请查看 [docs/README.md](./docs/README.md)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！
