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
                <!-- Translation Demo Item -->
                <el-menu-item index="translation-demo">
                  <el-icon><Position /></el-icon>
                  <span>翻译模块演示</span>
                </el-menu-item>
                
                <el-divider style="margin: 8px 0;" />
                
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
          </el-col>
          
          <!-- Preview Panel -->
          <el-col :span="18">
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
                  </div>
                </div>
              </template>
              
              <div style="height: 600px;">
                <!-- Translation Demo -->
                <TranslationEditor
                  v-if="selectedFileId === 'translation-demo'"
                  initial-text="欢迎使用YLY Search Viewer的翻译模块！这是一个功能完整的文本翻译系统，支持多种语言互译、术语管理、AI参数调节和翻译历史记录。"
                  @translation-complete="handleTranslationComplete"
                  @error="handleTranslationError"
                />
                
                <!-- File Preview -->
                <FileViewer
                  v-else-if="selectedFile"
                  :file="selectedFile"
                  :config="config"
                  @load="handleFileLoad"
                  @error="handleFileError"
                  @progress="handleFileProgress"
                />
                
                <el-empty v-else description="请选择一个文件进行预览或体验翻译功能" />
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
  ElDivider,
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
  Position
} from '@element-plus/icons-vue'
import { FileViewer, TranslationEditor } from '../index'
import type { FileObject, FileViewerConfig, TranslationRecord } from '../types'
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

// Translation handlers
function handleTranslationComplete(result: TranslationRecord) {
  ElMessage.success(`翻译完成：${result.sourceLang} → ${result.targetLang}`)
  console.log('Translation completed:', result)
}

function handleTranslationError(error: string) {
  ElMessage.error(`翻译失败: ${error}`)
  console.error('Translation error:', error)
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