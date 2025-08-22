<template>
  <div class="translation-editor">
    <!-- Language Selection -->
    <div class="translation-editor__header">
      <LanguageSelector
        v-model:source-lang="translationState.sourceLang"
        v-model:target-lang="translationState.targetLang"
        @translate="handleTranslate"
      />
    </div>

    <!-- Main Content -->
    <div class="translation-editor__content">
      <!-- Translation Pair -->
      <div class="translation-editor__main">
        <TranslationPair
          v-model:source-text="translationState.sourceText"
          v-model:translated-text="translationState.translatedText"
          :highlights="translationState.highlights"
          :sync-scroll="true"
          @retranslate="handleRetranslate"
        />
      </div>

      <!-- Advanced Features Panel -->
      <div class="translation-editor__sidebar">
        <el-collapse v-model="activeCollapse" accordion>
          <!-- Terminology Management -->
          <el-collapse-item title="术语库管理" name="terminology">
            <TerminologyManager
              v-model:terminology="terminology"
              v-model:custom-rules="customRules"
              @terminology-change="handleTerminologyChange"
            />
          </el-collapse-item>

          <!-- AI Settings -->
          <el-collapse-item title="AI参数设置" name="ai-settings">
            <AISettingsPanel
              v-model:settings="aiSettings"
              @settings-change="handleSettingsChange"
            />
          </el-collapse-item>

          <!-- Translation History -->
          <el-collapse-item title="翻译历史" name="history">
            <TranslationHistory
              v-model:history="translationHistory"
              @load-record="handleLoadRecord"
            />
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="translationState.isTranslating" class="translation-editor__loading">
      <el-loading-service :target="'.translation-editor'" />
    </div>

    <!-- Action Bar -->
    <div class="translation-editor__actions">
      <div class="translation-editor__actions-left">
        <el-button
          type="primary"
          :loading="translationState.isTranslating"
          :disabled="!translationState.sourceText.trim()"
          @click="handleTranslate"
        >
          <el-icon><Position /></el-icon>
          翻译
        </el-button>
        <el-button
          :disabled="!translationState.translatedText"
          @click="handleCopyTranslation"
        >
          <el-icon><CopyDocument /></el-icon>
          复制译文
        </el-button>
        <el-button
          :disabled="!canSaveToHistory"
          @click="handleSaveToHistory"
        >
          <el-icon><StarFilled /></el-icon>
          保存到历史
        </el-button>
      </div>
      
      <div class="translation-editor__actions-right">
        <div class="translation-editor__character-stats">
          <span class="translation-editor__stat">
            原文: {{ translationState.characterCount.source }} 字符
          </span>
          <span class="translation-editor__stat">
            译文: {{ translationState.characterCount.translated }} 字符
          </span>
          <span class="translation-editor__stat">
            比例: {{ translationState.characterCount.ratio.toFixed(2) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <el-alert
      v-if="translationState.error"
      :title="translationState.error"
      type="error"
      show-icon
      closable
      @close="translationState.error = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
import { Position, CopyDocument, StarFilled } from '@element-plus/icons-vue'
import LanguageSelector from './LanguageSelector.vue'
import TranslationPair from './TranslationPair.vue'
import TerminologyManager from './TerminologyManager.vue'
import AISettingsPanel from './AISettingsPanel.vue'
import TranslationHistory from './TranslationHistory.vue'
import type { 
  TranslationState, 
  TranslationSettings, 
  TranslationHistory as THistory,
  TranslationPair as TPair,
  TerminologyEntry 
} from '../../types'

interface Props {
  initialText?: string
  sourceLang?: string
  targetLang?: string
}

interface Emits {
  (e: 'translation-complete', result: TPair): void
  (e: 'error', error: string): void
}

const props = withDefaults(defineProps<Props>(), {
  initialText: '',
  sourceLang: 'zh',
  targetLang: 'en'
})

const emit = defineEmits<Emits>()

// Component state
const activeCollapse = ref(['terminology'])

// Translation state
const translationState = reactive<TranslationState>({
  sourceText: props.initialText,
  translatedText: '',
  sourceLang: props.sourceLang,
  targetLang: props.targetLang,
  isTranslating: false,
  error: null,
  highlights: [],
  characterCount: {
    source: 0,
    translated: 0,
    ratio: 0
  }
})

// AI settings
const aiSettings = reactive<TranslationSettings>({
  model: 'gpt-4',
  temperature: 0.7,
  style: 'formal'
})

// Terminology
const terminology = ref<TerminologyEntry[]>([])
const customRules = ref('')

// Translation history
const translationHistory = reactive<THistory>({
  records: [],
  maxRecords: 50
})

// Computed properties
const canSaveToHistory = computed(() => {
  return translationState.sourceText.trim() && 
         translationState.translatedText.trim() &&
         !translationState.isTranslating
})

// Update character counts
watch([() => translationState.sourceText, () => translationState.translatedText], () => {
  updateCharacterCount()
})

function updateCharacterCount() {
  translationState.characterCount.source = translationState.sourceText.length
  translationState.characterCount.translated = translationState.translatedText.length
  translationState.characterCount.ratio = translationState.characterCount.source > 0 
    ? translationState.characterCount.translated / translationState.characterCount.source 
    : 0
}

async function handleTranslate() {
  if (!translationState.sourceText.trim()) {
    ElMessage.warning('请输入要翻译的文本')
    return
  }

  translationState.isTranslating = true
  translationState.error = null

  try {
    // Simulate translation API call
    const result = await translateText(
      translationState.sourceText,
      translationState.sourceLang,
      translationState.targetLang,
      aiSettings
    )

    translationState.translatedText = result.translatedText
    translationState.highlights = result.highlights || []

    // Create translation pair
    const translationPair: TPair = {
      id: generateId(),
      sourceText: translationState.sourceText,
      translatedText: result.translatedText,
      sourceLang: translationState.sourceLang,
      targetLang: translationState.targetLang,
      timestamp: new Date(),
      model: aiSettings.model,
      score: result.score
    }

    emit('translation-complete', translationPair)
    ElMessage.success('翻译完成')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '翻译失败'
    translationState.error = errorMessage
    emit('error', errorMessage)
  } finally {
    translationState.isTranslating = false
  }
}

function handleRetranslate() {
  if (translationState.sourceText.trim()) {
    handleTranslate()
  }
}

function handleTerminologyChange() {
  // Re-translate if there's text and terminology affects the result
  if (translationState.sourceText.trim() && translationState.translatedText.trim()) {
    handleRetranslate()
  }
}

function handleSettingsChange() {
  // Re-translate if settings change significantly
  if (translationState.sourceText.trim() && translationState.translatedText.trim()) {
    handleRetranslate()
  }
}

function handleLoadRecord(record: TPair) {
  translationState.sourceText = record.sourceText
  translationState.translatedText = record.translatedText
  translationState.sourceLang = record.sourceLang
  translationState.targetLang = record.targetLang
}

function handleCopyTranslation() {
  if (!translationState.translatedText) return

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(translationState.translatedText).then(() => {
      ElMessage.success('译文已复制到剪贴板')
    }).catch(() => {
      fallbackCopy(translationState.translatedText)
    })
  } else {
    fallbackCopy(translationState.translatedText)
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
    ElMessage.success('译文已复制到剪贴板')
  } catch (err) {
    ElMessage.error('复制失败')
  }
  
  document.body.removeChild(textArea)
}

function handleSaveToHistory() {
  if (!canSaveToHistory.value) return

  const record: TPair = {
    id: generateId(),
    sourceText: translationState.sourceText,
    translatedText: translationState.translatedText,
    sourceLang: translationState.sourceLang,
    targetLang: translationState.targetLang,
    timestamp: new Date(),
    model: aiSettings.model
  }

  // Add to history (keep only last maxRecords)
  const updatedRecords = [record, ...translationHistory.records]
    .slice(0, translationHistory.maxRecords)

  translationHistory.records = updatedRecords
  ElMessage.success('已保存到翻译历史')
}

// Mock translation function
async function translateText(
  text: string, 
  sourceLang: string, 
  targetLang: string, 
  settings: TranslationSettings
): Promise<{ translatedText: string; highlights?: any[]; score?: number }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Mock translation based on language pair
  const mockTranslations: Record<string, string> = {
    'zh-en': 'This is a mock English translation of the Chinese text.',
    'en-zh': '这是中文文本的模拟英文翻译。',
    'zh-ja': 'これは中国語テキストのモック日本語翻訳です。',
    'ja-zh': '这是日语文本的模拟中文翻译。'
  }

  const langPair = `${sourceLang}-${targetLang}`
  const baseTranslation = mockTranslations[langPair] || `Mock translation from ${sourceLang} to ${targetLang}: ${text}`

  // Apply style modifications
  let translatedText = baseTranslation
  if (settings.style === 'casual') {
    translatedText = `(Casual style) ${baseTranslation}`
  } else if (settings.style === 'technical') {
    translatedText = `(Technical style) ${baseTranslation}`
  }

  return {
    translatedText,
    score: Math.round((Math.random() * 2 + 3) * 10) / 10 // Random score between 3.0-5.0
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Initialize character count
updateCharacterCount()
</script>

<style scoped>
.translation-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
  background: var(--file-viewer-background);
  position: relative;
}

.translation-editor__header {
  flex-shrink: 0;
}

.translation-editor__content {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.translation-editor__main {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.translation-editor__sidebar {
  background: var(--file-viewer-surface);
  border-radius: 8px;
  border: 1px solid var(--file-viewer-border);
  overflow: hidden;
}

.translation-editor__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--file-viewer-surface);
  border-radius: 8px;
  border: 1px solid var(--file-viewer-border);
  flex-shrink: 0;
}

.translation-editor__actions-left {
  display: flex;
  gap: 12px;
}

.translation-editor__actions-right {
  display: flex;
  align-items: center;
}

.translation-editor__character-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.translation-editor__stat {
  padding: 4px 8px;
  background: var(--file-viewer-background);
  border-radius: 4px;
  border: 1px solid var(--file-viewer-border);
}

.translation-editor__loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  z-index: 1000;
}

/* Responsive design */
@media (max-width: 1200px) {
  .translation-editor__content {
    grid-template-columns: 1fr 300px;
  }
}

@media (max-width: 768px) {
  .translation-editor__content {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  
  .translation-editor__actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .translation-editor__character-stats {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}

/* Element Plus customizations */
.translation-editor .el-collapse {
  border: none;
}

.translation-editor .el-collapse-item__header {
  background: var(--file-viewer-surface);
  border-bottom: 1px solid var(--file-viewer-border);
  padding-left: 16px;
  font-weight: 500;
}

.translation-editor .el-collapse-item__content {
  padding: 16px;
  background: var(--file-viewer-background);
}
</style>