<template>
  <div class="office-preview">
    <!-- Loading State -->
    <div v-if="loading" class="office-preview__loading" v-loading="loading" element-loading-text="加载文档中...">
      <div style="height: 400px;"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="office-preview__error">
      <el-result icon="error" title="文档加载失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="retry">重试</el-button>
        </template>
      </el-result>
    </div>

    <!-- Office Content -->
    <div v-else class="office-preview__content">
      <!-- Controls -->
      <div class="office-preview__controls">
        <div class="office-preview__controls-left">
          <el-tag :type="getDocumentTypeTag(fileType)">
            {{ getDocumentTypeName(fileType) }}
          </el-tag>
          <span v-if="file.meta?.title" class="office-preview__title">
            {{ file.meta.title }}
          </span>
        </div>

        <div class="office-preview__controls-right">
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
            <el-tooltip v-if="editable" content="编辑模式">
              <el-button :type="editMode ? 'primary' : 'default'" @click="toggleEditMode">
                <el-icon><Edit /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="下载">
              <el-button @click="downloadFile">
                <el-icon><Download /></el-icon>
              </el-button>
            </el-tooltip>
          </el-button-group>
        </div>
      </div>

      <!-- Office Viewer -->
      <div class="office-preview__viewer" ref="viewerRef">
        <!-- Word Document -->
        <VueOfficeDocx
          v-if="fileType === 'docx'"
          :src="file.url"
          :options="docxOptions"
          @rendered="handleRendered"
          @error="handleOfficeError"
        />

        <!-- Excel Spreadsheet -->
        <VueOfficeExcel
          v-else-if="fileType === 'xlsx'"
          :src="file.url"
          :options="excelOptions"
          @rendered="handleRendered"
          @error="handleOfficeError"
        />

        <!-- PowerPoint Presentation -->
        <VueOfficePdf
          v-else-if="fileType === 'pptx'"
          :src="file.url"
          :options="pdfOptions"
          @rendered="handleRendered"
          @error="handleOfficeError"
        />

        <!-- Legacy formats fallback -->
        <div v-else class="office-preview__fallback">
          <el-result
            icon="warning"
            title="不支持的文档格式"
            sub-title="请尝试将文档转换为现代格式 (docx, xlsx, pptx)"
          >
            <template #extra>
              <el-button type="primary" @click="downloadFile">
                <el-icon><Download /></el-icon>
                下载文档
              </el-button>
            </template>
          </el-result>
        </div>
      </div>

      <!-- Document Information -->
      <div v-if="documentInfo" class="office-preview__info">
        <el-descriptions :column="3" size="small" border>
          <el-descriptions-item label="类型">
            {{ getDocumentTypeName(fileType) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="file.meta?.author" label="作者">
            {{ file.meta.author }}
          </el-descriptions-item>
          <el-descriptions-item v-if="file.meta?.lastModified" label="修改时间">
            {{ formatDate(file.meta.lastModified) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="file.meta?.size" label="文件大小">
            {{ formatFileSize(file.meta.size) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="documentInfo.pages" label="页数">
            {{ documentInfo.pages }}
          </el-descriptions-item>
          <el-descriptions-item v-if="documentInfo.wordCount" label="字数">
            {{ documentInfo.wordCount }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import {
  ElButton,
  ElButtonGroup,
  ElIcon,
  ElTooltip,
  ElResult,
  ElTag,
  ElDescriptions,
  ElDescriptionsItem
} from 'element-plus'
import {
  ZoomOut,
  ZoomIn,
  Edit,
  Download
} from '@element-plus/icons-vue'
import type { FileObject, FileViewerConfig } from '../../types'
import { getFileExtension, formatFileSize } from '../../utils/file'

// Import vue-office components
import VueOfficeDocx from '@vue-office/docx'
import VueOfficeExcel from '@vue-office/excel'
import VueOfficePdf from '@vue-office/pdf'

interface DocumentInfo {
  pages?: number
  wordCount?: number
  sheetCount?: number
  slideCount?: number
}

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
const currentZoom = ref(1)
const editMode = ref(false)
const documentInfo = ref<DocumentInfo | null>(null)

// Refs
const viewerRef = ref<HTMLElement>()

// Computed
const fileType = computed(() => {
  const extension = getFileExtension(props.file.url)
  return extension as 'docx' | 'xlsx' | 'pptx' | 'doc' | 'xls' | 'ppt'
})

const docxOptions = computed(() => ({
  zoom: currentZoom.value * props.zoom,
  editable: editMode.value && props.editable,
  theme: props.config?.theme || 'light'
}))

const excelOptions = computed(() => ({
  zoom: currentZoom.value * props.zoom,
  editable: editMode.value && props.editable,
  theme: props.config?.theme || 'light'
}))

const pdfOptions = computed(() => ({
  zoom: currentZoom.value * props.zoom,
  theme: props.config?.theme || 'light'
}))

// Methods
function getDocumentTypeTag(type: string): string {
  const tagMap: Record<string, string> = {
    docx: 'primary',
    doc: 'primary',
    xlsx: 'success',
    xls: 'success',
    pptx: 'warning',
    ppt: 'warning'
  }
  return tagMap[type] || 'info'
}

function getDocumentTypeName(type: string): string {
  const nameMap: Record<string, string> = {
    docx: 'Word 文档',
    doc: 'Word 文档 (旧版)',
    xlsx: 'Excel 表格',
    xls: 'Excel 表格 (旧版)',
    pptx: 'PowerPoint 演示文稿',
    ppt: 'PowerPoint 演示文稿 (旧版)'
  }
  return nameMap[type] || '未知文档'
}

function zoomIn() {
  currentZoom.value = Math.min(currentZoom.value + 0.25, 3)
}

function zoomOut() {
  currentZoom.value = Math.max(currentZoom.value - 0.25, 0.25)
}

function resetZoom() {
  currentZoom.value = 1
}

function toggleEditMode() {
  if (!props.editable) return
  editMode.value = !editMode.value
}

function downloadFile() {
  const link = document.createElement('a')
  link.href = props.file.url
  link.download = props.file.meta?.title || `document.${fileType.value}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function handleRendered(info: any) {
  loading.value = false
  error.value = null
  
  // Extract document information
  if (info) {
    documentInfo.value = {
      pages: info.pages || info.sheets || info.slides,
      wordCount: info.wordCount,
      sheetCount: info.sheets,
      slideCount: info.slides
    }
  }
  
  emit('load', props.file)
}

function handleOfficeError(err: any) {
  loading.value = false
  error.value = err.message || '文档加载失败'
  emit('error', err)
}

function retry() {
  error.value = null
  loading.value = true
  // Force re-render by updating the key or reloading the component
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Lifecycle
onMounted(() => {
  // Initialize document loading
  nextTick(() => {
    // The vue-office components will handle loading automatically
  })
})
</script>

<style scoped>
.office-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--file-viewer-background);
}

.office-preview__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.office-preview__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.office-preview__content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.office-preview__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--file-viewer-surface);
  border-bottom: 1px solid var(--file-viewer-border);
  flex-shrink: 0;
}

.office-preview__controls-left,
.office-preview__controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.office-preview__title {
  font-weight: 500;
  font-size: 14px;
  color: var(--file-viewer-text);
}

.office-preview__viewer {
  flex: 1;
  overflow: auto;
  background-color: var(--file-viewer-surface);
  position: relative;
}

.office-preview__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
}

.office-preview__info {
  padding: 16px;
  background-color: var(--file-viewer-background);
  border-top: 1px solid var(--file-viewer-border);
  flex-shrink: 0;
}

/* Vue Office component styles */
:deep(.vue-office-docx) {
  width: 100%;
  height: 100%;
}

:deep(.vue-office-excel) {
  width: 100%;
  height: 100%;
}

:deep(.vue-office-pdf) {
  width: 100%;
  height: 100%;
}

/* Custom scrollbar for viewer */
.office-preview__viewer::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.office-preview__viewer::-webkit-scrollbar-track {
  background: var(--file-viewer-surface);
}

.office-preview__viewer::-webkit-scrollbar-thumb {
  background: var(--file-viewer-border);
  border-radius: 4px;
}

.office-preview__viewer::-webkit-scrollbar-thumb:hover {
  background: var(--file-viewer-text);
}
</style>