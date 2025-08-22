<template>
  <div class="language-selector">
    <div class="language-selector__item">
      <label class="language-selector__label">源语言</label>
      <el-select
        id="source-lang"
        v-model="selectedSourceLang"
        placeholder="选择源语言"
        @change="handleSourceLangChange"
      >
        <el-option
          v-for="lang in availableLanguages"
          :key="lang.code"
          :value="lang.code"
          :label="lang.name"
        >
          <span>{{ lang.name }}</span>
          <span style="color: var(--el-text-color-secondary); font-size: 12px">
            {{ lang.code }}
          </span>
        </el-option>
      </el-select>
    </div>

    <div class="language-selector__switch">
      <el-button
        type="primary"
        :icon="Switch"
        circle
        size="small"
        @click="handleLanguageSwitch"
        :disabled="!selectedSourceLang || !selectedTargetLang"
      />
    </div>

    <div class="language-selector__item">
      <label class="language-selector__label">目标语言</label>
      <el-select
        id="target-lang"
        v-model="selectedTargetLang"
        placeholder="选择目标语言"
        @change="handleTargetLangChange"
      >
        <el-option
          v-for="lang in availableTargetLanguages"
          :key="lang.code"
          :value="lang.code"
          :label="lang.name"
        >
          <span>{{ lang.name }}</span>
          <span style="color: var(--el-text-color-secondary); font-size: 12px">
            {{ lang.code }}
          </span>
        </el-option>
      </el-select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Switch } from '@element-plus/icons-vue'
import type { Language } from '../../types'

interface Props {
  sourceLang?: string
  targetLang?: string
}

interface Emits {
  (e: 'update:sourceLang', lang: string): void
  (e: 'update:targetLang', lang: string): void
  (e: 'translate'): void
}

const props = withDefaults(defineProps<Props>(), {
  sourceLang: 'zh',
  targetLang: 'en'
})

const emit = defineEmits<Emits>()

// Available languages with ISO codes
const availableLanguages: Language[] = [
  { code: 'zh', name: '中文', nativeName: '中文' },
  { code: 'en', name: '英语', nativeName: 'English' },
  { code: 'ja', name: '日语', nativeName: '日本語' },
  { code: 'ko', name: '韩语', nativeName: '한국어' },
  { code: 'fr', name: '法语', nativeName: 'Français' },
  { code: 'de', name: '德语', nativeName: 'Deutsch' },
  { code: 'es', name: '西班牙语', nativeName: 'Español' },
  { code: 'it', name: '意大利语', nativeName: 'Italiano' },
  { code: 'pt', name: '葡萄牙语', nativeName: 'Português' },
  { code: 'ru', name: '俄语', nativeName: 'Русский' },
  { code: 'ar', name: '阿拉伯语', nativeName: 'العربية' },
  { code: 'hi', name: '印地语', nativeName: 'हिन्दी' }
]

const selectedSourceLang = ref(props.sourceLang)
const selectedTargetLang = ref(props.targetLang)

// Available target languages (exclude the selected source language)
const availableTargetLanguages = computed(() => {
  return availableLanguages.filter(lang => lang.code !== selectedSourceLang.value)
})

function handleSourceLangChange(lang: string) {
  emit('update:sourceLang', lang)
  
  // If target language is same as source, switch to a different one
  if (selectedTargetLang.value === lang) {
    const defaultTarget = availableTargetLanguages.value[0]
    if (defaultTarget) {
      selectedTargetLang.value = defaultTarget.code
      emit('update:targetLang', defaultTarget.code)
    }
  }
  
  emit('translate')
}

function handleTargetLangChange(lang: string) {
  emit('update:targetLang', lang)
  emit('translate')
}

function handleLanguageSwitch() {
  const tempSource = selectedSourceLang.value
  selectedSourceLang.value = selectedTargetLang.value
  selectedTargetLang.value = tempSource
  
  emit('update:sourceLang', selectedSourceLang.value)
  emit('update:targetLang', selectedTargetLang.value)
  emit('translate')
}

// Watch for prop changes
watch(() => props.sourceLang, (newVal) => {
  selectedSourceLang.value = newVal
})

watch(() => props.targetLang, (newVal) => {
  selectedTargetLang.value = newVal
})
</script>

<style scoped>
.language-selector {
  display: flex;
  align-items: end;
  gap: 12px;
  padding: 16px;
  background: var(--file-viewer-surface);
  border-radius: 8px;
  border: 1px solid var(--file-viewer-border);
}

.language-selector__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.language-selector__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--file-viewer-text);
}

.language-selector__switch {
  display: flex;
  align-items: center;
  margin-top: 24px;
}

.language-selector .el-select {
  width: 100%;
}

.language-selector .el-button.is-circle {
  width: 32px;
  height: 32px;
}
</style>