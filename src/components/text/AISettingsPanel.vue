<template>
  <div class="ai-settings-panel">
    <div class="ai-settings-panel__header">
      <h3 class="ai-settings-panel__title">AI参数设置</h3>
    </div>

    <div class="ai-settings-panel__content">
      <!-- Model Selection -->
      <div class="ai-settings-item">
        <label class="ai-settings-item__label">翻译模型</label>
        <el-select
          v-model="settings.model"
          placeholder="选择翻译模型"
          @change="handleModelChange"
        >
          <el-option
            value="gpt-4"
            label="GPT-4"
          >
            <span>GPT-4</span>
            <span class="ai-settings-option__desc">高质量，较慢</span>
          </el-option>
          <el-option
            value="deepl"
            label="DeepL"
          >
            <span>DeepL</span>
            <span class="ai-settings-option__desc">专业翻译，快速</span>
          </el-option>
          <el-option
            value="custom"
            label="自定义API"
          >
            <span>自定义API</span>
            <span class="ai-settings-option__desc">使用自定义接口</span>
          </el-option>
        </el-select>
      </div>

      <!-- Custom API Settings (shown when custom model is selected) -->
      <template v-if="settings.model === 'custom'">
        <div class="ai-settings-item">
          <label class="ai-settings-item__label">API地址</label>
          <el-input
            v-model="settings.customApiUrl"
            placeholder="输入自定义API地址"
            @input="handleCustomApiChange"
          />
        </div>
        <div class="ai-settings-item">
          <label class="ai-settings-item__label">API密钥</label>
          <el-input
            v-model="settings.customApiKey"
            type="password"
            placeholder="输入API密钥"
            show-password
            @input="handleCustomApiChange"
          />
        </div>
      </template>

      <!-- Temperature Control -->
      <div class="ai-settings-item">
        <label class="ai-settings-item__label">
          温度参数 ({{ settings.temperature }})
        </label>
        <div class="ai-settings-slider">
          <span class="ai-settings-slider__label">保守</span>
          <el-slider
            v-model="settings.temperature"
            :min="0.2"
            :max="1.0"
            :step="0.1"
            :show-tooltip="false"
            @input="handleTemperatureChange"
          />
          <span class="ai-settings-slider__label">创新</span>
        </div>
        <div class="ai-settings-item__desc">
          较低值产生更一致的翻译，较高值产生更多样化的翻译
        </div>
      </div>

      <!-- Output Style -->
      <div class="ai-settings-item">
        <label class="ai-settings-item__label">输出风格</label>
        <el-radio-group
          v-model="settings.style"
          @change="handleStyleChange"
        >
          <el-radio value="formal">正式</el-radio>
          <el-radio value="casual">口语化</el-radio>
          <el-radio value="technical">技术文档</el-radio>
        </el-radio-group>
        <div class="ai-settings-item__desc">
          选择适合的翻译风格以匹配目标用途
        </div>
      </div>

      <!-- Quality Settings -->
      <div class="ai-settings-item">
        <label class="ai-settings-item__label">质量设置</label>
        <div class="ai-settings-checkboxes">
          <el-checkbox
            v-model="qualitySettings.preserveFormatting"
            @change="handleQualityChange"
          >
            保持格式
          </el-checkbox>
          <el-checkbox
            v-model="qualitySettings.preserveTerms"
            @change="handleQualityChange"
          >
            保持术语一致性
          </el-checkbox>
          <el-checkbox
            v-model="qualitySettings.contextAware"
            @change="handleQualityChange"
          >
            上下文感知
          </el-checkbox>
        </div>
      </div>

      <!-- Performance Info -->
      <div class="ai-settings-info">
        <el-alert
          :title="getModelInfo(settings.model).title"
          :description="getModelInfo(settings.model).description"
          :type="getModelInfo(settings.model).type"
          show-icon
          :closable="false"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { TranslationSettings } from '../../types'

interface QualitySettings {
  preserveFormatting: boolean
  preserveTerms: boolean
  contextAware: boolean
}

interface Props {
  settings?: TranslationSettings
}

interface Emits {
  (e: 'update:settings', settings: TranslationSettings): void
  (e: 'settings-change'): void
}

const props = withDefaults(defineProps<Props>(), {
  settings: () => ({
    model: 'gpt-4',
    temperature: 0.7,
    style: 'formal'
  })
})

const emit = defineEmits<Emits>()

const settings = reactive({ ...props.settings })

const qualitySettings = reactive<QualitySettings>({
  preserveFormatting: true,
  preserveTerms: true,
  contextAware: true
})

function handleModelChange() {
  emitChange()
}

function handleCustomApiChange() {
  emitChange()
}

function handleTemperatureChange() {
  emitChange()
}

function handleStyleChange() {
  emitChange()
}

function handleQualityChange() {
  emitChange()
}

function emitChange() {
  emit('update:settings', { ...settings })
  emit('settings-change')
}

function getModelInfo(model: string) {
  switch (model) {
    case 'gpt-4':
      return {
        title: 'GPT-4 模型',
        description: '提供最高质量的翻译，支持复杂语境理解，但速度较慢且成本较高。',
        type: 'success' as const
      }
    case 'deepl':
      return {
        title: 'DeepL 模型',
        description: '专业翻译服务，在欧洲语言间翻译表现优异，速度快且质量高。',
        type: 'info' as const
      }
    case 'custom':
      return {
        title: '自定义API',
        description: '使用您自己的翻译API，请确保API兼容OpenAI格式或提供相应的适配器。',
        type: 'warning' as const
      }
    default:
      return {
        title: '未知模型',
        description: '',
        type: 'info' as const
      }
  }
}

// Watch for prop changes
watch(() => props.settings, (newSettings) => {
  Object.assign(settings, newSettings)
}, { deep: true })
</script>

<style scoped>
.ai-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
  background: var(--file-viewer-surface);
  border-radius: 8px;
  border: 1px solid var(--file-viewer-border);
}

.ai-settings-panel__header {
  border-bottom: 1px solid var(--file-viewer-border);
  padding-bottom: 12px;
}

.ai-settings-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--file-viewer-text);
}

.ai-settings-panel__content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ai-settings-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-settings-item__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--file-viewer-text);
}

.ai-settings-item__desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.ai-settings-option__desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-left: 8px;
}

.ai-settings-slider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-settings-slider__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.ai-settings-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-settings-info {
  margin-top: 8px;
}

/* Element Plus component customizations */
.ai-settings-panel .el-select {
  width: 100%;
}

.ai-settings-panel .el-slider {
  flex: 1;
}

.ai-settings-panel .el-radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-settings-panel .el-radio {
  margin-right: 0;
}

.ai-settings-panel .el-checkbox {
  margin-right: 0;
}
</style>