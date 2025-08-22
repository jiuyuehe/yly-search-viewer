<template>
  <div class="extract-history">
    <el-card>
      <template #header>
        <div class="header-actions">
          <span>抽取历史记录</span>
          <el-button size="small" @click="refreshHistory">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <!-- Filter Controls -->
      <div class="filter-controls">
        <el-form :inline="true">
          <el-form-item label="模板筛选">
            <el-select
              v-model="filterTemplateId"
              placeholder="全部模板"
              clearable
              style="width: 200px"
            >
              <el-option
                v-for="template in templates"
                :key="template.id"
                :label="template.name"
                :value="template.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="状态筛选">
            <el-select
              v-model="filterStatus"
              placeholder="全部状态"
              clearable
              style="width: 150px"
            >
              <el-option label="已完成" value="completed" />
              <el-option label="处理中" value="pending" />
              <el-option label="失败" value="failed" />
              <el-option label="审核中" value="reviewing" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 240px"
            />
          </el-form-item>
          
          <el-form-item>
            <el-button @click="resetFilters">
              <el-icon><Close /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- History Table -->
      <el-table 
        :data="filteredResults" 
        v-loading="loading"
        @row-click="viewDetails"
        style="width: 100%"
      >
        <el-table-column label="文件信息" min-width="200">
          <template #default="{ row }">
            <div class="file-info">
              <div class="file-name">{{ row.fileName }}</div>
              <el-text size="small" type="info">{{ row.fileId }}</el-text>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="使用模板" width="150">
          <template #default="{ row }">
            <el-text>{{ row.templateName }}</el-text>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="置信度" width="120">
          <template #default="{ row }">
            <div v-if="row.confidence" class="confidence-display">
              <el-progress 
                :percentage="Math.round(row.confidence * 100)" 
                :stroke-width="6"
                :show-text="false"
                style="width: 60px; margin-right: 8px"
              />
              {{ Math.round(row.confidence * 100) }}%
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        
        <el-table-column label="抽取时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group size="small">
              <el-button @click.stop="viewDetails(row)">
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button @click.stop="exportResult(row)">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
              <el-button 
                type="danger" 
                @click.stop="deleteResult(row)"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalResults"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- Details Dialog -->
    <el-dialog
      v-model="showDetails"
      :title="`抽取结果详情 - ${selectedResult?.fileName}`"
      width="60%"
      :close-on-click-modal="false"
    >
      <div v-if="selectedResult" class="result-details">
        <!-- Basic Info -->
        <el-descriptions :column="2" border>
          <el-descriptions-item label="文件名称">{{ selectedResult.fileName }}</el-descriptions-item>
          <el-descriptions-item label="使用模板">{{ selectedResult.templateName }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedResult.status)">
              {{ getStatusText(selectedResult.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="置信度">
            <span v-if="selectedResult.confidence">
              {{ Math.round(selectedResult.confidence * 100) }}%
            </span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="抽取时间">{{ formatDate(selectedResult.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(selectedResult.updatedAt) }}</el-descriptions-item>
        </el-descriptions>

        <!-- Extracted Data -->
        <el-divider content-position="left">抽取数据</el-divider>
        <div class="extracted-data">
          <el-table :data="extractedDataList" border>
            <el-table-column prop="label" label="字段名称" width="150" />
            <el-table-column prop="value" label="抽取值" min-width="200">
              <template #default="{ row }">
                <div v-if="row.type === 'boolean'">
                  <el-tag :type="row.value ? 'success' : 'info'">
                    {{ row.value ? '是' : '否' }}
                  </el-tag>
                </div>
                <div v-else-if="row.type === 'date'">
                  {{ formatDateValue(row.value) }}
                </div>
                <div v-else>
                  {{ row.value || '-' }}
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="字段类型" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ getFieldTypeLabel(row.type) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- Error Info -->
        <div v-if="selectedResult.error" class="error-info">
          <el-divider content-position="left">错误信息</el-divider>
          <el-alert 
            :title="selectedResult.error" 
            type="error" 
            :closable="false"
            show-icon
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="showDetails = false">关闭</el-button>
        <el-button type="primary" @click="exportResult(selectedResult!)">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  ElCard, ElButton, ElForm, ElFormItem, ElSelect, ElOption, 
  ElDatePicker, ElTable, ElTableColumn, ElTag, ElText, ElIcon,
  ElButtonGroup, ElPagination, ElDialog, ElDescriptions, 
  ElDescriptionsItem, ElDivider, ElAlert, ElMessage, ElMessageBox,
  ElProgress
} from 'element-plus'
import { 
  Refresh, Close, View, Download, Delete
} from '@element-plus/icons-vue'
import { useExtractStore } from '../../stores/extract'
import type { ExtractResult, ExtractTemplate } from '../../types'

const extractStore = useExtractStore()

// Reactive state
const filterTemplateId = ref('')
const filterStatus = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const currentPage = ref(1)
const pageSize = ref(20)
const showDetails = ref(false)
const selectedResult = ref<ExtractResult | null>(null)

// Computed
const templates = computed(() => extractStore.templates)
const results = computed(() => extractStore.results)
const loading = computed(() => extractStore.loading)

const filteredResults = computed(() => {
  let filtered = [...results.value]
  
  // Filter by template
  if (filterTemplateId.value) {
    filtered = filtered.filter(result => result.templateId === filterTemplateId.value)
  }
  
  // Filter by status
  if (filterStatus.value) {
    filtered = filtered.filter(result => result.status === filterStatus.value)
  }
  
  // Filter by date range
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    filtered = filtered.filter(result => {
      const resultDate = new Date(result.createdAt)
      return resultDate >= start && resultDate <= end
    })
  }
  
  return filtered
})

const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredResults.value.slice(start, end)
})

const totalResults = computed(() => filteredResults.value.length)

const extractedDataList = computed(() => {
  if (!selectedResult.value) return []
  
  const template = extractStore.getTemplateById(selectedResult.value.templateId)
  if (!template) return []
  
  return template.fields.map(field => ({
    label: field.label,
    value: selectedResult.value!.extractedData[field.name],
    type: field.type
  }))
})

// Methods
const refreshHistory = async () => {
  await extractStore.loadFromStorage()
}

const resetFilters = () => {
  filterTemplateId.value = ''
  filterStatus.value = ''
  dateRange.value = null
  currentPage.value = 1
}

const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const viewDetails = (result: ExtractResult) => {
  selectedResult.value = result
  showDetails.value = true
}

const exportResult = (result: ExtractResult) => {
  try {
    const data = {
      fileName: result.fileName,
      templateName: result.templateName,
      extractedData: result.extractedData,
      metadata: {
        confidence: result.confidence,
        status: result.status,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      }
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `extract_result_${result.fileName}_${formatFileDate(result.createdAt)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
    console.error(error)
  }
}

const deleteResult = async (result: ExtractResult) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${result.fileName}"的抽取结果吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await extractStore.deleteExtractResult(result.id)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(error)
    }
  }
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

const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

const formatDateValue = (value: any) => {
  if (!value) return '-'
  try {
    const date = new Date(value)
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
  } catch {
    return value
  }
}

const formatFileDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

// Lifecycle
onMounted(async () => {
  await extractStore.loadFromStorage()
})
</script>

<style scoped>
.extract-history {
  padding: 20px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-controls {
  margin-bottom: 20px;
  padding: 20px;
  background-color: var(--el-bg-color-page);
  border-radius: 4px;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-weight: 500;
}

.confidence-display {
  display: flex;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.result-details {
  max-height: 60vh;
  overflow-y: auto;
}

.extracted-data {
  margin-top: 15px;
}

.error-info {
  margin-top: 20px;
}
</style>