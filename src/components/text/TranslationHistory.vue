<template>
  <div class="translation-history">
    <div class="translation-history__header">
      <h3 class="translation-history__title">翻译历史</h3>
      <div class="translation-history__actions">
        <el-button
          size="small"
          @click="exportToExcel"
          :disabled="history.records.length === 0"
        >
          <el-icon><Download /></el-icon>
          导出Excel
        </el-button>
        <el-button
          size="small"
          type="danger"
          @click="clearHistory"
          :disabled="history.records.length === 0"
        >
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </div>

    <div class="translation-history__stats">
      <div class="translation-history__stat">
        <span class="translation-history__stat-label">总计：</span>
        <span class="translation-history__stat-value">{{ history.records.length }}</span>
      </div>
      <div class="translation-history__stat">
        <span class="translation-history__stat-label">今日：</span>
        <span class="translation-history__stat-value">{{ todayCount }}</span>
      </div>
    </div>

    <div class="translation-history__list">
      <div
        v-for="record in displayedRecords"
        :key="record.id"
        class="history-item"
        @click="loadRecord(record)"
      >
        <div class="history-item__header">
          <div class="history-item__languages">
            <el-tag size="small" type="info">{{ record.sourceLang }}</el-tag>
            <el-icon class="history-item__arrow"><ArrowRight /></el-icon>
            <el-tag size="small" type="success">{{ record.targetLang }}</el-tag>
          </div>
          <div class="history-item__time">
            {{ formatTime(record.timestamp) }}
          </div>
        </div>
        
        <div class="history-item__content">
          <div class="history-item__text">
            <div class="history-item__source">
              {{ truncateText(record.sourceText, 100) }}
            </div>
            <div class="history-item__translated">
              {{ truncateText(record.translatedText, 100) }}
            </div>
          </div>
        </div>

        <div class="history-item__footer">
          <div class="history-item__meta">
            <span v-if="record.model" class="history-item__model">
              {{ record.model }}
            </span>
            <span v-if="record.score" class="history-item__score">
              评分: {{ record.score }}/5
            </span>
          </div>
          <div class="history-item__actions" @click.stop>
            <el-button
              type="text"
              size="small"
              @click="copyRecord(record)"
            >
              <el-icon><CopyDocument /></el-icon>
            </el-button>
            <el-button
              type="text"
              size="small"
              @click="deleteRecord(record.id)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <div v-if="history.records.length === 0" class="translation-history__empty">
        <el-empty 
          description="暂无翻译历史"
          :image-size="80"
        />
      </div>
    </div>

    <!-- Load More -->
    <div v-if="hasMore" class="translation-history__load-more">
      <el-button @click="loadMore" :loading="loading">
        加载更多
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ArrowRight, Download, Delete, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TranslationHistory, TranslationPair } from '../../types'

interface Props {
  history?: TranslationHistory
}

interface Emits {
  (e: 'update:history', history: TranslationHistory): void
  (e: 'load-record', record: TranslationPair): void
}

const props = withDefaults(defineProps<Props>(), {
  history: () => ({
    records: [],
    maxRecords: 50
  })
})

const emit = defineEmits<Emits>()

const loading = ref(false)
const pageSize = 10
const currentPage = ref(1)

const displayedRecords = computed(() => {
  const endIndex = currentPage.value * pageSize
  return props.history.records.slice(0, endIndex)
})

const hasMore = computed(() => {
  return displayedRecords.value.length < props.history.records.length
})

const todayCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return props.history.records.filter(record => {
    const recordDate = new Date(record.timestamp)
    recordDate.setHours(0, 0, 0, 0)
    return recordDate.getTime() === today.getTime()
  }).length
})

function formatTime(timestamp: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function loadRecord(record: TranslationPair) {
  emit('load-record', record)
  ElMessage.success('已加载翻译记录')
}

function copyRecord(record: TranslationPair) {
  const text = `原文 (${record.sourceLang}): ${record.sourceText}\n译文 (${record.targetLang}): ${record.translatedText}`
  
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      ElMessage.success('已复制到剪贴板')
    }).catch(() => {
      fallbackCopy(text)
    })
  } else {
    fallbackCopy(text)
  }
}

function fallbackCopy(text: string) {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  
  try {
    document.execCommand('copy')
    ElMessage.success('已复制到剪贴板')
  } catch (err) {
    ElMessage.error('复制失败')
  }
  
  document.body.removeChild(textArea)
}

function deleteRecord(recordId: string) {
  ElMessageBox.confirm(
    '确定要删除这条翻译记录吗？',
    '确认删除',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const updatedRecords = props.history.records.filter(r => r.id !== recordId)
    emit('update:history', {
      ...props.history,
      records: updatedRecords
    })
    ElMessage.success('记录删除成功')
  }).catch(() => {
    // User cancelled
  })
}

function clearHistory() {
  ElMessageBox.confirm(
    '确定要清空所有翻译历史吗？此操作不可恢复。',
    '确认清空',
    {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    emit('update:history', {
      ...props.history,
      records: []
    })
    currentPage.value = 1
    ElMessage.success('历史记录已清空')
  }).catch(() => {
    // User cancelled
  })
}

function loadMore() {
  loading.value = true
  // Simulate loading delay
  setTimeout(() => {
    currentPage.value++
    loading.value = false
  }, 500)
}

function exportToExcel() {
  if (props.history.records.length === 0) {
    ElMessage.warning('没有可导出的记录')
    return
  }

  // Create CSV content
  const headers = ['时间', '源语言', '目标语言', '原文', '译文', '模型', '评分']
  const csvContent = [
    headers.join(','),
    ...props.history.records.map(record => [
      new Date(record.timestamp).toLocaleString('zh-CN'),
      record.sourceLang,
      record.targetLang,
      `"${record.sourceText.replace(/"/g, '""')}"`,
      `"${record.translatedText.replace(/"/g, '""')}"`,
      record.model || '',
      record.score || ''
    ].join(','))
  ].join('\n')

  // Create and download file
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `翻译历史_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  ElMessage.success('导出成功')
}

// Reset pagination when history changes
watch(() => props.history.records.length, () => {
  currentPage.value = 1
})
</script>

<style scoped>
.translation-history {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.translation-history__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--file-viewer-border);
}

.translation-history__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--file-viewer-text);
}

.translation-history__actions {
  display: flex;
  gap: 8px;
}

.translation-history__stats {
  display: flex;
  gap: 20px;
  padding: 8px 0;
}

.translation-history__stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.translation-history__stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.translation-history__stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.translation-history__list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--file-viewer-border);
  border-radius: 8px;
  background: var(--file-viewer-background);
}

.history-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--file-viewer-border);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item:hover {
  background: var(--file-viewer-surface);
}

.history-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.history-item__languages {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-item__arrow {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.history-item__time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.history-item__content {
  margin-bottom: 8px;
}

.history-item__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-item__source,
.history-item__translated {
  font-size: 13px;
  line-height: 1.4;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--file-viewer-surface);
}

.history-item__source {
  border-left: 3px solid var(--el-color-info);
}

.history-item__translated {
  border-left: 3px solid var(--el-color-success);
}

.history-item__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-item__meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.history-item__model,
.history-item__score {
  padding: 2px 6px;
  background: var(--el-fill-color-light);
  border-radius: 3px;
}

.history-item__actions {
  display: flex;
  gap: 4px;
}

.translation-history__empty {
  padding: 40px 20px;
  text-align: center;
}

.translation-history__load-more {
  text-align: center;
  padding: 16px;
}

/* Custom scrollbar */
.translation-history__list::-webkit-scrollbar {
  width: 6px;
}

.translation-history__list::-webkit-scrollbar-track {
  background: var(--file-viewer-surface);
}

.translation-history__list::-webkit-scrollbar-thumb {
  background: var(--file-viewer-border);
  border-radius: 3px;
}

.translation-history__list::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-secondary);
}
</style>