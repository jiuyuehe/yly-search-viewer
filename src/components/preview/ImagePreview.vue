<template>
  <div class="image-preview" :style="containerStyle">
    <div
      v-if="loading"
      class="image-preview__loading"
      v-loading="loading"
      element-loading-text="加载图片中..."
    />
    
    <div v-else-if="error" class="image-preview__error">
      <el-result icon="error" title="图片加载失败" :sub-title="error" />
    </div>

    <div v-else class="image-preview__container">
      <!-- Image Display -->
      <div class="image-preview__wrapper" @wheel="handleWheel">
        <img
          ref="imageRef"
          :src="file.url"
          :alt="file.meta?.title || 'Image'"
          :style="imageStyle"
          class="image-preview__image"
          @load="handleImageLoad"
          @error="handleImageError"
          @click="toggleFullscreen"
          draggable="false"
        />
      </div>

      <!-- Controls -->
      <div class="image-preview__controls">
        <el-button-group size="small">
          <el-tooltip content="逆时针旋转">
            <el-button @click="rotateLeft">
              <el-icon><RefreshLeft /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="顺时针旋转">
            <el-button @click="rotateRight">
              <el-icon><RefreshRight /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="适应窗口">
            <el-button @click="fitToWindow">
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="原始尺寸">
            <el-button @click="resetSize">
              <el-icon><Aim /></el-icon>
            </el-button>
          </el-tooltip>
        </el-button-group>
      </div>
    </div>

    <!-- Fullscreen Modal -->
    <el-dialog
      v-model="fullscreenVisible"
      :show-close="false"
      fullscreen
      class="image-preview__fullscreen"
      @close="exitFullscreen"
    >
      <div class="image-preview__fullscreen-content">
        <img
          :src="file.url"
          :alt="file.meta?.title || 'Image'"
          :style="fullscreenImageStyle"
          class="image-preview__fullscreen-image"
          @click="exitFullscreen"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElButton, ElButtonGroup, ElIcon, ElTooltip, ElResult, ElDialog } from 'element-plus'
import { RefreshLeft, RefreshRight, FullScreen, Aim } from '@element-plus/icons-vue'
import type { FileObject, FileViewerConfig } from '../../types'

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
const rotation = ref(0)
const scale = ref(1)
const position = ref({ x: 0, y: 0 })
const fullscreenVisible = ref(false)
const imageRef = ref<HTMLImageElement>()
const naturalSize = ref({ width: 0, height: 0 })

// Computed styles
const containerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--file-viewer-background)',
  position: 'relative'
}))

const imageStyle = computed(() => ({
  transform: `
    translate(${position.value.x}px, ${position.value.y}px)
    scale(${scale.value * props.zoom})
    rotate(${rotation.value}deg)
  `,
  transformOrigin: 'center',
  cursor: 'pointer',
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  userSelect: 'none',
  transition: 'transform 0.3s ease'
}))

const fullscreenImageStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`,
  maxWidth: '100vw',
  maxHeight: '100vh',
  objectFit: 'contain',
  cursor: 'pointer'
}))

// Methods
function handleImageLoad() {
  loading.value = false
  error.value = null
  
  if (imageRef.value) {
    naturalSize.value = {
      width: imageRef.value.naturalWidth,
      height: imageRef.value.naturalHeight
    }
  }
  
  emit('load', props.file)
}

function handleImageError() {
  loading.value = false
  error.value = '图片加载失败'
  emit('error', new Error('Failed to load image'))
}

function rotateLeft() {
  rotation.value -= 90
}

function rotateRight() {
  rotation.value += 90
}

function fitToWindow() {
  if (!imageRef.value) return
  
  const container = imageRef.value.parentElement
  if (!container) return
  
  const containerRect = container.getBoundingClientRect()
  const imageAspect = naturalSize.value.width / naturalSize.value.height
  const containerAspect = containerRect.width / containerRect.height
  
  if (imageAspect > containerAspect) {
    scale.value = containerRect.width / naturalSize.value.width
  } else {
    scale.value = containerRect.height / naturalSize.value.height
  }
  
  position.value = { x: 0, y: 0 }
}

function resetSize() {
  scale.value = 1
  rotation.value = 0
  position.value = { x: 0, y: 0 }
}

function toggleFullscreen() {
  fullscreenVisible.value = true
}

function exitFullscreen() {
  fullscreenVisible.value = false
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.max(0.1, Math.min(5, scale.value + delta))
  
  scale.value = newScale
}

// Drag functionality
let isDragging = false
let lastMousePosition = { x: 0, y: 0 }

function handleMouseDown(event: MouseEvent) {
  isDragging = true
  lastMousePosition = { x: event.clientX, y: event.clientY }
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging) return
  
  const deltaX = event.clientX - lastMousePosition.x
  const deltaY = event.clientY - lastMousePosition.y
  
  position.value = {
    x: position.value.x + deltaX,
    y: position.value.y + deltaY
  }
  
  lastMousePosition = { x: event.clientX, y: event.clientY }
}

function handleMouseUp() {
  isDragging = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

// Lifecycle
onMounted(() => {
  if (imageRef.value) {
    imageRef.value.addEventListener('mousedown', handleMouseDown)
  }
})

onUnmounted(() => {
  if (imageRef.value) {
    imageRef.value.removeEventListener('mousedown', handleMouseDown)
  }
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped>
.image-preview {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.image-preview__loading {
  width: 100%;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview__error {
  width: 100%;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview__container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.image-preview__wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: var(--file-viewer-surface);
}

.image-preview__image {
  display: block;
  transition: transform 0.3s ease;
}

.image-preview__controls {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  padding: 8px;
}

.image-preview__fullscreen {
  background-color: rgba(0, 0, 0, 0.9);
}

.image-preview__fullscreen-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview__fullscreen-image {
  max-width: 100%;
  max-height: 100%;
}

/* Loading directive styles */
:deep(.el-loading-mask) {
  background-color: var(--file-viewer-background);
}
</style>