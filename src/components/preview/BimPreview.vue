<template>
  <div class="bim-preview">
    <!-- Loading State -->
    <div v-if="loading" class="bim-preview__loading" v-loading="loading" element-loading-text="加载BIM模型中...">
      <div style="height: 400px;"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bim-preview__error">
      <el-result icon="error" title="BIM模型加载失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="retry">重试</el-button>
        </template>
      </el-result>
    </div>

    <!-- BIM Content -->
    <div v-else class="bim-preview__content">
      <!-- Controls -->
      <div class="bim-preview__controls">
        <div class="bim-preview__controls-left">
          <el-tag type="success">{{ getModelType() }}</el-tag>
          <span v-if="file.meta?.title" class="bim-preview__title">
            {{ file.meta.title }}
          </span>
        </div>
        <div class="bim-preview__controls-right">
          <el-button-group size="small">
            <el-tooltip content="适应视图">
              <el-button @click="fitToView">
                <el-icon><FullScreen /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="重置视角">
              <el-button @click="resetCamera">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="线框模式">
              <el-button :type="wireframe ? 'primary' : 'default'" @click="toggleWireframe">
                <el-icon><Grid /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="显示网格">
              <el-button :type="showGrid ? 'primary' : 'default'" @click="toggleGrid">
                <el-icon><Coordinate /></el-icon>
              </el-button>
            </el-tooltip>
          </el-button-group>
        </div>
      </div>

      <!-- 3D Viewer Container -->
      <div ref="viewerContainer" class="bim-preview__viewer"></div>

      <!-- Info Panel -->
      <div v-if="showInfo" class="bim-preview__info">
        <div class="bim-preview__info-item">
          <span class="label">顶点数:</span>
          <span class="value">{{ modelInfo.vertices }}</span>
        </div>
        <div class="bim-preview__info-item">
          <span class="label">面数:</span>
          <span class="value">{{ modelInfo.faces }}</span>
        </div>
        <div class="bim-preview__info-item">
          <span class="label">对象数:</span>
          <span class="value">{{ modelInfo.objects }}</span>
        </div>
        <div v-if="file.meta?.size" class="bim-preview__info-item">
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
  ElIcon
} from 'element-plus'
import {
  FullScreen,
  Refresh,
  Grid,
  Coordinate
} from '@element-plus/icons-vue'
import type { FileObject, FileViewerConfig } from '../../types'
import { formatFileSize, getFileExtension } from '../../utils/file'

// Import Three.js modules
import * as THREE from 'three'

interface ModelInfo {
  vertices: number
  faces: number
  objects: number
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
const wireframe = ref(false)
const showGrid = ref(true)

// Three.js objects
const scene = ref<THREE.Scene | null>(null)
const camera = ref<THREE.PerspectiveCamera | null>(null)
const renderer = ref<THREE.WebGLRenderer | null>(null)
const controls = ref<any>(null)
const model = ref<THREE.Object3D | null>(null)
const gridHelper = ref<THREE.GridHelper | null>(null)

// Model info
const modelInfo = ref<ModelInfo>({
  vertices: 0,
  faces: 0,
  objects: 0
})

// Computed
const showControls = computed(() => props.config?.toolbar !== false)

// Methods
function getModelType(): string {
  const ext = getFileExtension(props.file.url).toLowerCase()
  switch (ext) {
    case 'ifc':
      return 'IFC'
    case 'gltf':
      return 'glTF'
    case 'glb':
      return 'GLB'
    default:
      return 'BIM'
  }
}

async function initThreeJS() {
  if (!viewerContainer.value) return

  try {
    // Create scene
    scene.value = new THREE.Scene()
    scene.value.background = new THREE.Color(0xf0f0f0)

    // Create camera
    camera.value = new THREE.PerspectiveCamera(
      75,
      viewerContainer.value.clientWidth / viewerContainer.value.clientHeight,
      0.1,
      1000
    )
    camera.value.position.set(10, 10, 10)

    // Create renderer
    renderer.value = new THREE.WebGLRenderer({ antialias: true })
    renderer.value.setSize(
      viewerContainer.value.clientWidth,
      viewerContainer.value.clientHeight
    )
    renderer.value.shadowMap.enabled = true
    renderer.value.shadowMap.type = THREE.PCFSoftShadowMap

    viewerContainer.value.appendChild(renderer.value.domElement)

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.value.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    scene.value.add(directionalLight)

    // Add grid helper
    gridHelper.value = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc)
    if (showGrid.value) {
      scene.value.add(gridHelper.value)
    }

    // Initialize controls (basic orbit controls simulation)
    initControls()

    // Load model
    await loadModel()

    // Start render loop
    animate()

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to initialize 3D viewer'
    error.value = errorMessage
    emit('error', new Error(errorMessage))
  }
}

function initControls() {
  // Simple mouse controls simulation
  let isMouseDown = false
  let mouseX = 0
  let mouseY = 0

  const onMouseDown = (event: MouseEvent) => {
    isMouseDown = true
    mouseX = event.clientX
    mouseY = event.clientY
  }

  const onMouseUp = () => {
    isMouseDown = false
  }

  const onMouseMove = (event: MouseEvent) => {
    if (!isMouseDown || !camera.value) return

    const deltaX = event.clientX - mouseX
    const deltaY = event.clientY - mouseY

    // Rotate camera around the origin
    const spherical = new THREE.Spherical()
    spherical.setFromVector3(camera.value.position)
    
    spherical.theta -= deltaX * 0.01
    spherical.phi += deltaY * 0.01
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi))

    camera.value.position.setFromSpherical(spherical)
    camera.value.lookAt(0, 0, 0)

    mouseX = event.clientX
    mouseY = event.clientY
  }

  const onWheel = (event: WheelEvent) => {
    if (!camera.value) return
    
    const delta = event.deltaY > 0 ? 1.1 : 0.9
    camera.value.position.multiplyScalar(delta)
    
    // Limit zoom distance
    const distance = camera.value.position.length()
    if (distance < 1) {
      camera.value.position.normalize().multiplyScalar(1)
    } else if (distance > 100) {
      camera.value.position.normalize().multiplyScalar(100)
    }
  }

  if (viewerContainer.value) {
    viewerContainer.value.addEventListener('mousedown', onMouseDown)
    viewerContainer.value.addEventListener('mouseup', onMouseUp)
    viewerContainer.value.addEventListener('mousemove', onMouseMove)
    viewerContainer.value.addEventListener('wheel', onWheel)
  }
}

async function loadModel() {
  if (!scene.value) return

  try {
    const ext = getFileExtension(props.file.url).toLowerCase()

    if (ext === 'ifc') {
      await loadIFCModel()
    } else if (ext === 'gltf' || ext === 'glb') {
      await loadGLTFModel()
    } else {
      // Fallback: create a simple placeholder model
      createPlaceholderModel()
    }

    emit('load', props.file)
  } catch (err) {
    console.error('Failed to load model:', err)
    createPlaceholderModel()
    emit('load', props.file)
  }
}

async function loadIFCModel() {
  // Since IFC loader would require additional dependencies,
  // we'll create a placeholder representation
  createPlaceholderModel()
}

async function loadGLTFModel() {
  // Since GLTF loader would require additional dependencies,
  // we'll create a placeholder representation  
  createPlaceholderModel()
}

function createPlaceholderModel() {
  if (!scene.value) return

  // Create a simple building-like structure as placeholder
  const group = new THREE.Group()

  // Base
  const baseGeometry = new THREE.BoxGeometry(8, 0.5, 8)
  const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 })
  const base = new THREE.Mesh(baseGeometry, baseMaterial)
  base.position.y = -0.25
  group.add(base)

  // Walls
  const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc })
  
  // Wall 1
  const wall1Geometry = new THREE.BoxGeometry(8, 4, 0.2)
  const wall1 = new THREE.Mesh(wall1Geometry, wallMaterial)
  wall1.position.set(0, 2, -4)
  group.add(wall1)

  // Wall 2
  const wall2Geometry = new THREE.BoxGeometry(8, 4, 0.2)
  const wall2 = new THREE.Mesh(wall2Geometry, wallMaterial)
  wall2.position.set(0, 2, 4)
  group.add(wall2)

  // Wall 3
  const wall3Geometry = new THREE.BoxGeometry(0.2, 4, 8)
  const wall3 = new THREE.Mesh(wall3Geometry, wallMaterial)
  wall3.position.set(-4, 2, 0)
  group.add(wall3)

  // Wall 4
  const wall4Geometry = new THREE.BoxGeometry(0.2, 4, 8)
  const wall4 = new THREE.Mesh(wall4Geometry, wallMaterial)
  wall4.position.set(4, 2, 0)
  group.add(wall4)

  // Roof
  const roofGeometry = new THREE.BoxGeometry(8.5, 0.3, 8.5)
  const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 })
  const roof = new THREE.Mesh(roofGeometry, roofMaterial)
  roof.position.y = 4.15
  group.add(roof)

  model.value = group
  scene.value.add(group)

  // Update model info
  let vertices = 0
  let faces = 0
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      if (child.geometry instanceof THREE.BufferGeometry) {
        const positionAttribute = child.geometry.getAttribute('position')
        if (positionAttribute) {
          vertices += positionAttribute.count
        }
        const indexAttribute = child.geometry.getIndex()
        if (indexAttribute) {
          faces += indexAttribute.count / 3
        } else {
          faces += positionAttribute.count / 3
        }
      }
    }
  })

  modelInfo.value = {
    vertices,
    faces: Math.floor(faces),
    objects: group.children.length
  }

  loading.value = false
}

function animate() {
  if (!renderer.value || !scene.value || !camera.value) return

  requestAnimationFrame(animate)
  renderer.value.render(scene.value, camera.value)
}

function fitToView() {
  if (!camera.value || !model.value) return

  const box = new THREE.Box3().setFromObject(model.value)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  const maxDim = Math.max(size.x, size.y, size.z)
  const distance = maxDim * 2

  camera.value.position.set(distance, distance, distance)
  camera.value.lookAt(center)
}

function resetCamera() {
  if (!camera.value) return
  
  camera.value.position.set(10, 10, 10)
  camera.value.lookAt(0, 0, 0)
}

function toggleWireframe() {
  wireframe.value = !wireframe.value
  
  if (model.value) {
    model.value.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            if (mat instanceof THREE.Material) {
              (mat as any).wireframe = wireframe.value
            }
          })
        } else {
          (child.material as any).wireframe = wireframe.value
        }
      }
    })
  }
}

function toggleGrid() {
  showGrid.value = !showGrid.value
  
  if (gridHelper.value && scene.value) {
    if (showGrid.value) {
      scene.value.add(gridHelper.value)
    } else {
      scene.value.remove(gridHelper.value)
    }
  }
}

function retry() {
  error.value = null
  loading.value = true
  nextTick(() => {
    initThreeJS()
  })
}

function handleResize() {
  if (!camera.value || !renderer.value || !viewerContainer.value) return

  const width = viewerContainer.value.clientWidth
  const height = viewerContainer.value.clientHeight

  camera.value.aspect = width / height
  camera.value.updateProjectionMatrix()
  renderer.value.setSize(width, height)
}

// Lifecycle
onMounted(() => {
  nextTick(() => {
    initThreeJS()
  })

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  
  if (renderer.value) {
    renderer.value.dispose()
  }
})
</script>

<style scoped>
.bim-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--file-viewer-background);
}

.bim-preview__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.bim-preview__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.bim-preview__content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.bim-preview__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--file-viewer-surface);
  border-bottom: 1px solid var(--file-viewer-border);
  flex-shrink: 0;
}

.bim-preview__controls-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bim-preview__controls-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bim-preview__title {
  font-weight: 500;
  font-size: 14px;
  color: var(--file-viewer-text);
}

.bim-preview__viewer {
  flex: 1;
  min-height: 400px;
  background-color: #f0f0f0;
  position: relative;
  cursor: grab;
}

.bim-preview__viewer:active {
  cursor: grabbing;
}

.bim-preview__info {
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

.bim-preview__info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bim-preview__info-item .label {
  color: var(--file-viewer-text);
  opacity: 0.7;
}

.bim-preview__info-item .value {
  font-weight: 500;
}

/* Dark theme adjustments */
.file-viewer--dark .bim-preview__viewer {
  background-color: #2c2c2c;
}
</style>