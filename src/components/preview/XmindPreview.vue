<template>
  <div class="xmind-preview">
    <!-- Loading State -->
    <div v-if="loading" class="xmind-preview__loading" v-loading="loading" element-loading-text="加载思维导图中...">
      <div style="height: 400px;"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="xmind-preview__error">
      <el-result icon="error" title="思维导图加载失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="retry">重试</el-button>
        </template>
      </el-result>
    </div>

    <!-- XMind Content -->
    <div v-else class="xmind-preview__content">
      <!-- Controls -->
      <div class="xmind-preview__controls">
        <div class="xmind-preview__controls-left">
          <el-tag type="warning">XMind</el-tag>
          <span v-if="file.meta?.title" class="xmind-preview__title">
            {{ file.meta.title }}
          </span>
        </div>
        <div class="xmind-preview__controls-right">
          <el-button-group size="small">
            <el-tooltip content="适应窗口">
              <el-button @click="fitToWindow">
                <el-icon><FullScreen /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="放大">
              <el-button @click="zoomIn">
                <el-icon><ZoomIn /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="缩小">
              <el-button @click="zoomOut">
                <el-icon><ZoomOut /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="重置缩放">
              <el-button @click="resetZoom">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </el-tooltip>
          </el-button-group>
          <el-select
            v-if="sheets.length > 1"
            v-model="currentSheetId"
            size="small"
            @change="switchSheet"
            style="margin-left: 8px; width: 120px;"
          >
            <el-option
              v-for="sheet in sheets"
              :key="sheet.id"
              :label="sheet.title || '未命名'"
              :value="sheet.id"
            />
          </el-select>
        </div>
      </div>

      <!-- XMind Viewer Container -->
      <div ref="viewerContainer" class="xmind-preview__viewer"></div>

      <!-- Info Panel -->
      <div v-if="showInfo" class="xmind-preview__info">
        <div class="xmind-preview__info-item">
          <span class="label">缩放比例:</span>
          <span class="value">{{ Math.round(zoomScale) }}%</span>
        </div>
        <div class="xmind-preview__info-item">
          <span class="label">工作表:</span>
          <span class="value">{{ sheets.length }} 个</span>
        </div>
        <div v-if="file.meta?.size" class="xmind-preview__info-item">
          <span class="label">文件大小:</span>
          <span class="value">{{ formatFileSize(file.meta.size) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import {
  ElResult,
  ElButton,
  ElTag,
  ElButtonGroup,
  ElTooltip,
  ElSelect,
  ElOption,
  ElIcon
} from 'element-plus'
import {
  FullScreen,
  ZoomIn,
  ZoomOut,
  Refresh
} from '@element-plus/icons-vue'
import type { FileObject, FileViewerConfig } from '../../types'
import { formatFileSize } from '../../utils/file'

// Import XMind Embed Viewer
import { XMindEmbedViewer } from 'xmind-embed-viewer'

interface Sheet {
  id: string
  title: string
}

interface Props {
  file: FileObject
  config?: FileViewerConfig
  zoom?: number
}

interface Emits {
  (e: 'load', file: FileObject): void
  (e: 'error', error: Error): void
  (e: 'progress', loaded: number, total: number): void
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({}),
  zoom: 1
})

const emit = defineEmits<Emits>()

// Reactive state
const loading = ref(true)
const error = ref<string | null>(null)
const showInfo = ref(true)
const viewerContainer = ref<HTMLElement>()
const viewer = ref<XMindEmbedViewer | null>(null)
const sheets = ref<Sheet[]>([])
const currentSheetId = ref<string>('')
const zoomScale = ref(100)

// Computed
const showControls = computed(() => props.config?.toolbar !== false)

// Methods
async function loadXMindFile() {
  if (!props.file.url || !viewerContainer.value) return

  try {
    loading.value = true
    error.value = null

    // Initialize XMind viewer
    viewer.value = new XMindEmbedViewer({
      el: viewerContainer.value,
      // Use Chinese region if needed for better performance in China
      // region: 'cn'
    })

    // Add event listeners
    viewer.value.addEventListener('map-ready', handleMapReady)
    viewer.value.addEventListener('zoom-change', handleZoomChange)
    viewer.value.addEventListener('sheet-switch', handleSheetSwitch)
    viewer.value.addEventListener('sheets-load', handleSheetsLoad)

    // Fetch and load the file
    const response = await fetch(props.file.url)
    if (!response.ok) {
      throw new Error(`Failed to fetch XMind file: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    await viewer.value.load(arrayBuffer)

    emit('load', props.file)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    error.value = errorMessage
    emit('error', new Error(errorMessage))
  } finally {
    loading.value = false
  }
}

function handleMapReady() {
  loading.value = false
  if (viewer.value) {
    zoomScale.value = viewer.value.zoomScale
    // Apply initial zoom if provided
    if (props.zoom && props.zoom !== 1) {
      viewer.value.setZoomScale(props.zoom * 100)
    }
  }
}

function handleZoomChange(event: any) {
  zoomScale.value = event.scale || 100
}

function handleSheetSwitch(event: any) {
  currentSheetId.value = event.sheetId || ''
}

function handleSheetsLoad(event: any) {
  if (event.sheets && Array.isArray(event.sheets)) {
    sheets.value = event.sheets.map((sheet: any) => ({
      id: sheet.id,
      title: sheet.title || 'Untitled'
    }))
    if (sheets.value.length > 0) {
      currentSheetId.value = sheets.value[0].id
    }
  }
}

function fitToWindow() {
  viewer.value?.setFitMap()
}

function zoomIn() {
  if (viewer.value) {
    const newScale = Math.min(500, zoomScale.value + 25)
    viewer.value.setZoomScale(newScale)
  }
}

function zoomOut() {
  if (viewer.value) {
    const newScale = Math.max(50, zoomScale.value - 25)
    viewer.value.setZoomScale(newScale)
  }
}

function resetZoom() {
  viewer.value?.setZoomScale(100)
}

function switchSheet(sheetId: string) {
  viewer.value?.switchSheet(sheetId)
}

function retry() {
  error.value = null
  nextTick(() => {
    loadXMindFile()
  })
}

// Lifecycle
onMounted(() => {
  nextTick(() => {
    loadXMindFile()
  })
})

onUnmounted(() => {
  if (viewer.value) {
    viewer.value.removeEventListener('map-ready', handleMapReady)
    viewer.value.removeEventListener('zoom-change', handleZoomChange)
    viewer.value.removeEventListener('sheet-switch', handleSheetSwitch)
    viewer.value.removeEventListener('sheets-load', handleSheetsLoad)
  }
})
</script>

<style scoped>
.xmind-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--file-viewer-background);
}

.xmind-preview__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.xmind-preview__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.xmind-preview__content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.xmind-preview__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--file-viewer-surface);
  border-bottom: 1px solid var(--file-viewer-border);
  flex-shrink: 0;
}

.xmind-preview__controls-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.xmind-preview__controls-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.xmind-preview__title {
  font-weight: 500;
  font-size: 14px;
  color: var(--file-viewer-text);
}

.xmind-preview__viewer {
  flex: 1;
  min-height: 400px;
  background-color: #f5f5f5;
  position: relative;
}

.xmind-preview__info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background-color: var(--file-viewer-surface);
  border-top: 1px solid var(--file-viewer-border);
  font-size: 12px;
  color: var(--file-viewer-text);
  flex-shrink: 0;
}

.xmind-preview__info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.xmind-preview__info-item .label {
  color: var(--file-viewer-text);
  opacity: 0.7;
}

.xmind-preview__info-item .value {
  font-weight: 500;
}

/* Dark theme adjustments */
.file-viewer--dark .xmind-preview__viewer {
  background-color: #2c2c2c;
}
</style>