# YLY Search Viewer 项目架构文档

## 项目概述

基于Vue3的企业级文件搜索和预览系统，集成AI工具链，提供完整的文档管理解决方案。

## 总体架构

```
YLY Search Viewer
├── 高级搜索界面 (Advanced Search)
├── 文件预览界面 (File Preview) ✅ 已实现
└── AI 工具集成 (AI Tools)
```

## 功能模块设计

### 1. 高级搜索界面 (AdvancedSearch.vue)

#### 1.1 布局结构
```
┌─────────────────────────────────────────────────────┐
│                    搜索标题栏                        │
├──────────────┬──────────────────────────────────────┤
│              │          主搜索框                     │
│   过滤面板    │  ┌────────────────────────────────┐  │
│              │  │  聊天机器人风格搜索框           │  │
│ - 文件空间    │  └────────────────────────────────┘  │
│ - 创建人员    ├──────────────────────────────────────┤
│ - 标签过滤    │        搜索结果聚合标签               │
│ - 格式过滤    │  [全部][文档][图片][多媒体][其他]     │
│ - 时间过滤    ├──────────────────────────────────────┤
│ - 大小过滤    │           搜索结果列表                │
│ - 版本过滤    │  ☐ 文件名 | 内容摘要 | 路径 | 评分   │
│              │  ☐ 文件名 | 内容摘要 | 路径 | 评分   │
│ [展开/收起]   │  ☐ 文件名 | 内容摘要 | 路径 | 评分   │
│              ├──────────────────────────────────────┤
│              │    分页控件 | [下载] [导出]           │
└──────────────┴──────────────────────────────────────┘
```

#### 1.2 组件结构
```typescript
// components/search/
├── AdvancedSearch.vue           // 主搜索页面
├── SearchFilters.vue           // 过滤面板
├── SearchBox.vue               // 搜索框组件
├── SearchResults.vue           // 结果列表
├── SearchTabs.vue              // 结果分类标签
└── SearchPagination.vue        // 分页组件
```

#### 1.3 数据流设计
```typescript
interface SearchState {
  query: string                 // 搜索查询
  filters: SearchFilters        // 过滤条件
  results: SearchResult[]       // 搜索结果
  pagination: PaginationInfo    // 分页信息
  selectedItems: string[]       // 选中项目
  loading: boolean             // 加载状态
}

interface SearchFilters {
  workspace: string[]          // 文件空间
  authors: string[]            // 创建人员
  tags: string[]               // 标签
  formats: string[]            // 格式
  dateRange: [Date, Date]      // 时间范围
  sizeRange: [number, number]  // 大小范围
  versions: string[]           // 版本
}
```

### 2. 文件预览界面 (FilePreview.vue) ✅ 已实现

#### 2.1 布局结构
```
┌─────────────────────────────────────────────────────┐
│  Header: [图标] 文件标题 [控制按钮] [操作按钮]       │
├─────────────────────────────────────────────────────┤
│                   Content Area                      │
│ ┌─────────────────┬─────────┬─────────────────────┐ │
│ │                 │         │                     │ │
│ │   文件预览区     │ AI工具栏 │    文本抽取/翻译     │ │
│ │                 │  80px   │      (可选显示)      │ │
│ │  - PDF预览      │         │                     │ │
│ │  - 图片查看      │ [摘要] │   - 原文编辑器      │ │
│ │  - 视频播放      │ [标签] │   - 翻译编辑器      │ │
│ │  - Office文档   │ [实体] │   - 同步滚动        │ │
│ │  - 文本编辑      │ [抽取] │                     │ │
│ │                 │ [问答] │                     │ │
│ │                 │ [翻译] │                     │ │
│ └─────────────────┴─────────┴─────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### 2.2 已实现组件
```typescript
// ✅ 已完成的核心组件
components/
├── core/
│   └── FileViewer.vue          // 统一文件预览组件
└── preview/
    ├── ImagePreview.vue        // 图片预览 ✅
    ├── PdfPreview.vue          // PDF预览 ✅
    ├── VideoPreview.vue        // 视频播放 ✅
    ├── OfficePreview.vue       // Office文档 ✅
    └── TextPreview.vue         // 文本编辑 ✅
```

#### 2.3 待实现组件
```typescript
// 📋 待开发的AI工具组件
components/
├── ai/
│   ├── AISidebar.vue          // AI工具侧边栏
│   ├── SummaryPanel.vue       // 摘要面板
│   ├── TagsPanel.vue          // 标签面板
│   ├── EntityPanel.vue        // 实体抽取面板
│   ├── CustomExtract.vue      // 自定义抽取
│   ├── QAPanel.vue            // 问答面板
│   └── TranslationPanel.vue   // 翻译面板
└── text/
    ├── TextExtractor.vue      // 文本抽取
    └── TranslationEditor.vue  // 翻译编辑器
```

### 3. AI 工具集成 (AI Tools)

#### 3.1 AI工具栏设计
```
┌─────────┐
│  [摘要]  │ ← 点击展开300px右侧栏
├─────────┤
│  [标签]  │ ← 显示文档标签
├─────────┤
│  [实体]  │ ← NER信息提取
├─────────┤
│  [抽取]  │ ← 自定义信息抽取
├─────────┤
│  [问答]  │ ← 文档问答对话
├─────────┤
│  [翻译]  │ ← 进入翻译模式
└─────────┘
```

#### 3.2 AI服务接口设计
```typescript
// services/ai/
interface AIService {
  // 流式输出接口
  generateSummary(docId: string): AsyncGenerator<string>
  extractTags(docId: string): AsyncGenerator<string[]>
  extractEntities(docId: string): AsyncGenerator<Entity[]>
  customExtract(docId: string, template: ExtractTemplate): AsyncGenerator<any>
  translateText(text: string, target: string): AsyncGenerator<string>
  
  // 问答接口
  chatWithDocument(docId: string, question: string): AsyncGenerator<string>
}
```

#### 3.3 状态管理设计
```typescript
// stores/
├── search.ts              // 搜索状态管理
├── preview.ts             // 预览状态管理
├── ai.ts                  // AI工具状态
└── user.ts                // 用户状态

// AI状态示例
interface AIState {
  summary: {
    content: string
    loading: boolean
    error: string | null
  }
  tags: string[]
  entities: Entity[]
  customExtracts: Record<string, any>
  translations: Record<string, string>
  chatHistory: ChatMessage[]
}
```

## 技术实现方案

### 1. 前端技术栈 ✅ 已实现

```json
{
  "framework": "Vue3 + Composition API",
  "build": "Vite",
  "ui": "Element Plus",
  "language": "TypeScript",
  "state": "Pinia",
  "http": "Axios",
  "preview": {
    "pdf": "PDF.js",
    "office": "vue-office",
    "video": "HLS.js",
    "text": "Milkdown (计划中)"
  }
}
```

### 2. 流式输出实现

```typescript
// utils/stream.ts
class StreamHandler {
  async handleAIStream(
    endpoint: string, 
    payload: any, 
    onChunk: (chunk: string) => void
  ) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(payload)
    })

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader!.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      onChunk(chunk)
    }
  }
}
```

### 3. 权限管理系统

```typescript
// components/access/
├── AccessRequest.vue        // 权限申请模态框
├── PermissionGuard.vue      // 权限守卫组件
└── AccessDenied.vue         // 无权限提示

interface AccessRequest {
  fileId: string
  requestType: 'view' | 'edit' | 'download'
  reason: string
  urgency: 'low' | 'medium' | 'high'
}
```

## 响应式设计方案

### 1. 断点设计
```scss
$breakpoints: (
  'mobile': 768px,
  'tablet': 1024px,
  'desktop': 1200px,
  'wide': 1440px
);
```

### 2. 布局适配
```typescript
// Mobile (< 768px)
- 单栏布局
- 工具栏收起
- 触摸优化

// Tablet (768px - 1024px)  
- 双栏布局
- 侧边栏可折叠
- 手势支持

// Desktop (> 1024px)
- 多栏布局
- 完整功能显示
- 键盘快捷键
```

## 开发里程碑

### Phase 1: 文件预览核心 ✅ 已完成
- [x] 统一文件预览组件
- [x] 多格式支持 (PDF, 图片, 视频, Office, 文本)
- [x] 主题系统
- [x] TypeScript 类型定义
- [x] 基础示例应用

### Phase 2: AI工具集成 📋 待开发
- [ ] AI工具侧边栏
- [ ] 摘要生成 (流式输出)
- [ ] 标签提取
- [ ] 实体识别 (NER)
- [ ] 自定义信息抽取
- [ ] 文档问答

### Phase 3: 搜索系统 📋 待开发
- [ ] 高级搜索界面
- [ ] 过滤面板
- [ ] 搜索结果展示
- [ ] 分页和批量操作

### Phase 4: 系统集成 📋 待开发
- [ ] 权限管理
- [ ] 翻译功能
- [ ] 响应式优化
- [ ] 性能优化

## 文件结构

```
src/
├── components/
│   ├── core/              ✅ 核心组件 (已完成)
│   ├── preview/           ✅ 预览组件 (已完成)
│   ├── search/            📋 搜索组件 (待开发)
│   ├── ai/                📋 AI工具 (待开发)
│   ├── text/              📋 文本处理 (待开发)
│   └── access/            📋 权限管理 (待开发)
├── stores/                📋 状态管理 (待开发)
├── services/              📋 API服务 (待开发)
├── utils/                 ✅ 工具函数 (部分完成)
├── types/                 ✅ 类型定义 (已完成)
└── styles/                ✅ 样式系统 (已完成)
```

## 总结

当前项目已完成了文件预览系统的核心功能，建立了良好的组件架构和类型系统。下一步需要重点开发AI工具集成和搜索功能，最终实现完整的企业级文档管理系统。