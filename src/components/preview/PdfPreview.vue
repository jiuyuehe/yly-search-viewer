<template>
  <div class="pdf-preview">
    <!-- Loading State -->
    <div v-if="loading" class="pdf-preview__loading" v-loading="loading" element-loading-text="加载PDF中...">
      <div style="height: 400px;"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="pdf-preview__error">
      <el-result icon="error" title="PDF加载失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="retry">重试</el-button>
        </template>
      </el-result>
    </div>

    <!-- PDF Content -->
    <div v-else class="pdf-preview__content">
      <!-- Controls -->
      <div class="pdf-preview__controls">
        <div class="pdf-preview__controls-left">
          <el-button-group size="small">
            <el-tooltip content="上一页">
              <el-button :disabled="currentPage <= 1" @click="prevPage">
                <el-icon><ArrowLeft /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="下一页">
              <el-button :disabled="currentPage >= totalPages" @click="nextPage">
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </el-tooltip>
          </el-button-group>
          
          <div class="pdf-preview__page-info">
            <el-input
              v-model.number="inputPage"
              size="small"
              style="width: 60px"
              @keyup.enter="goToPage"
              @blur="goToPage"
            />
            <span>/ {{ totalPages }}</span>
          </div>
        </div>

        <div class="pdf-preview__controls-center">
          <el-input
            v-model="searchText"
            placeholder="搜索文本..."
            size="small"
            style="width: 200px"
            @keyup.enter="searchInPdf"
          >
            <template #append>
              <el-button @click="searchInPdf">
                <el-icon><Search /></el-icon>
              </el-button>
            </template>
          </el-input>
        </div>

        <div class="pdf-preview__controls-right">
          <el-button-group size="small">
            <el-tooltip content="缩小">
              <el-button @click="zoomOut">
                <el-icon><ZoomOut /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="重置缩放">
              <el-button @click="resetZoom">
                {{ Math.round(currentScale * 100) }}%
              </el-button>
            </el-tooltip>
            <el-tooltip content="放大">
              <el-button @click="zoomIn">
                <el-icon><ZoomIn /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="适应宽度">
              <el-button @click="fitWidth">
                <el-icon><FullScreen /></el-icon>
              </el-button>
            </el-tooltip>
          </el-button-group>
        </div>
      </div>

      <!-- PDF Viewer -->
      <div class="pdf-preview__viewer" ref="viewerRef">
        <div
          v-for="pageNum in visiblePages"
          :key="pageNum"
          :ref="(el) => setPageRef(el, pageNum)"
          class="pdf-preview__page"
          :class="{ 'pdf-preview__page--current': pageNum === currentPage }"
        >
          <canvas
            :id="`pdf-page-${pageNum}`"
            class="pdf-preview__canvas"
            :style="canvasStyle"
          ></canvas>
          
          <!-- Search highlights -->
          <div
            v-for="(highlight, index) in getPageHighlights(pageNum)"
            :key="index"
            class="pdf-preview__highlight"
            :style="highlight.style"
          ></div>
        </div>
      </div>

      <!-- Thumbnails Sidebar -->
      <div v-if="showThumbnails" class="pdf-preview__thumbnails">
        <div class="pdf-preview__thumbnails-header">
          <span>页面缩略图</span>
          <el-button text @click="showThumbnails = false">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <div class="pdf-preview__thumbnails-list">
          <div
            v-for="pageNum in totalPages"
            :key="pageNum"
            class="pdf-preview__thumbnail"
            :class="{ 'pdf-preview__thumbnail--current': pageNum === currentPage }"
            @click="goToPage(pageNum)"
          >
            <canvas
              :id="`pdf-thumb-${pageNum}`"
              class="pdf-preview__thumbnail-canvas"
            ></canvas>
            <span class="pdf-preview__thumbnail-number">{{ pageNum }}</span>
          </div>
        </div>
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
  ElInput
} from 'element-plus'
import {
  ArrowLeft,
  ArrowRight,
  ZoomOut,
  ZoomIn,
  FullScreen,
  Search,
  Close
} from '@element-plus/icons-vue'
import type { FileObject, FileViewerConfig } from '../../types'

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist'
import 'pdfjs-dist/web/pdf_viewer.css'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

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
const pdfDocument = ref<any>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const currentScale = ref(1.0)
const searchText = ref('')
const searchResults = ref<any[]>([])
const showThumbnails = ref(false)
const inputPage = ref(1)

// Refs
const viewerRef = ref<HTMLElement>()
const pageRefs = ref<Map<number, HTMLElement>>(new Map())

// Computed
const visiblePages = computed(() => {
  // For performance, only render current page and adjacent pages
  const start = Math.max(1, currentPage.value - 1)
  const end = Math.min(totalPages.value, currentPage.value + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

const canvasStyle = computed(() => ({
  transform: `scale(${currentScale.value * props.zoom})`,
  transformOrigin: 'top left'
}))

// Methods
function setPageRef(el: any, pageNum: number) {
  if (el) {
    pageRefs.value.set(pageNum, el)
  }
}

async function loadPdf() {
  try {
    loading.value = true
    error.value = null

    const loadingTask = pdfjsLib.getDocument({
      url: props.file.url,
      cMapUrl: '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true
    })

    // Handle progress
    loadingTask.onProgress = (progress: any) => {
      if (progress.total) {
        emit('progress', progress.loaded, progress.total)
      }
    }

    pdfDocument.value = await loadingTask.promise
    totalPages.value = pdfDocument.value.numPages
    inputPage.value = currentPage.value

    // Render initial pages
    await renderVisiblePages()
    
    loading.value = false
    emit('load', props.file)
  } catch (err: any) {
    loading.value = false
    error.value = err.message || 'PDF加载失败'
    emit('error', err)
  }
}

async function renderPage(pageNum: number, canvas?: HTMLCanvasElement) {
  if (!pdfDocument.value) return

  try {
    const page = await pdfDocument.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: currentScale.value })
    
    const targetCanvas = canvas || document.getElementById(`pdf-page-${pageNum}`) as HTMLCanvasElement
    if (!targetCanvas) return

    const context = targetCanvas.getContext('2d')
    if (!context) return

    targetCanvas.height = viewport.height
    targetCanvas.width = viewport.width

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }

    await page.render(renderContext).promise
  } catch (err) {
    console.error(`Error rendering page ${pageNum}:`, err)
  }
}

async function renderThumbnail(pageNum: number) {
  if (!pdfDocument.value) return

  try {
    const page = await pdfDocument.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: 0.2 }) // Small scale for thumbnails
    
    const canvas = document.getElementById(`pdf-thumb-${pageNum}`) as HTMLCanvasElement
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    canvas.height = viewport.height
    canvas.width = viewport.width

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }

    await page.render(renderContext).promise
  } catch (err) {
    console.error(`Error rendering thumbnail ${pageNum}:`, err)
  }
}

async function renderVisiblePages() {
  for (const pageNum of visiblePages.value) {
    await renderPage(pageNum)
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    inputPage.value = currentPage.value
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    inputPage.value = currentPage.value
  }
}

function goToPage(page?: number) {
  const targetPage = page || inputPage.value
  if (targetPage >= 1 && targetPage <= totalPages.value) {
    currentPage.value = targetPage
    inputPage.value = targetPage
    scrollToPage(targetPage)
  } else {
    inputPage.value = currentPage.value // Reset invalid input
  }
}

function scrollToPage(pageNum: number) {
  const pageElement = pageRefs.value.get(pageNum)
  if (pageElement && viewerRef.value) {
    pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function zoomIn() {
  currentScale.value = Math.min(currentScale.value + 0.25, 3.0)
  nextTick(() => renderVisiblePages())
}

function zoomOut() {
  currentScale.value = Math.max(currentScale.value - 0.25, 0.25)
  nextTick(() => renderVisiblePages())
}

function resetZoom() {
  currentScale.value = 1.0
  nextTick(() => renderVisiblePages())
}

function fitWidth() {
  if (!viewerRef.value) return
  
  const containerWidth = viewerRef.value.clientWidth - 40 // Account for padding
  const page = document.getElementById(`pdf-page-${currentPage.value}`) as HTMLCanvasElement
  
  if (page) {
    const pageWidth = page.width / currentScale.value
    currentScale.value = containerWidth / pageWidth
    nextTick(() => renderVisiblePages())
  }
}

async function searchInPdf() {
  if (!searchText.value.trim() || !pdfDocument.value) return

  searchResults.value = []
  
  // This is a simplified search - in a real implementation,
  // you'd want to use PDF.js text extraction capabilities
  console.log('Searching for:', searchText.value)
  // TODO: Implement actual text search functionality
}

function getPageHighlights(pageNum: number) {
  // Return search highlights for the given page
  return searchResults.value.filter(result => result.pageNum === pageNum)
}

function retry() {
  loadPdf()
}

// Watch for page changes
watch(currentPage, () => {
  nextTick(() => renderVisiblePages())
})

// Watch for zoom prop changes
watch(() => props.zoom, () => {
  nextTick(() => renderVisiblePages())
})

// Lifecycle
onMounted(() => {
  loadPdf()
})

onUnmounted(() => {
  if (pdfDocument.value) {
    pdfDocument.value.destroy()
  }
})
</script>

<style scoped>
.pdf-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--file-viewer-background);
}

.pdf-preview__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.pdf-preview__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.pdf-preview__content {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.pdf-preview__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--file-viewer-surface);
  border-bottom: 1px solid var(--file-viewer-border);
  flex-shrink: 0;
}

.pdf-preview__controls-left,
.pdf-preview__controls-center,
.pdf-preview__controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pdf-preview__page-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--file-viewer-text);
}

.pdf-preview__viewer {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background-color: var(--file-viewer-surface);
}

.pdf-preview__page {
  margin-bottom: 20px;
  position: relative;
  display: flex;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: white;
}

.pdf-preview__page--current {
  box-shadow: 0 2px 8px var(--file-viewer-primary);
}

.pdf-preview__canvas {
  display: block;
  max-width: 100%;
}

.pdf-preview__highlight {
  position: absolute;
  background-color: rgba(255, 255, 0, 0.3);
  pointer-events: none;
}

.pdf-preview__thumbnails {
  position: absolute;
  right: 0;
  top: 0;
  width: 200px;
  height: 100%;
  background-color: var(--file-viewer-background);
  border-left: 1px solid var(--file-viewer-border);
  display: flex;
  flex-direction: column;
}

.pdf-preview__thumbnails-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid var(--file-viewer-border);
  font-size: 14px;
  font-weight: 500;
}

.pdf-preview__thumbnails-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.pdf-preview__thumbnail {
  margin-bottom: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.pdf-preview__thumbnail:hover {
  border-color: var(--file-viewer-border);
}

.pdf-preview__thumbnail--current {
  border-color: var(--file-viewer-primary);
}

.pdf-preview__thumbnail-canvas {
  width: 100%;
  display: block;
}

.pdf-preview__thumbnail-number {
  display: block;
  text-align: center;
  padding: 4px;
  font-size: 12px;
  background-color: var(--file-viewer-surface);
}
</style>