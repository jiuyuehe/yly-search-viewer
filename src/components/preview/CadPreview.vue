<template>
  <div class="cad-preview">
    <!-- Loading State -->
    <div v-if="loading" class="cad-preview__loading" v-loading="loading" element-loading-text="加载CAD图纸中...">
      <div style="height: 400px;"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="cad-preview__error">
      <el-result icon="error" title="CAD图纸加载失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="retry">重试</el-button>
        </template>
      </el-result>
    </div>

    <!-- CAD Content -->
    <div v-else class="cad-preview__content">
      <!-- Controls -->
      <div class="cad-preview__controls">
        <div class="cad-preview__controls-left">
          <el-tag type="danger">{{ getCADType() }}</el-tag>
          <span v-if="file.meta?.title" class="cad-preview__title">
            {{ file.meta.title }}
          </span>
        </div>
        <div class="cad-preview__controls-right">
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
            <el-tooltip content="重置视图">
              <el-button @click="resetView">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="平移模式">
              <el-button :type="panMode ? 'primary' : 'default'" @click="togglePanMode">
                <el-icon><Rank /></el-icon>
              </el-button>
            </el-tooltip>
          </el-button-group>
          <el-select
            v-if="layers.length > 0"
            v-model="selectedLayers"
            multiple
            size="small"
            placeholder="图层"
            style="margin-left: 8px; width: 120px;"
            @change="updateLayerVisibility"
          >
            <el-option
              v-for="layer in layers"
              :key="layer.name"
              :label="layer.name"
              :value="layer.name"
            />
          </el-select>
        </div>
      </div>

      <!-- CAD Viewer Container -->
      <div ref="viewerContainer" class="cad-preview__viewer">
        <canvas ref="cadCanvas" class="cad-preview__canvas"></canvas>
        
        <!-- Drawing Info Overlay -->
        <div class="cad-preview__overlay">
          <div class="cad-preview__coordinates">
            坐标: {{ mouseCoordinates.x.toFixed(2) }}, {{ mouseCoordinates.y.toFixed(2) }}
          </div>
          <div class="cad-preview__zoom-level">
            缩放: {{ Math.round(zoomLevel * 100) }}%
          </div>
        </div>
      </div>

      <!-- Info Panel -->
      <div v-if="showInfo" class="cad-preview__info">
        <div class="cad-preview__info-item">
          <span class="label">实体数:</span>
          <span class="value">{{ drawingInfo.entities }}</span>
        </div>
        <div class="cad-preview__info-item">
          <span class="label">图层数:</span>
          <span class="value">{{ layers.length }}</span>
        </div>
        <div class="cad-preview__info-item">
          <span class="label">图纸范围:</span>
          <span class="value">{{ getDrawingBounds() }}</span>
        </div>
        <div v-if="file.meta?.size" class="cad-preview__info-item">
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
  Refresh,
  Rank
} from '@element-plus/icons-vue'
import type { FileObject, FileViewerConfig } from '../../types'
import { formatFileSize, getFileExtension } from '../../utils/file'

interface Layer {
  name: string
  visible: boolean
  color: string
  entities: CADEntity[]
}

interface CADEntity {
  type: 'line' | 'arc' | 'circle' | 'polyline' | 'text'
  points: { x: number; y: number }[]
  properties: Record<string, any>
}

interface DrawingInfo {
  entities: number
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
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
const cadCanvas = ref<HTMLCanvasElement>()
const panMode = ref(false)

// CAD data
const layers = ref<Layer[]>([])
const selectedLayers = ref<string[]>([])
const drawingInfo = ref<DrawingInfo>({
  entities: 0,
  bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 }
})

// View state
const zoomLevel = ref(1)
const panOffset = ref({ x: 0, y: 0 })
const mouseCoordinates = ref({ x: 0, y: 0 })

// Canvas context
const ctx = ref<CanvasRenderingContext2D | null>(null)

// Computed
const showControls = computed(() => props.config?.toolbar !== false)

// Methods
function getCADType(): string {
  const ext = getFileExtension(props.file.url).toLowerCase()
  switch (ext) {
    case 'dwg':
      return 'DWG'
    case 'dxf':
      return 'DXF'
    default:
      return 'CAD'
  }
}

async function initCADViewer() {
  if (!cadCanvas.value || !viewerContainer.value) return

  try {
    loading.value = true
    error.value = null

    // Setup canvas
    const canvas = cadCanvas.value
    const container = viewerContainer.value
    
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    
    ctx.value = canvas.getContext('2d')
    if (!ctx.value) {
      throw new Error('Failed to get canvas context')
    }

    // Setup event handlers
    setupEventHandlers()

    // Load CAD file
    await loadCADFile()

    // Initial render
    render()

    emit('load', props.file)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to initialize CAD viewer'
    error.value = errorMessage
    emit('error', new Error(errorMessage))
  } finally {
    loading.value = false
  }
}

async function loadCADFile() {
  // Since we don't have a full CAD parser, we'll create sample drawing data
  // In a real implementation, this would parse DWG/DXF files
  createSampleDrawing()
}

function createSampleDrawing() {
  // Create sample layers with different types of entities
  const sampleLayers: Layer[] = [
    {
      name: '0',
      visible: true,
      color: '#ffffff',
      entities: [
        // Outer rectangle
        {
          type: 'line',
          points: [
            { x: 10, y: 10 },
            { x: 90, y: 10 }
          ],
          properties: {}
        },
        {
          type: 'line',
          points: [
            { x: 90, y: 10 },
            { x: 90, y: 70 }
          ],
          properties: {}
        },
        {
          type: 'line',
          points: [
            { x: 90, y: 70 },
            { x: 10, y: 70 }
          ],
          properties: {}
        },
        {
          type: 'line',
          points: [
            { x: 10, y: 70 },
            { x: 10, y: 10 }
          ],
          properties: {}
        }
      ]
    },
    {
      name: 'WALLS',
      visible: true,
      color: '#ff0000',
      entities: [
        // Interior walls
        {
          type: 'line',
          points: [
            { x: 30, y: 10 },
            { x: 30, y: 70 }
          ],
          properties: {}
        },
        {
          type: 'line',
          points: [
            { x: 60, y: 10 },
            { x: 60, y: 50 }
          ],
          properties: {}
        }
      ]
    },
    {
      name: 'DOORS',
      visible: true,
      color: '#00ff00',
      entities: [
        // Door arcs
        {
          type: 'arc',
          points: [
            { x: 30, y: 35 },
            { x: 45, y: 35 }
          ],
          properties: { radius: 15, startAngle: 0, endAngle: Math.PI / 2 }
        }
      ]
    },
    {
      name: 'DIMENSIONS',
      visible: true,
      color: '#0000ff',
      entities: [
        // Dimension lines
        {
          type: 'line',
          points: [
            { x: 10, y: 5 },
            { x: 90, y: 5 }
          ],
          properties: {}
        }
      ]
    },
    {
      name: 'TEXT',
      visible: true,
      color: '#ffff00',
      entities: [
        {
          type: 'text',
          points: [{ x: 50, y: 40 }],
          properties: { text: 'ROOM 1', height: 5 }
        }
      ]
    }
  ]

  layers.value = sampleLayers
  selectedLayers.value = sampleLayers.map(layer => layer.name)

  // Calculate drawing bounds and entity count
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let entityCount = 0

  sampleLayers.forEach(layer => {
    layer.entities.forEach(entity => {
      entityCount++
      entity.points.forEach(point => {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      })
    })
  })

  drawingInfo.value = {
    entities: entityCount,
    bounds: { minX, minY, maxX, maxY }
  }
}

function setupEventHandlers() {
  if (!cadCanvas.value) return

  const canvas = cadCanvas.value

  // Mouse wheel for zooming
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    zoomLevel.value = Math.max(0.1, Math.min(10, zoomLevel.value * delta))
    render()
  })

  // Mouse events for panning and coordinates
  let isMouseDown = false
  let lastMousePos = { x: 0, y: 0 }

  canvas.addEventListener('mousedown', (e) => {
    if (panMode.value) {
      isMouseDown = true
      lastMousePos = { x: e.clientX, y: e.clientY }
      canvas.style.cursor = 'grabbing'
    }
  })

  canvas.addEventListener('mouseup', () => {
    isMouseDown = false
    canvas.style.cursor = panMode.value ? 'grab' : 'crosshair'
  })

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - panOffset.value.x) / zoomLevel.value
    const y = (e.clientY - rect.top - panOffset.value.y) / zoomLevel.value
    
    mouseCoordinates.value = { x, y }

    if (isMouseDown && panMode.value) {
      const deltaX = e.clientX - lastMousePos.x
      const deltaY = e.clientY - lastMousePos.y
      
      panOffset.value.x += deltaX
      panOffset.value.y += deltaY
      
      lastMousePos = { x: e.clientX, y: e.clientY }
      render()
    }
  })

  canvas.addEventListener('mouseleave', () => {
    isMouseDown = false
    canvas.style.cursor = 'default'
  })

  // Set initial cursor
  canvas.style.cursor = 'crosshair'
}

function render() {
  if (!ctx.value || !cadCanvas.value) return

  const canvas = cadCanvas.value
  const context = ctx.value

  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height)

  // Set background
  context.fillStyle = '#1a1a1a'
  context.fillRect(0, 0, canvas.width, canvas.height)

  // Apply transformations
  context.save()
  context.translate(panOffset.value.x, panOffset.value.y)
  context.scale(zoomLevel.value, zoomLevel.value)

  // Render grid
  renderGrid(context)

  // Render layers
  layers.value.forEach(layer => {
    if (layer.visible && selectedLayers.value.includes(layer.name)) {
      renderLayer(context, layer)
    }
  })

  context.restore()
}

function renderGrid(context: CanvasRenderingContext2D) {
  const gridSize = 10
  const bounds = drawingInfo.value.bounds
  
  context.strokeStyle = '#333333'
  context.lineWidth = 0.5 / zoomLevel.value

  // Vertical lines
  for (let x = bounds.minX; x <= bounds.maxX; x += gridSize) {
    context.beginPath()
    context.moveTo(x, bounds.minY)
    context.lineTo(x, bounds.maxY)
    context.stroke()
  }

  // Horizontal lines
  for (let y = bounds.minY; y <= bounds.maxY; y += gridSize) {
    context.beginPath()
    context.moveTo(bounds.minX, y)
    context.lineTo(bounds.maxX, y)
    context.stroke()
  }
}

function renderLayer(context: CanvasRenderingContext2D, layer: Layer) {
  context.strokeStyle = layer.color
  context.fillStyle = layer.color
  context.lineWidth = 1 / zoomLevel.value

  layer.entities.forEach(entity => {
    renderEntity(context, entity)
  })
}

function renderEntity(context: CanvasRenderingContext2D, entity: CADEntity) {
  switch (entity.type) {
    case 'line':
      if (entity.points.length >= 2) {
        context.beginPath()
        context.moveTo(entity.points[0].x, entity.points[0].y)
        context.lineTo(entity.points[1].x, entity.points[1].y)
        context.stroke()
      }
      break

    case 'polyline':
      if (entity.points.length >= 2) {
        context.beginPath()
        context.moveTo(entity.points[0].x, entity.points[0].y)
        for (let i = 1; i < entity.points.length; i++) {
          context.lineTo(entity.points[i].x, entity.points[i].y)
        }
        context.stroke()
      }
      break

    case 'circle':
      if (entity.points.length >= 1) {
        const radius = entity.properties.radius || 5
        context.beginPath()
        context.arc(entity.points[0].x, entity.points[0].y, radius, 0, 2 * Math.PI)
        context.stroke()
      }
      break

    case 'arc':
      if (entity.points.length >= 1) {
        const radius = entity.properties.radius || 5
        const startAngle = entity.properties.startAngle || 0
        const endAngle = entity.properties.endAngle || Math.PI
        context.beginPath()
        context.arc(entity.points[0].x, entity.points[0].y, radius, startAngle, endAngle)
        context.stroke()
      }
      break

    case 'text':
      if (entity.points.length >= 1) {
        const text = entity.properties.text || ''
        const height = entity.properties.height || 5
        context.font = `${height}px Arial`
        context.fillText(text, entity.points[0].x, entity.points[0].y)
      }
      break
  }
}

function fitToWindow() {
  if (!cadCanvas.value) return

  const canvas = cadCanvas.value
  const bounds = drawingInfo.value.bounds
  
  const drawingWidth = bounds.maxX - bounds.minX
  const drawingHeight = bounds.maxY - bounds.minY
  
  const scaleX = (canvas.width * 0.8) / drawingWidth
  const scaleY = (canvas.height * 0.8) / drawingHeight
  
  zoomLevel.value = Math.min(scaleX, scaleY)
  
  panOffset.value = {
    x: (canvas.width - drawingWidth * zoomLevel.value) / 2 - bounds.minX * zoomLevel.value,
    y: (canvas.height - drawingHeight * zoomLevel.value) / 2 - bounds.minY * zoomLevel.value
  }
  
  render()
}

function zoomIn() {
  zoomLevel.value = Math.min(10, zoomLevel.value * 1.2)
  render()
}

function zoomOut() {
  zoomLevel.value = Math.max(0.1, zoomLevel.value * 0.8)
  render()
}

function resetView() {
  zoomLevel.value = 1
  panOffset.value = { x: 0, y: 0 }
  render()
}

function togglePanMode() {
  panMode.value = !panMode.value
  if (cadCanvas.value) {
    cadCanvas.value.style.cursor = panMode.value ? 'grab' : 'crosshair'
  }
}

function updateLayerVisibility() {
  render()
}

function getDrawingBounds(): string {
  const bounds = drawingInfo.value.bounds
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  return `${width.toFixed(1)} × ${height.toFixed(1)}`
}

function retry() {
  error.value = null
  loading.value = true
  nextTick(() => {
    initCADViewer()
  })
}

function handleResize() {
  if (!cadCanvas.value || !viewerContainer.value) return

  const canvas = cadCanvas.value
  const container = viewerContainer.value
  
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
  
  render()
}

// Lifecycle
onMounted(() => {
  nextTick(() => {
    initCADViewer()
  })

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.cad-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--file-viewer-background);
}

.cad-preview__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.cad-preview__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.cad-preview__content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.cad-preview__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--file-viewer-surface);
  border-bottom: 1px solid var(--file-viewer-border);
  flex-shrink: 0;
}

.cad-preview__controls-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cad-preview__controls-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cad-preview__title {
  font-weight: 500;
  font-size: 14px;
  color: var(--file-viewer-text);
}

.cad-preview__viewer {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-color: #1a1a1a;
}

.cad-preview__canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.cad-preview__overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  pointer-events: none;
}

.cad-preview__coordinates {
  margin-bottom: 4px;
}

.cad-preview__zoom-level {
  margin-bottom: 0;
}

.cad-preview__info {
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

.cad-preview__info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cad-preview__info-item .label {
  color: var(--file-viewer-text);
  opacity: 0.7;
}

.cad-preview__info-item .value {
  font-weight: 500;
}
</style>