# Vue3 文件预览组件库 (YLY Search Viewer)

一个支持多格式文件预览的Vue3组件库，提供标准化SDK接口，实现即插即用的文件预览功能。

## ✨ 特性

- 🎯 **多格式支持**: PDF、图片、视频、Office文档、文本文件
- 🎨 **主题切换**: 内置浅色/深色主题，支持自定义
- 📱 **响应式设计**: 适配移动端和桌面端
- ⚡ **性能优化**: 懒加载、分片加载、缓存机制
- 🔧 **TypeScript**: 完整的类型定义支持
- 🎛️ **灵活配置**: 丰富的配置选项和插槽扩展
- ♿ **无障碍**: 支持键盘导航和屏幕阅读器

## 📦 安装

```bash
npm install @yly/search-viewer
# 或
yarn add @yly/search-viewer
# 或
pnpm add @yly/search-viewer
```

## 🚀 快速开始

### 全局注册

```typescript
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import YlySearchViewer from '@yly/search-viewer'
import '@yly/search-viewer/style.css'

const app = createApp(App)
app.use(ElementPlus)
app.use(YlySearchViewer)
app.mount('#app')
```

### 按需引入

```vue
<template>
  <FileViewer :file="fileObject" :config="config" />
</template>

<script setup lang="ts">
import { FileViewer, createFileObject } from '@yly/search-viewer'
import type { FileViewerConfig } from '@yly/search-viewer'

const fileObject = createFileObject('https://example.com/document.pdf', {
  meta: {
    title: '示例文档',
    author: '作者'
  }
})

const config: FileViewerConfig = {
  theme: 'light',
  toolbar: true,
  zoom: 1.0
}
</script>
```

## 📖 API 文档

### FileViewer 组件

核心文件预览组件，自动根据文件类型选择合适的预览器。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `file` | `FileObject` | - | 文件对象（必需） |
| `config` | `FileViewerConfig` | `{}` | 配置选项 |
| `loading` | `boolean` | `false` | 加载状态 |
| `error` | `string \| null` | `null` | 错误信息 |

#### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `load` | `(file: FileObject)` | 文件加载完成 |
| `error` | `(error: Error)` | 文件加载失败 |
| `progress` | `(loaded: number, total: number)` | 加载进度 |
| `ready` | `()` | 组件准备就绪 |

#### Slots

| 插槽名 | 参数 | 说明 |
|--------|------|------|
| `toolbar` | `{ file, config }` | 自定义工具栏 |
| `error` | `{ error }` | 自定义错误显示 |

### 支持的文件类型

- **图片**: JPG, JPEG, PNG, GIF, WebP, SVG, BMP
- **PDF**: PDF 文档
- **视频**: MP4, WebM, OGG, AVI, MOV, M3U8 (HLS)
- **Office**: DOCX, XLSX, PPTX
- **文本**: TXT, MD, JSON, XML, HTML, CSS, JS, TS

## 🎮 示例

查看完整的示例应用：

```bash
git clone https://github.com/jiuyuehe/yly-search-viewer.git
cd yly-search-viewer
npm install
npm run dev
```

## 📄 许可证

[MIT License](./LICENSE)