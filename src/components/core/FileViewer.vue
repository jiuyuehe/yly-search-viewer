<template>
  <div
    :class="[
      'file-viewer',
      `file-viewer--${currentTheme}`,
      config?.className
    ]"
    :style="themeVars"
  >
    <!-- Loading State -->
    <div v-if="loading" class="file-viewer__loading">
      <el-skeleton animated>
        <template #template>
          <el-skeleton-item variant="rect" style="width: 100%; height: 400px" />
        </template>
      </el-skeleton>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="file-viewer__error">
      <slot name="error" :error="error">
        <el-result icon="error" :title="error">
          <template #extra>
            <el-button type="primary" @click="retry">
              <el-icon><Refresh /></el-icon>
              重试
            </el-button>
          </template>
        </el-result>
      </slot>
    </div>

    <!-- File Preview -->
    <div v-else class="file-viewer__content">
      <!-- Toolbar -->
      <div v-if="config?.toolbar !== false" class="file-viewer__toolbar">
        <div class="file-viewer__toolbar-left">
          <el-tag :type="getFileTypeTagType(file.type)">
            {{ file.type.toUpperCase() }}
          </el-tag>
          <span v-if="file.meta?.title" class="file-viewer__title">
            {{ file.meta.title }}
          </span>
        </div>
        
        <div class="file-viewer__toolbar-right">
          <slot name="toolbar" :file="file" :config="config">
            <el-button-group size="small">
              <el-tooltip content="缩小">
                <el-button @click="zoomOut">
                  <el-icon><ZoomOut /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="重置">
                <el-button @click="resetZoom">
                  {{ Math.round(currentZoom * 100) }}%
                </el-button>
              </el-tooltip>
              <el-tooltip content="放大">
                <el-button @click="zoomIn">
                  <el-icon><ZoomIn /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="下载">
                <el-button @click="downloadFile">
                  <el-icon><Download /></el-icon>
                </el-button>
              </el-tooltip>
            </el-button-group>
          </slot>
        </div>
      </div>

      <!-- Preview Component -->
      <div class="file-viewer__preview">
        <component
          :is="previewComponent"
          :file="file"
          :config="mergedConfig"
          :zoom="currentZoom"
          @load="handleLoad"
          @error="handleError"
          @progress="handleProgress"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, defineAsyncComponent } from 'vue'
import { ElSkeleton, ElSkeletonItem, ElResult, ElButton, ElIcon, ElTag, ElButtonGroup, ElTooltip } from 'element-plus'
import { Refresh, ZoomOut, ZoomIn, Download } from '@element-plus/icons-vue'
import type { FileObject, FileViewerConfig, PreviewerEmits } from '../types'
import { validateFileObject } from '../../utils/file'
import { themes } from '../../types'

// Async component imports for code splitting
const ImagePreview = defineAsyncComponent(() => import('../preview/ImagePreview.vue'))
const PdfPreview = defineAsyncComponent(() => import('../preview/PdfPreview.vue'))
const VideoPreview = defineAsyncComponent(() => import('../preview/VideoPreview.vue'))
const OfficePreview = defineAsyncComponent(() => import('../preview/OfficePreview.vue'))
const TextPreview = defineAsyncComponent(() => import('../preview/TextPreview.vue'))

interface Props {
  file: FileObject
  config?: FileViewerConfig
  loading?: boolean
  error?: string | null
}

interface Emits {
  (e: 'load', file: FileObject): void
  (e: 'error', error: Error): void
  (e: 'progress', loaded: number, total: number): void
  (e: 'ready'): void
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({}),
  loading: false,
  error: null
})

const emit = defineEmits<Emits>()

// Reactive state
const currentZoom = ref(props.config?.zoom || 1)
const internalError = ref<string | null>(null)

// Computed properties
const mergedConfig = computed(() => ({
  theme: 'light',
  toolbar: true,
  zoom: 1,
  preload: false,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  cache: true,
  ...props.config
}))

const currentTheme = computed(() => {
  const theme = mergedConfig.value.theme
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme || 'light'
})

const themeVars = computed(() => {
  const theme = themes[currentTheme.value]
  return {
    '--file-viewer-primary': theme.primary,
    '--file-viewer-background': theme.background,
    '--file-viewer-surface': theme.surface,
    '--file-viewer-text': theme.text,
    '--file-viewer-border': theme.border,
    '--file-viewer-shadow': theme.shadow
  }
})

const error = computed(() => props.error || internalError.value)

const previewComponent = computed(() => {
  switch (props.file.type) {
    case 'image':
      return ImagePreview
    case 'pdf':
      return PdfPreview
    case 'video':
      return VideoPreview
    case 'office':
      return OfficePreview
    case 'text':
      return TextPreview
    default:
      return TextPreview // Fallback
  }
})

// Methods
function getFileTypeTagType(type: string) {
  const typeMap: Record<string, string> = {
    pdf: 'danger',
    image: 'success',
    video: 'warning',
    office: 'info',
    text: 'primary'
  }
  return typeMap[type] || 'info'
}

function zoomIn() {
  currentZoom.value = Math.min(currentZoom.value + 0.25, 5)
}

function zoomOut() {
  currentZoom.value = Math.max(currentZoom.value - 0.25, 0.1)
}

function resetZoom() {
  currentZoom.value = mergedConfig.value.zoom || 1
}

function downloadFile() {
  const link = document.createElement('a')
  link.href = props.file.url
  link.download = props.file.meta?.title || 'download'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function retry() {
  internalError.value = null
  emit('ready')
}

// Event handlers
function handleLoad(file: FileObject) {
  internalError.value = null
  emit('load', file)
}

function handleError(error: Error) {
  internalError.value = error.message
  emit('error', error)
}

function handleProgress(loaded: number, total: number) {
  emit('progress', loaded, total)
}

// Validation and lifecycle
onMounted(() => {
  const validation = validateFileObject(props.file)
  if (!validation.valid) {
    internalError.value = validation.error || 'Invalid file object'
    return
  }
  
  emit('ready')
})

// Watch for file changes
watch(() => props.file, () => {
  internalError.value = null
  const validation = validateFileObject(props.file)
  if (!validation.valid) {
    internalError.value = validation.error || 'Invalid file object'
  }
}, { deep: true })
</script>

<style scoped>
.file-viewer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--file-viewer-background);
  color: var(--file-viewer-text);
  border: 1px solid var(--file-viewer-border);
  border-radius: 8px;
  overflow: hidden;
}

.file-viewer__loading,
.file-viewer__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  background-color: var(--file-viewer-surface);
}

.file-viewer__content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.file-viewer__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--file-viewer-surface);
  border-bottom: 1px solid var(--file-viewer-border);
  flex-shrink: 0;
}

.file-viewer__toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-viewer__toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-viewer__title {
  font-weight: 500;
  font-size: 14px;
  color: var(--file-viewer-text);
}

.file-viewer__preview {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Theme variations */
.file-viewer--dark {
  box-shadow: 0 4px 6px var(--file-viewer-shadow);
}

.file-viewer--light {
  box-shadow: 0 2px 4px var(--file-viewer-shadow);
}
</style>