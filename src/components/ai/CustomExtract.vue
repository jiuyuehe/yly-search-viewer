<template>
  <div class="custom-extract">
    <el-card>
      <template #header>
        <div class="header-actions">
          <span>自定义数据抽取</span>
          <el-button 
            size="small" 
            @click="showTemplateManager = true"
          >
            <el-icon><Setting /></el-icon>
            管理模板
          </el-button>
        </div>
      </template>

      <!-- Template Selection -->
      <div class="template-selection">
        <el-form :inline="true">
          <el-form-item label="选择模板">
            <el-select
              v-model="selectedTemplateId"
              placeholder="请选择抽取模板"
              filterable
              @change="onTemplateChange"
              style="width: 250px"
            >
              <el-option
                v-for="template in activeTemplates"
                :key="template.id"
                :label="template.name"
                :value="template.id"
              >
                <div class="template-option">
                  <span>{{ template.name }}</span>
                  <el-tag size="small" style="margin-left: 8px">
                    {{ template.category || '默认' }}
                  </el-tag>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-button 
              type="primary" 
              :disabled="!selectedTemplate || extracting"
              :loading="extracting"
              @click="startExtraction"
            >
              <el-icon><MagicStick /></el-icon>
              {{ extracting ? '抽取中...' : '开始抽取' }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- Template Preview -->
      <div v-if="selectedTemplate" class="template-preview">
        <el-divider content-position="left">模板预览</el-divider>
        <div class="template-info">
          <el-descriptions :column="2" size="small">
            <el-descriptions-item label="模板名称">{{ selectedTemplate.name }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ selectedTemplate.category || '默认' }}</el-descriptions-item>
            <el-descriptions-item label="字段数量">{{ selectedTemplate.fields.length }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDate(selectedTemplate.createdAt) }}</el-descriptions-item>
          </el-descriptions>
          
          <div v-if="selectedTemplate.description" class="template-description">
            <el-text type="info">{{ selectedTemplate.description }}</el-text>
          </div>
        </div>

        <!-- Fields Preview -->
        <div class="fields-preview">
          <el-table :data="selectedTemplate.fields" size="small">
            <el-table-column prop="label" label="字段名称" width="150" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ getFieldTypeLabel(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="required" label="必填" width="80">
              <template #default="{ row }">
                <el-icon v-if="row.required" color="red"><Star /></el-icon>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" show-overflow-tooltip />
          </el-table>
        </div>
      </div>

      <!-- Extraction Progress -->
      <div v-if="extracting" class="extraction-progress">
        <el-divider content-position="left">抽取进度</el-divider>
        <el-progress 
          :percentage="extractionProgress" 
          :status="extractionStatus"
          show-text
        />
        <div class="progress-text">
          <el-text>{{ extractionMessage }}</el-text>
        </div>
      </div>

      <!-- Extraction Result -->
      <div v-if="extractionResult" class="extraction-result">
        <el-divider content-position="left">抽取结果</el-divider>
        
        <div class="result-actions">
          <el-button-group size="small">
            <el-button @click="editResult = !editResult">
              <el-icon><Edit /></el-icon>
              {{ editResult ? '查看模式' : '编辑模式' }}
            </el-button>
            <el-button @click="saveResult" :loading="saving">
              <el-icon><Check /></el-icon>
              保存结果
            </el-button>
            <el-button @click="clearResult">
              <el-icon><Close /></el-icon>
              清除结果
            </el-button>
          </el-button-group>
        </div>

        <!-- Result Form -->
        <el-form 
          ref="resultFormRef"
          :model="resultData"
          label-width="120px"
          class="result-form"
        >
          <el-form-item 
            v-for="field in selectedTemplate?.fields"
            :key="field.id"
            :label="field.label"
            :prop="field.name"
            :rules="field.required ? [{ required: true, message: `${field.label}为必填项`, trigger: 'blur' }] : []"
          >
            <!-- Text input -->
            <el-input 
              v-if="field.type === 'text'"
              v-model="resultData[field.name]"
              :placeholder="field.description || `请输入${field.label}`"
              :readonly="!editResult"
            />
            
            <!-- Number input -->
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="resultData[field.name]"
              :placeholder="field.description || `请输入${field.label}`"
              :disabled="!editResult"
              style="width: 100%"
            />
            
            <!-- Date input -->
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="resultData[field.name]"
              type="date"
              :placeholder="field.description || `请选择${field.label}`"
              :disabled="!editResult"
              style="width: 100%"
            />
            
            <!-- Select input -->
            <el-select
              v-else-if="field.type === 'select'"
              v-model="resultData[field.name]"
              :placeholder="field.description || `请选择${field.label}`"
              :disabled="!editResult"
              style="width: 100%"
            >
              <el-option
                v-for="option in field.options"
                :key="option"
                :label="option"
                :value="option"
              />
            </el-select>
            
            <!-- Textarea input -->
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="resultData[field.name]"
              type="textarea"
              :rows="3"
              :placeholder="field.description || `请输入${field.label}`"
              :readonly="!editResult"
            />
            
            <!-- Boolean input -->
            <el-switch
              v-else-if="field.type === 'boolean'"
              v-model="resultData[field.name]"
              :disabled="!editResult"
            />
            
            <!-- Default text input -->
            <el-input
              v-else
              v-model="resultData[field.name]"
              :placeholder="field.description || `请输入${field.label}`"
              :readonly="!editResult"
            />
          </el-form-item>
        </el-form>

        <!-- Extraction Metadata -->
        <div v-if="extractionResult.confidence" class="extraction-metadata">
          <el-divider content-position="left">抽取信息</el-divider>
          <el-descriptions :column="3" size="small">
            <el-descriptions-item label="置信度">
              <el-progress 
                :percentage="Math.round(extractionResult.confidence * 100)" 
                :stroke-width="6"
                :show-text="false"
              />
              {{ Math.round(extractionResult.confidence * 100) }}%
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getStatusType(extractionResult.status)">
                {{ getStatusText(extractionResult.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="抽取时间">
              {{ formatDate(new Date()) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-card>

    <!-- Template Manager Dialog -->
    <el-dialog
      v-model="showTemplateManager"
      title="模板管理"
      width="80%"
      :close-on-click-modal="false"
    >
      <ExtractTemplateManager />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { 
  ElCard, ElButton, ElForm, ElFormItem, ElSelect, ElOption, ElIcon, 
  ElTag, ElDivider, ElDescriptions, ElDescriptionsItem, ElText,
  ElTable, ElTableColumn, ElProgress, ElButtonGroup, ElInput,
  ElInputNumber, ElDatePicker, ElSwitch, ElDialog, ElMessage
} from 'element-plus'
import { 
  Setting, MagicStick, Star, Edit, Check, Close
} from '@element-plus/icons-vue'
import { useExtractStore } from '../../stores/extract'
import { aiService } from '../../services/ai'
import ExtractTemplateManager from './ExtractTemplateManager.vue'
import type { ExtractTemplate, FileObject } from '../../types'

interface Props {
  file: FileObject
}

const props = defineProps<Props>()

const extractStore = useExtractStore()

// Reactive state
const selectedTemplateId = ref<string>('')
const extracting = ref(false)
const extractionProgress = ref(0)
const extractionStatus = ref<'success' | 'exception' | undefined>()
const extractionMessage = ref('')
const extractionResult = ref<any>(null)
const resultData = ref<Record<string, any>>({})
const editResult = ref(false)
const saving = ref(false)
const showTemplateManager = ref(false)
const resultFormRef = ref()

// Computed
const activeTemplates = computed(() => extractStore.activeTemplates)
const selectedTemplate = computed(() => 
  selectedTemplateId.value ? extractStore.getTemplateById(selectedTemplateId.value) : null
)

// Methods
const onTemplateChange = () => {
  extractionResult.value = null
  resultData.value = {}
  editResult.value = false
}

const startExtraction = async () => {
  if (!selectedTemplate.value) return
  
  extracting.value = true
  extractionProgress.value = 0
  extractionStatus.value = undefined
  extractionMessage.value = '开始分析文档...'
  
  try {
    const generator = aiService.customExtract(props.file.url, selectedTemplate.value)
    
    for await (const chunk of generator) {
      if (chunk.status === 'processing') {
        extractionProgress.value = chunk.progress
        extractionMessage.value = `正在抽取数据... ${chunk.progress}%`
      } else if (chunk.status === 'completed') {
        extractionProgress.value = 100
        extractionStatus.value = 'success'
        extractionMessage.value = '抽取完成'
        extractionResult.value = chunk
        
        // Initialize result data with extracted values and defaults
        resultData.value = {}
        selectedTemplate.value.fields.forEach(field => {
          resultData.value[field.name] = chunk.data[field.name] ?? field.defaultValue ?? ''
        })
        
        editResult.value = true
        break
      }
    }
  } catch (error) {
    extractionStatus.value = 'exception'
    extractionMessage.value = '抽取失败'
    ElMessage.error('数据抽取失败，请重试')
    console.error(error)
  } finally {
    extracting.value = false
  }
}

const saveResult = async () => {
  if (!selectedTemplate.value || !extractionResult.value) return
  
  try {
    await resultFormRef.value?.validate()
    
    saving.value = true
    
    await extractStore.saveExtractResult({
      templateId: selectedTemplate.value.id,
      templateName: selectedTemplate.value.name,
      fileId: props.file.url, // Using URL as ID for now
      fileName: props.file.meta?.title || '未知文件',
      fileUrl: props.file.url,
      extractedData: resultData.value,
      confidence: extractionResult.value.confidence,
      status: 'completed'
    })
    
    ElMessage.success('抽取结果已保存')
    editResult.value = false
  } catch (error) {
    ElMessage.error('保存失败')
    console.error(error)
  } finally {
    saving.value = false
  }
}

const clearResult = () => {
  extractionResult.value = null
  resultData.value = {}
  editResult.value = false
  extractionProgress.value = 0
}

const getFieldTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    text: '文本',
    number: '数字',
    date: '日期',
    select: '选择',
    textarea: '多行文本',
    boolean: '是/否'
  }
  return labels[type] || type
}

const getStatusType = (status: string) => {
  const types: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
    completed: 'success',
    pending: 'warning',
    failed: 'danger',
    reviewing: 'info'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    completed: '已完成',
    pending: '处理中',
    failed: '失败',
    reviewing: '审核中'
  }
  return texts[status] || status
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Watch for template changes to reload from storage
watch(() => showTemplateManager.value, async (newVal) => {
  if (!newVal) {
    await extractStore.loadFromStorage()
  }
})

// Lifecycle
onMounted(async () => {
  await extractStore.loadFromStorage()
})
</script>

<style scoped>
.custom-extract {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-selection {
  margin-bottom: 20px;
}

.template-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-preview {
  margin-bottom: 20px;
}

.template-info {
  margin-bottom: 15px;
}

.template-description {
  margin-top: 10px;
}

.fields-preview {
  margin-top: 15px;
}

.extraction-progress {
  margin: 20px 0;
}

.progress-text {
  margin-top: 10px;
  text-align: center;
}

.extraction-result {
  margin-top: 20px;
}

.result-actions {
  margin-bottom: 20px;
}

.result-form {
  margin-top: 20px;
}

.extraction-metadata {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-light);
}
</style>