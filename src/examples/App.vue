<template>
  <div id="app">
    <el-container>
      <el-header>
        <h1>YLY Search Viewer Demo</h1>
        <p>Vue3 文件预览组件库演示</p>
      </el-header>
      
      <el-main>
        <el-row :gutter="20">
          <!-- File Selection Panel -->
          <el-col :span="6">
            <el-card header="示例文件">
              <el-menu
                :default-active="selectedFileId"
                @select="handleFileSelect"
              >
                <el-menu-item
                  v-for="file in sampleFiles"
                  :key="file.id"
                  :index="file.id"
                >
                  <el-icon>
                    <Document v-if="file.type === 'pdf'" />
                    <Picture v-else-if="file.type === 'image'" />
                    <VideoPlay v-else-if="file.type === 'video'" />
                    <OfficeBuilding v-else-if="file.type === 'office'" />
                    <Cpu v-else-if="file.type === 'xmind'" />
                    <HomeFilled v-else-if="file.type === 'bim'" />
                    <Grid v-else-if="file.type === 'cad'" />
                    <EditPen v-else />
                  </el-icon>
                  <span>{{ file.meta?.title || file.url.split('/').pop() }}</span>
                </el-menu-item>
              </el-menu>
            </el-card>
            
            <!-- Upload Section -->
            <el-card header="上传文件" style="margin-top: 20px;">
              <el-upload
                ref="uploadRef"
                :auto-upload="false"
                :show-file-list="false"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.webm,.docx,.xlsx,.pptx,.txt,.md,.json,.xmind,.ifc,.gltf,.glb,.dwg,.dxf"
                @change="handleFileUpload"
              >
                <el-button type="primary">
                  <el-icon><Upload /></el-icon>
                  选择文件
                </el-button>
              </el-upload>
            </el-card>
            
            <!-- AI Tools Navigation -->
            <el-card header="AI 工具" style="margin-top: 20px;">
              <el-menu
                :default-active="activeAITool"
                @select="handleAIToolSelect"
              >
                <el-menu-item index="template-manager">
                  <el-icon><Setting /></el-icon>
                  <span>模板管理</span>
                </el-menu-item>
                <el-menu-item index="extract-history">
                  <el-icon><Clock /></el-icon>
                  <span>抽取历史</span>
                </el-menu-item>
              </el-menu>
            </el-card>
          </el-col>
          
          <!-- Preview Panel -->
          <el-col :span="showAITools ? 12 : 18">
            <el-card>
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>文件预览</span>
                  <div>
                    <el-button-group size="small">
                      <el-button
                        :type="config.theme === 'light' ? 'primary' : 'default'"
                        @click="config.theme = 'light'"
                      >
                        浅色
                      </el-button>
                      <el-button
                        :type="config.theme === 'dark' ? 'primary' : 'default'"
                        @click="config.theme = 'dark'"
                      >
                        深色
                      </el-button>
                    </el-button-group>
                    <el-button
                      size="small"
                      :type="config.toolbar ? 'primary' : 'default'"
                      @click="config.toolbar = !config.toolbar"
                      style="margin-left: 8px;"
                    >
                      工具栏
                    </el-button>
                    <el-button
                      size="small"
                      :type="showAITools ? 'primary' : 'default'"
                      @click="showAITools = !showAITools"
                      style="margin-left: 8px;"
                    >
                      <el-icon><Robot /></el-icon>
                      AI工具
                    </el-button>
                  </div>
                </div>
              </template>
              
              <div style="height: 600px;">
                <FileViewer
                  v-if="selectedFile"
                  :file="selectedFile"
                  :config="config"
                  @load="handleFileLoad"
                  @error="handleFileError"
                  @progress="handleFileProgress"
                />
                <el-empty v-else description="请选择一个文件进行预览" />
              </div>
            </el-card>
          </el-col>
          
          <!-- AI Tools Panel -->
          <el-col v-if="showAITools" :span="6">
            <el-card v-if="selectedFile">
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>AI 工具</span>
                  <el-button size="small" @click="showAITools = false">
                    <el-icon><Close /></el-icon>
                  </el-button>
                </div>
              </template>
              <div style="height: 600px; overflow-y: auto;">
                <AISidebar :file="selectedFile" />
              </div>
            </el-card>
            
            <!-- Standalone AI Tools -->
            <el-card v-else-if="activeAITool === 'template-manager'">
              <template #header>
                <span>模板管理</span>
              </template>
              <div style="height: 600px; overflow-y: auto;">
                <ExtractTemplateManager />
              </div>
            </el-card>
            
            <el-card v-else-if="activeAITool === 'extract-history'">
              <template #header>
                <span>抽取历史</span>
              </template>
              <div style="height: 600px; overflow-y: auto;">
                <ExtractHistory />
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
    
    <!-- Progress Dialog -->
    <el-dialog v-model="progressVisible" title="文件加载中" width="400px">
      <el-progress :percentage="progress" />
      <p>{{ progressText }}</p>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  ElContainer,
  ElHeader,
  ElMain,
  ElRow,
  ElCol,
  ElCard,
  ElMenu,
  ElMenuItem,
  ElIcon,
  ElButton,
  ElButtonGroup,
  ElUpload,
  ElEmpty,
  ElDialog,
  ElProgress,
  ElMessage
} from 'element-plus'
import {
  Document,
  Picture,
  VideoPlay,
  OfficeBuilding,
  EditPen,
  Upload,
  Cpu,
  HomeFilled,
  Grid,
  Cpu as Robot,
  Setting,
  Clock,
  Close
} from '@element-plus/icons-vue'
import { FileViewer, AISidebar, ExtractTemplateManager } from '../index'
import ExtractHistory from '../components/ai/ExtractHistory.vue'
import type { FileObject, FileViewerConfig } from '../types'
import { createFileObject } from '../utils/file'

// Sample files for demo
const sampleFiles = ref<Array<FileObject & { id: string }>>([
  {
    id: 'pdf-sample',
    type: 'pdf',
    url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
    meta: {
      title: 'PDF 示例 - JavaScript 引擎论文',
      author: 'Mozilla',
      mimeType: 'application/pdf'
    }
  },
  {
    id: 'image-sample',
    type: 'image',
    url: 'https://picsum.photos/800/600',
    meta: {
      title: '图片示例 - 随机图片',
      mimeType: 'image/jpeg'
    }
  },
  {
    id: 'video-sample',
    type: 'video',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    meta: {
      title: '视频示例 - Big Buck Bunny',
      mimeType: 'video/mp4'
    }
  },
  {
    id: 'text-sample',
    type: 'text',
    url: 'data:text/plain;charset=utf-8,Hello World!\n\nThis is a sample text file for the YLY Search Viewer.\n\nFeatures:\n- Multi-format support\n- Theme switching\n- Zoom controls\n- Search functionality\n- Responsive design',
    meta: {
      title: '文本示例 - README',
      mimeType: 'text/plain'
    }
  },
  {
    id: 'json-sample',
    type: 'text',
    url: 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      name: 'YLY Search Viewer',
      version: '1.0.0',
      description: 'Vue3 file preview component library',
      features: [
        'PDF preview',
        'Image gallery',
        'Video player',
        'Office documents',
        'Text editor'
      ],
      config: {
        theme: 'light',
        toolbar: true,
        zoom: 1.0
      }
    }, null, 2)),
    meta: {
      title: 'JSON 示例 - 配置文件',
      mimeType: 'application/json'
    }
  },
  {
    id: 'xmind-sample',
    type: 'xmind',
    url: 'data:application/octet-stream;base64,UEsDBBQAAAAIAAhHJ1QAAAAAAAAAAAAAAAAAVQA4AGRvY3VtZW50LnhtbFBLBwgAAAAAAAAAAAAAAwgAAA==',
    meta: {
      title: 'XMind 示例 - 思维导图',
      mimeType: 'application/vnd.xmind.workbook'
    }
  },
  {
    id: 'bim-sample',
    type: 'bim',
    url: 'data:application/octet-stream;base64,Z2x0ZlNhbXBsZQ==',
    meta: {
      title: 'BIM 示例 - 建筑模型',
      mimeType: 'model/gltf-binary'
    }
  },
  {
    id: 'cad-sample',
    type: 'cad',
    url: 'data:application/octet-stream;base64,QXV0b0NBRAQ=',
    meta: {
      title: 'CAD 示例 - 工程图纸',
      mimeType: 'application/acad'
    }
  }
])

// State
const selectedFileId = ref('pdf-sample')
const config = ref<FileViewerConfig>({
  theme: 'light',
  toolbar: true,
  zoom: 1,
  preload: false,
  maxFileSize: 100 * 1024 * 1024,
  cache: true
})
const progressVisible = ref(false)
const progress = ref(0)
const progressText = ref('')
const showAITools = ref(false)
const activeAITool = ref('')

// Computed
const selectedFile = computed(() => {
  return sampleFiles.value.find(file => file.id === selectedFileId.value) || null
})

// Methods
function handleFileSelect(fileId: string) {
  selectedFileId.value = fileId
}

function handleFileUpload(uploadFile: any) {
  const file = uploadFile.raw
  if (!file) return
  
  // Create object URL for local file
  const url = URL.createObjectURL(file)
  const fileObject = createFileObject(url, {
    meta: {
      title: file.name,
      size: file.size,
      mimeType: file.type,
      lastModified: new Date(file.lastModified)
    }
  })
  
  // Add to sample files
  const newFile = {
    ...fileObject,
    id: `upload-${Date.now()}`
  }
  
  sampleFiles.value.push(newFile)
  selectedFileId.value = newFile.id
  
  ElMessage.success(`文件 "${file.name}" 已添加`)
}

function handleFileLoad(file: FileObject) {
  progressVisible.value = false
  ElMessage.success('文件加载成功')
}

function handleFileError(error: Error) {
  progressVisible.value = false
  ElMessage.error(`文件加载失败: ${error.message}`)
}

function handleFileProgress(loaded: number, total: number) {
  if (total > 0) {
    progressVisible.value = true
    progress.value = Math.round((loaded / total) * 100)
    progressText.value = `已加载 ${Math.round(loaded / 1024)} KB / ${Math.round(total / 1024)} KB`
  }
}

function handleAIToolSelect(toolId: string) {
  activeAITool.value = toolId
  showAITools.value = true
}</script>

<style scoped>
#app {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.el-header {
  background-color: #409eff;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

.el-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.el-header p {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

.el-main {
  padding: 20px;
}

.el-card {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.el-menu-item {
  height: auto;
  line-height: 1.4;
  padding: 12px 20px;
}

.el-menu-item span {
  margin-left: 8px;
  font-size: 14px;
}
</style>