<template>
  <div class="translation-pair">
    <div class="translation-pair__container">
      <!-- Source Text Area -->
      <div class="translation-pair__column">
        <div class="translation-pair__header">
          <label class="translation-pair__label">原文</label>
          <div class="translation-pair__stats">
            <span class="translation-pair__count">{{ sourceCharCount }} 字符</span>
          </div>
        </div>
        <textarea
          id="source-text"
          ref="sourceTextareaRef"
          v-model="sourceTextValue"
          class="translation-pair__textarea"
          placeholder="请输入原文..."
          @input="handleSourceTextChange"
          @scroll="handleSourceScroll"
        />
      </div>

      <!-- Target Text Area -->
      <div class="translation-pair__column">
        <div class="translation-pair__header">
          <label class="translation-pair__label">译文</label>
          <div class="translation-pair__stats">
            <span class="translation-pair__count">{{ translatedCharCount }} 字符</span>
            <span class="translation-pair__ratio">
              比例: {{ charRatio }}
            </span>
          </div>
        </div>
        <textarea
          id="translated-text"
          ref="translatedTextareaRef"
          v-model="translatedTextValue"
          class="translation-pair__textarea"
          placeholder="译文将显示在此..."
          @input="handleTranslatedTextChange"
          @scroll="handleTranslatedScroll"
        />
      </div>
    </div>

    <!-- Highlighted Text Display -->
    <div v-if="showHighlights" class="translation-pair__highlights">
      <div class="translation-pair__column">
        <div class="translation-pair__highlighted-content" 
             v-html="highlightedSourceText" />
      </div>
      <div class="translation-pair__column">
        <div class="translation-pair__highlighted-content" 
             v-html="highlightedTranslatedText" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { TranslationHighlight } from '../../types'

interface Props {
  sourceText?: string
  translatedText?: string
  highlights?: TranslationHighlight[]
  showHighlights?: boolean
  syncScroll?: boolean
}

interface Emits {
  (e: 'update:sourceText', text: string): void
  (e: 'update:translatedText', text: string): void
  (e: 'retranslate'): void
}

const props = withDefaults(defineProps<Props>(), {
  sourceText: '',
  translatedText: '',
  highlights: () => [],
  showHighlights: true,
  syncScroll: true
})

const emit = defineEmits<Emits>()

const sourceTextareaRef = ref<HTMLTextAreaElement>()
const translatedTextareaRef = ref<HTMLTextAreaElement>()
const sourceTextValue = ref(props.sourceText)
const translatedTextValue = ref(props.translatedText)

// Character count statistics
const sourceCharCount = computed(() => sourceTextValue.value.length)
const translatedCharCount = computed(() => translatedTextValue.value.length)
const charRatio = computed(() => {
  if (sourceCharCount.value === 0) return '0:0'
  const ratio = (translatedCharCount.value / sourceCharCount.value).toFixed(2)
  return `1:${ratio}`
})

// Highlighted text with mark tags
const highlightedSourceText = computed(() => {
  return applyHighlights(sourceTextValue.value, props.highlights.filter(h => h.target === 'source'))
})

const highlightedTranslatedText = computed(() => {
  return applyHighlights(translatedTextValue.value, props.highlights.filter(h => h.target === 'translated'))
})

function applyHighlights(text: string, highlights: TranslationHighlight[]): string {
  if (!highlights.length) return text

  let result = ''
  let lastIndex = 0

  // Sort highlights by start position
  const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start)

  for (const highlight of sortedHighlights) {
    // Add text before highlight
    result += text.slice(lastIndex, highlight.start)
    
    // Add highlighted text
    const highlightedText = text.slice(highlight.start, highlight.end)
    const className = highlight.matched ? 'highlight matched' : 'highlight'
    result += `<mark class="${className}">${highlightedText}</mark>`
    
    lastIndex = highlight.end
  }

  // Add remaining text
  result += text.slice(lastIndex)
  
  return result
}

function handleSourceTextChange() {
  emit('update:sourceText', sourceTextValue.value)
  // Debounce retranslation to avoid too frequent API calls
  debounceRetranslate()
}

function handleTranslatedTextChange() {
  emit('update:translatedText', translatedTextValue.value)
  // If user edits translated text, trigger retranslation of source
  debounceRetranslate()
}

// Synchronized scrolling
function handleSourceScroll() {
  if (props.syncScroll && translatedTextareaRef.value && sourceTextareaRef.value) {
    const sourceEl = sourceTextareaRef.value
    const targetEl = translatedTextareaRef.value
    
    const scrollPercentage = sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight)
    targetEl.scrollTop = scrollPercentage * (targetEl.scrollHeight - targetEl.clientHeight)
  }
}

function handleTranslatedScroll() {
  if (props.syncScroll && sourceTextareaRef.value && translatedTextareaRef.value) {
    const targetEl = translatedTextareaRef.value
    const sourceEl = sourceTextareaRef.value
    
    const scrollPercentage = targetEl.scrollTop / (targetEl.scrollHeight - targetEl.clientHeight)
    sourceEl.scrollTop = scrollPercentage * (sourceEl.scrollHeight - sourceEl.clientHeight)
  }
}

// Debounced retranslation
let retranslateTimer: number | null = null

function debounceRetranslate() {
  if (retranslateTimer) {
    clearTimeout(retranslateTimer)
  }
  
  retranslateTimer = setTimeout(() => {
    emit('retranslate')
  }, 1000) // 1 second delay
}

// Watch for prop changes
watch(() => props.sourceText, (newVal) => {
  sourceTextValue.value = newVal
})

watch(() => props.translatedText, (newVal) => {
  translatedTextValue.value = newVal
})

// Auto-resize textareas
function autoResize(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto'
  textarea.style.height = Math.max(200, textarea.scrollHeight) + 'px'
}

// Initialize auto-resize
nextTick(() => {
  if (sourceTextareaRef.value) {
    autoResize(sourceTextareaRef.value)
  }
  if (translatedTextareaRef.value) {
    autoResize(translatedTextareaRef.value)
  }
})

watch(sourceTextValue, () => {
  nextTick(() => {
    if (sourceTextareaRef.value) {
      autoResize(sourceTextareaRef.value)
    }
  })
})

watch(translatedTextValue, () => {
  nextTick(() => {
    if (translatedTextareaRef.value) {
      autoResize(translatedTextareaRef.value)
    }
  })
})
</script>

<style scoped>
.translation-pair {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.translation-pair__container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: 400px;
}

.translation-pair__column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.translation-pair__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.translation-pair__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--file-viewer-text);
}

.translation-pair__stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.translation-pair__count,
.translation-pair__ratio {
  background: var(--file-viewer-surface);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--file-viewer-border);
}

.translation-pair__textarea {
  width: 100%;
  min-height: 200px;
  padding: 12px;
  border: 1px solid var(--file-viewer-border);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  background: var(--file-viewer-background);
  color: var(--file-viewer-text);
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease;
}

.translation-pair__textarea:focus {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
}

.translation-pair__textarea::placeholder {
  color: var(--el-text-color-placeholder);
}

.translation-pair__highlights {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
  padding: 16px;
  background: var(--file-viewer-surface);
  border-radius: 8px;
  border: 1px solid var(--file-viewer-border);
}

.translation-pair__highlighted-content {
  padding: 12px;
  background: var(--file-viewer-background);
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Highlight styles */
:deep(.highlight) {
  background-color: #fff3cd;
  color: #856404;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
}

:deep(.highlight.matched) {
  background-color: #d1ecf1;
  color: #0c5460;
}

/* Dark theme adjustments */
.file-viewer--dark .translation-pair__highlighted-content :deep(.highlight) {
  background-color: #3d3000;
  color: #ffc107;
}

.file-viewer--dark .translation-pair__highlighted-content :deep(.highlight.matched) {
  background-color: #003135;
  color: #17a2b8;
}

/* Responsive design */
@media (max-width: 768px) {
  .translation-pair__container,
  .translation-pair__highlights {
    grid-template-columns: 1fr;
  }
  
  .translation-pair__stats {
    flex-direction: column;
    gap: 4px;
  }
}
</style>