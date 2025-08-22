<template>
  <div class="translation-panel">
    <div class="translation-panel__header">
      <h3 class="translation-panel__title">文档翻译</h3>
      <el-button
        type="primary"
        size="small"
        @click="openFullEditor"
      >
        完整编辑器
      </el-button>
    </div>

    <!-- Quick Language Selection -->
    <div class="translation-panel__languages">
      <el-select
        v-model="sourceLang"
        size="small"
        placeholder="源语言"
        @change="handleLanguageChange"
      >
        <el-option
          v-for="lang in commonLanguages"
          :key="lang.code"
          :value="lang.code"
          :label="lang.name"
        />
      </el-select>
      
      <el-button
        type="text"
        size="small"
        @click="swapLanguages"
        :disabled="!sourceLang || !targetLang"
      >
        <el-icon><Switch /></el-icon>
      </el-button>
      
      <el-select
        v-model="targetLang"
        size="small"
        placeholder="目标语言"
        @change="handleLanguageChange"
      >
        <el-option
          v-for="lang in availableTargetLanguages"
          :key="lang.code"
          :value="lang.code"
          :label="lang.name"
        />
      </el-select>
    </div>

    <!-- Quick Translation Input -->
    <div class="translation-panel__input">
      <el-input
        v-model="quickText"
        type="textarea"
        :rows="4"
        placeholder="输入要翻译的文本..."
        @keyup.ctrl.enter="handleQuickTranslate"
      />
      <el-button
        type="primary"
        size="small"
        :loading="isTranslating"
        :disabled="!quickText.trim()"
        @click="handleQuickTranslate"
        class="translation-panel__translate-btn"
      >
        <el-icon><Position /></el-icon>
        翻译 (Ctrl+Enter)
      </el-button>
    </div>

    <!-- Translation Result -->
    <div v-if="translationResult" class="translation-panel__result">
      <div class="translation-panel__result-header">
        <span class="translation-panel__result-label">译文</span>
        <el-button
          type="text"
          size="small"
          @click="copyResult"
        >
          <el-icon><CopyDocument /></el-icon>
        </el-button>
      </div>
      <div class="translation-panel__result-content">
        {{ translationResult }}
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="translation-panel__actions">
      <el-button
        size="small"
        @click="extractDocumentText"
        :disabled="!hasDocument"
      >
        <el-icon><Document /></el-icon>
        提取文档文本
      </el-button>
      <el-button
        size="small"
        @click="showHistory = !showHistory"
      >
        <el-icon><Clock /></el-icon>
        历史记录
      </el-button>
    </div>

    <!-- Recent History (collapsible) -->
    <div v-if="showHistory" class="translation-panel__history">
      <div class="translation-panel__history-header">
        <span>最近翻译</span>
        <el-button
          type="text"
          size="small"
          @click="showHistory = false"
        >
          <el-icon><ArrowUp /></el-icon>
        </el-button>
      </div>
      <div class="translation-panel__history-list">
        <div
          v-for="record in recentRecords"
          :key="record.id"
          class="translation-panel__history-item"
          @click="loadHistoryRecord(record)"
        >
          <div class="translation-panel__history-text">
            {{ truncateText(record.sourceText, 50) }}
          </div>
          <div class="translation-panel__history-meta">
            <span>{{ record.sourceLang }} → {{ record.targetLang }}</span>
            <span>{{ formatTime(record.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      size="small"
      closable
      @close="error = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Switch, Position, CopyDocument, Document, Clock, ArrowUp } from '@element-plus/icons-vue'
import type { Language, TranslationRecord } from '../../types'

interface Props {
  hasDocument?: boolean
  documentText?: string
}

interface Emits {
  (e: 'open-full-editor', text?: string): void
  (e: 'extract-text'): void
  (e: 'translation-complete', result: TranslationRecord): void
}

const props = withDefaults(defineProps<Props>(), {
  hasDocument: false,
  documentText: ''
})

const emit = defineEmits<Emits>()

// State
const sourceLang = ref('zh')
const targetLang = ref('en')
const quickText = ref('')
const translationResult = ref('')
const isTranslating = ref(false)
const error = ref<string | null>(null)
const showHistory = ref(false)

// Mock history for demo
const recentRecords = ref<TranslationRecord[]>([])

// Common languages for quick selection
const commonLanguages: Language[] = [
  { code: 'zh', name: '中文', nativeName: '中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: '日本語', nativeName: '日本語' },
  { code: 'ko', name: '한국어', nativeName: '한국어' },
  { code: 'fr', name: 'Français', nativeName: 'Français' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch' }
]

const availableTargetLanguages = computed(() => {
  return commonLanguages.filter(lang => lang.code !== sourceLang.value)
})

function handleLanguageChange() {
  // Clear result when languages change
  translationResult.value = ''
  
  // If we have text, auto-translate
  if (quickText.value.trim()) {
    handleQuickTranslate()
  }
}

function swapLanguages() {
  const temp = sourceLang.value
  sourceLang.value = targetLang.value
  targetLang.value = temp

  // Swap text content
  if (translationResult.value) {
    const tempText = quickText.value
    quickText.value = translationResult.value
    translationResult.value = tempText
  }
}

async function handleQuickTranslate() {
  if (!quickText.value.trim()) {
    ElMessage.warning('请输入要翻译的文本')
    return
  }

  isTranslating.value = true
  error.value = null

  try {
    // Simulate translation API call
    const result = await translateText(quickText.value, sourceLang.value, targetLang.value)
    translationResult.value = result
    
    // Add to recent records
    const record: TranslationRecord = {
      id: generateId(),
      sourceText: quickText.value,
      translatedText: result,
      sourceLang: sourceLang.value,
      targetLang: targetLang.value,
      timestamp: new Date()
    }
    
    recentRecords.value.unshift(record)
    if (recentRecords.value.length > 5) {
      recentRecords.value = recentRecords.value.slice(0, 5)
    }
    
    emit('translation-complete', record)
    ElMessage.success('翻译完成')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '翻译失败'
  } finally {
    isTranslating.value = false
  }
}

function copyResult() {
  if (!translationResult.value) return

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(translationResult.value).then(() => {
      ElMessage.success('已复制到剪贴板')
    }).catch(() => {
      fallbackCopy(translationResult.value)
    })
  } else {
    fallbackCopy(translationResult.value)
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

function openFullEditor() {
  emit('open-full-editor', quickText.value)
}

function extractDocumentText() {
  if (props.documentText) {
    quickText.value = props.documentText
    ElMessage.success('文档文本已提取')
  } else {
    emit('extract-text')
  }
}

function loadHistoryRecord(record: TranslationRecord) {
  quickText.value = record.sourceText
  translationResult.value = record.translatedText
  sourceLang.value = record.sourceLang
  targetLang.value = record.targetLang
  ElMessage.success('已加载历史记录')
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function formatTime(timestamp: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

// Mock translation function
async function translateText(text: string, from: string, to: string): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Mock translation
  const mockTranslations: Record<string, string> = {
    'zh-en': `[EN] ${text}`,
    'en-zh': `[中文] ${text}`,
    'zh-ja': `[日本語] ${text}`,
    'ja-zh': `[中文] ${text}`
  }

  const langPair = `${from}-${to}`
  return mockTranslations[langPair] || `Translated from ${from} to ${to}: ${text}`
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Watch for document text changes
watch(() => props.documentText, (newText) => {
  if (newText && !quickText.value) {
    quickText.value = newText.substring(0, 200) // Take first 200 chars
  }
})
</script>

<style scoped>
.translation-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  height: 100%;
}

.translation-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--file-viewer-border);
}

.translation-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--file-viewer-text);
}

.translation-panel__languages {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
}

.translation-panel__input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.translation-panel__translate-btn {
  align-self: flex-end;
}

.translation-panel__result {
  border: 1px solid var(--file-viewer-border);
  border-radius: 6px;
  overflow: hidden;
}

.translation-panel__result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--file-viewer-surface);
  border-bottom: 1px solid var(--file-viewer-border);
}

.translation-panel__result-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--file-viewer-text);
}

.translation-panel__result-content {
  padding: 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--file-viewer-text);
  background: var(--file-viewer-background);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.translation-panel__actions {
  display: flex;
  gap: 8px;
}

.translation-panel__history {
  border: 1px solid var(--file-viewer-border);
  border-radius: 6px;
  overflow: hidden;
}

.translation-panel__history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--file-viewer-surface);
  border-bottom: 1px solid var(--file-viewer-border);
  font-size: 12px;
  font-weight: 500;
  color: var(--file-viewer-text);
}

.translation-panel__history-list {
  max-height: 200px;
  overflow-y: auto;
  background: var(--file-viewer-background);
}

.translation-panel__history-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--file-viewer-border);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.translation-panel__history-item:last-child {
  border-bottom: none;
}

.translation-panel__history-item:hover {
  background: var(--file-viewer-surface);
}

.translation-panel__history-text {
  font-size: 13px;
  color: var(--file-viewer-text);
  margin-bottom: 4px;
  line-height: 1.4;
}

.translation-panel__history-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

/* Custom scrollbar */
.translation-panel__history-list::-webkit-scrollbar {
  width: 4px;
}

.translation-panel__history-list::-webkit-scrollbar-track {
  background: var(--file-viewer-surface);
}

.translation-panel__history-list::-webkit-scrollbar-thumb {
  background: var(--file-viewer-border);
  border-radius: 2px;
}

.translation-panel__history-list::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-secondary);
}

/* Element Plus customizations */
.translation-panel .el-select {
  width: 100%;
}

.translation-panel .el-button--small {
  font-size: 12px;
}
</style>