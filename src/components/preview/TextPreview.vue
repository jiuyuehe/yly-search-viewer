<template>
  <div class="text-preview">
    <!-- Loading State -->
    <div v-if="loading" class="text-preview__loading" v-loading="loading" element-loading-text="加载文本中...">
      <div style="height: 400px;"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-preview__error">
      <el-result icon="error" title="文本加载失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="retry">重试</el-button>
        </template>
      </el-result>
    </div>

    <!-- Text Content -->
    <div v-else class="text-preview__content">
      <!-- Controls -->
      <div class="text-preview__controls">
        <div class="text-preview__controls-left">
          <el-tag :type="getTextTypeTag(textType)">
            {{ getTextTypeName(textType) }}
          </el-tag>
          <span v-if="file.meta?.title" class="text-preview__title">
            {{ file.meta.title }}
          </span>
        </div>

        <div class="text-preview__controls-center">
          <el-input
            v-model="searchText"
            placeholder="搜索文本..."
            size="small"
            style="width: 200px"
            @input="handleSearch"
          >
            <template #append>
              <el-button @click="handleSearch">
                <el-icon><Search /></el-icon>
              </el-button>
            </template>
          </el-input>
          
          <div v-if="searchResults.length > 0" class="text-preview__search-info">
            <el-button-group size="small">
              <el-button @click="prevSearchResult">
                <el-icon><ArrowUp /></el-icon>
              </el-button>
              <el-button @click="nextSearchResult">
                <el-icon><ArrowDown /></el-icon>
              </el-button>
            </el-button-group>
            <span>{{ currentSearchIndex + 1 }} / {{ searchResults.length }}</span>
          </div>
        </div>

        <div class="text-preview__controls-right">
          <el-button-group size="small">
            <el-tooltip content="减小字体">
              <el-button @click="decreaseFontSize">
                <el-icon><Minus /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="字体大小">
              <el-button>
                {{ fontSize }}px
              </el-button>
            </el-tooltip>
            <el-tooltip content="增大字体">
              <el-button @click="increaseFontSize">
                <el-icon><Plus /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="自动换行">
              <el-button :type="wordWrap ? 'primary' : 'default'" @click="toggleWordWrap">
                <el-icon><Document /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip v-if="isEditable" content="编辑模式">
              <el-button :type="editMode ? 'primary' : 'default'" @click="toggleEditMode">
                <el-icon><Edit /></el-icon>
              </el-button>
            </el-tooltip>
          </el-button-group>
        </div>
      </div>

      <!-- Text Editor/Viewer -->
      <div class="text-preview__viewer" ref="viewerRef">
        <!-- Milkdown Editor for Markdown -->
        <div
          v-if="textType === 'markdown' && editMode"
          ref="milkdownRef"
          class="text-preview__milkdown"
        ></div>

        <!-- Code Editor for programming languages -->
        <div
          v-else-if="isCodeFile"
          class="text-preview__code"
          :style="codeStyle"
        >
          <pre><code :class="`language-${getLanguageClass()}`" v-html="highlightedCode"></code></pre>
        </div>

        <!-- Rich text display for HTML -->
        <div
          v-else-if="textType === 'html'"
          class="text-preview__html"
          v-html="sanitizedHtml"
        ></div>

        <!-- JSON viewer -->
        <div
          v-else-if="textType === 'json'"
          class="text-preview__json"
          :style="textStyle"
        >
          <pre>{{ formattedJson }}</pre>
        </div>

        <!-- Plain text viewer/editor -->
        <div
          v-else
          class="text-preview__text"
          :style="textStyle"
        >
          <el-input
            v-if="editMode"
            v-model="textContent"
            type="textarea"
            :autosize="{ minRows: 20 }"
            placeholder="开始输入..."
          />
          <pre v-else v-html="highlightedText"></pre>
        </div>
      </div>

      <!-- Text Information -->
      <div class="text-preview__info">
        <el-descriptions :column="4" size="small" border>
          <el-descriptions-item label="类型">
            {{ getTextTypeName(textType) }}
          </el-descriptions-item>
          <el-descriptions-item label="字符数">
            {{ textContent.length.toLocaleString() }}
          </el-descriptions-item>
          <el-descriptions-item label="行数">
            {{ lineCount.toLocaleString() }}
          </el-descriptions-item>
          <el-descriptions-item v-if="file.meta?.size" label="文件大小">
            {{ formatFileSize(file.meta.size) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import {
  ElButton,
  ElButtonGroup,
  ElIcon,
  ElTooltip,
  ElResult,
  ElTag,
  ElInput,
  ElDescriptions,
  ElDescriptionsItem
} from 'element-plus'
import {
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  Document,
  Edit
} from '@element-plus/icons-vue'
import type { FileObject, FileViewerConfig } from '../../types'
import { getFileExtension, formatFileSize } from '../../utils/file'

// Import Milkdown for Markdown editing (optional)
// import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
// import { nord } from '@milkdown/theme-nord'
// import { VueEditor, useEditor } from '@milkdown/vue'
// import { commonmark } from '@milkdown/preset-commonmark'

interface Props {
  file: FileObject
  config?: FileViewerConfig
  zoom?: number
  editable?: boolean
}

interface Emits {
  (e: 'load', file: FileObject): void
  (e: 'error', error: Error): void
  (e: 'progress', loaded: number, total: number): void
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({}),
  zoom: 1,
  editable: false
})

const emit = defineEmits<Emits>()

// Reactive state
const loading = ref(true)
const error = ref<string | null>(null)
const textContent = ref('')
const searchText = ref('')
const searchResults = ref<Array<{ start: number; end: number }>>([])
const currentSearchIndex = ref(0)
const fontSize = ref(14)
const wordWrap = ref(true)
const editMode = ref(false)

// Refs
const viewerRef = ref<HTMLElement>()
const milkdownRef = ref<HTMLElement>()

// Computed
const textType = computed(() => {
  const extension = getFileExtension(props.file.url)
  
  const typeMap: Record<string, string> = {
    md: 'markdown',
    markdown: 'markdown',
    html: 'html',
    htm: 'html',
    json: 'json',
    js: 'javascript',
    ts: 'typescript',
    css: 'css',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml'
  }
  
  return typeMap[extension] || 'text'
})

const isCodeFile = computed(() => {
  const codeExtensions = ['js', 'ts', 'css', 'xml', 'yaml', 'yml']
  return codeExtensions.includes(getFileExtension(props.file.url))
})

const isEditable = computed(() => {
  return props.editable && ['text', 'markdown', 'json'].includes(textType.value)
})

const lineCount = computed(() => {
  return textContent.value.split('\n').length
})

const textStyle = computed(() => ({
  fontSize: `${fontSize.value}px`,
  whiteSpace: wordWrap.value ? 'pre-wrap' : 'pre',
  fontFamily: isCodeFile.value ? 'Monaco, Consolas, "Courier New", monospace' : 'inherit'
}))

const codeStyle = computed(() => ({
  fontSize: `${fontSize.value}px`,
  fontFamily: 'Monaco, Consolas, "Courier New", monospace'
}))

const formattedJson = computed(() => {
  if (textType.value !== 'json') return textContent.value
  
  try {
    const parsed = JSON.parse(textContent.value)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return textContent.value
  }
})

const sanitizedHtml = computed(() => {
  if (textType.value !== 'html') return ''
  
  // Basic XSS protection - in production, use a proper sanitization library
  const temp = document.createElement('div')
  temp.innerHTML = textContent.value
  
  // Remove script tags and event handlers
  const scripts = temp.querySelectorAll('script')
  scripts.forEach(script => script.remove())
  
  const elements = temp.querySelectorAll('*')
  elements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name)
      }
    })
  })
  
  return temp.innerHTML
})

const highlightedCode = computed(() => {
  // Simple syntax highlighting - in production, use a proper library like Prism.js
  return textContent.value
})

const highlightedText = computed(() => {
  let text = textContent.value
  
  // Apply search highlights
  if (searchText.value && searchResults.value.length > 0) {
    const highlights: Array<{ start: number; end: number; isCurrent: boolean }> = searchResults.value.map((result, index) => ({
      ...result,
      isCurrent: index === currentSearchIndex.value
    }))
    
    // Sort by start position in reverse order to avoid offset issues
    highlights.sort((a, b) => b.start - a.start)
    
    highlights.forEach(highlight => {
      const before = text.slice(0, highlight.start)
      const match = text.slice(highlight.start, highlight.end)
      const after = text.slice(highlight.end)
      
      const className = highlight.isCurrent ? 'highlight current' : 'highlight'
      text = before + `<span class="${className}">${match}</span>` + after
    })
  }
  
  return text
})

// Methods
function getTextTypeTag(type: string): string {
  const tagMap: Record<string, string> = {
    markdown: 'primary',
    html: 'success',
    json: 'warning',
    javascript: 'info',
    typescript: 'info',
    css: 'danger',
    text: 'info'
  }
  return tagMap[type] || 'info'
}

function getTextTypeName(type: string): string {
  const nameMap: Record<string, string> = {
    markdown: 'Markdown',
    html: 'HTML',
    json: 'JSON',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    css: 'CSS',
    xml: 'XML',
    yaml: 'YAML',
    text: '纯文本'
  }
  return nameMap[type] || '文本文件'
}

function getLanguageClass(): string {
  const extension = getFileExtension(props.file.url)
  const langMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    css: 'css',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml'
  }
  return langMap[extension] || extension
}

async function loadTextContent() {
  try {
    loading.value = true
    error.value = null
    
    const response = await fetch(props.file.url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const text = await response.text()
    textContent.value = text
    
    loading.value = false
    emit('load', props.file)
  } catch (err: any) {
    loading.value = false
    error.value = err.message || '文本加载失败'
    emit('error', err)
  }
}

function handleSearch() {
  if (!searchText.value.trim()) {
    searchResults.value = []
    currentSearchIndex.value = 0
    return
  }
  
  const text = textContent.value.toLowerCase()
  const query = searchText.value.toLowerCase()
  const results: Array<{ start: number; end: number }> = []
  
  let index = 0
  while ((index = text.indexOf(query, index)) !== -1) {
    results.push({
      start: index,
      end: index + query.length
    })
    index += query.length
  }
  
  searchResults.value = results
  currentSearchIndex.value = 0
  
  if (results.length > 0) {
    scrollToSearchResult(0)
  }
}

function prevSearchResult() {
  if (searchResults.value.length === 0) return
  
  currentSearchIndex.value = currentSearchIndex.value > 0 
    ? currentSearchIndex.value - 1 
    : searchResults.value.length - 1
    
  scrollToSearchResult(currentSearchIndex.value)
}

function nextSearchResult() {
  if (searchResults.value.length === 0) return
  
  currentSearchIndex.value = currentSearchIndex.value < searchResults.value.length - 1 
    ? currentSearchIndex.value + 1 
    : 0
    
  scrollToSearchResult(currentSearchIndex.value)
}

function scrollToSearchResult(index: number) {
  // Implementation would scroll to the specific result
  console.log('Scrolling to search result:', index)
}

function increaseFontSize() {
  fontSize.value = Math.min(fontSize.value + 2, 32)
}

function decreaseFontSize() {
  fontSize.value = Math.max(fontSize.value - 2, 10)
}

function toggleWordWrap() {
  wordWrap.value = !wordWrap.value
}

function toggleEditMode() {
  if (!isEditable.value) return
  editMode.value = !editMode.value
  
  if (editMode.value && textType.value === 'markdown') {
    nextTick(() => {
      initMilkdown()
    })
  }
}

async function initMilkdown() {
  if (!milkdownRef.value) return
  
  console.log('Milkdown initialization disabled in this demo')
  // TODO: Implement Milkdown when dependencies are available
  
  /*
  try {
    const editor = Editor.make()
      .config(ctx => {
        ctx.set(rootCtx, milkdownRef.value)
        ctx.set(defaultValueCtx, textContent.value)
      })
      .use(nord)
      .use(commonmark)
    
    await editor.create()
  } catch (err) {
    console.error('Failed to initialize Milkdown:', err)
  }
  */
}

function retry() {
  loadTextContent()
}

// Lifecycle
onMounted(() => {
  loadTextContent()
})

// Watch for search text changes
watch(searchText, () => {
  if (searchText.value.length > 2) {
    handleSearch()
  } else {
    searchResults.value = []
    currentSearchIndex.value = 0
  }
})
</script>

<style scoped>
.text-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--file-viewer-background);
}

.text-preview__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.text-preview__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.text-preview__content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.text-preview__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--file-viewer-surface);
  border-bottom: 1px solid var(--file-viewer-border);
  flex-shrink: 0;
}

.text-preview__controls-left,
.text-preview__controls-center,
.text-preview__controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.text-preview__title {
  font-weight: 500;
  font-size: 14px;
  color: var(--file-viewer-text);
}

.text-preview__search-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--file-viewer-text);
}

.text-preview__viewer {
  flex: 1;
  overflow: auto;
  background-color: var(--file-viewer-background);
  position: relative;
}

.text-preview__milkdown,
.text-preview__code,
.text-preview__html,
.text-preview__json,
.text-preview__text {
  width: 100%;
  height: 100%;
  padding: 16px;
}

.text-preview__code pre,
.text-preview__json pre,
.text-preview__text pre {
  margin: 0;
  white-space: inherit;
  word-wrap: break-word;
  color: var(--file-viewer-text);
  line-height: 1.5;
}

.text-preview__html {
  color: var(--file-viewer-text);
  line-height: 1.6;
}

.text-preview__info {
  padding: 16px;
  background-color: var(--file-viewer-surface);
  border-top: 1px solid var(--file-viewer-border);
  flex-shrink: 0;
}

/* Search highlight styles */
:deep(.highlight) {
  background-color: yellow;
  color: black;
}

:deep(.highlight.current) {
  background-color: orange;
  color: black;
}

/* Milkdown styles */
.text-preview__milkdown {
  height: 100%;
}

:deep(.milkdown) {
  height: 100%;
}

/* Custom scrollbar */
.text-preview__viewer::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.text-preview__viewer::-webkit-scrollbar-track {
  background: var(--file-viewer-surface);
}

.text-preview__viewer::-webkit-scrollbar-thumb {
  background: var(--file-viewer-border);
  border-radius: 4px;
}

.text-preview__viewer::-webkit-scrollbar-thumb:hover {
  background: var(--file-viewer-text);
}
</style>