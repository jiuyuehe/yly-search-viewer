<template>
  <div class="terminology-manager">
    <div class="terminology-manager__header">
      <h3 class="terminology-manager__title">术语库管理</h3>
      <el-button
        id="add-term"
        type="primary"
        size="small"
        @click="showAddDialog = true"
      >
        + 添加术语
      </el-button>
    </div>

    <!-- Custom Translation Rules -->
    <div class="terminology-manager__rules">
      <label class="terminology-manager__label">自定义翻译规则</label>
      <el-input
        v-model="customRules"
        type="textarea"
        :rows="3"
        placeholder="输入自定义翻译规则，例如：专有名词保持不变..."
        @input="handleRulesChange"
      />
    </div>

    <!-- Terminology List -->
    <div class="terminology-manager__list">
      <div
        v-for="term in terminology"
        :key="term.id"
        class="terminology-item"
      >
        <div class="terminology-item__content">
          <div class="terminology-item__text">
            <span class="terminology-item__source">{{ term.source }}</span>
            <el-icon class="terminology-item__arrow"><ArrowRight /></el-icon>
            <span class="terminology-item__target">{{ term.target }}</span>
          </div>
          <div v-if="term.description" class="terminology-item__description">
            {{ term.description }}
          </div>
          <div v-if="term.category" class="terminology-item__category">
            <el-tag size="small" type="info">{{ term.category }}</el-tag>
          </div>
        </div>
        <div class="terminology-item__actions">
          <el-button
            type="text"
            size="small"
            @click="editTerm(term)"
          >
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button
            type="text"
            size="small"
            @click="deleteTerm(term.id)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>

      <div v-if="terminology.length === 0" class="terminology-manager__empty">
        <el-empty 
          description="暂无术语"
          :image-size="80"
        />
      </div>
    </div>

    <!-- Add/Edit Term Dialog -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingTerm ? '编辑术语' : '添加术语'"
      width="500px"
    >
      <el-form
        ref="termFormRef"
        :model="termForm"
        :rules="termFormRules"
        label-width="80px"
      >
        <el-form-item label="原文" prop="source">
          <el-input
            v-model="termForm.source"
            placeholder="输入原文词汇"
          />
        </el-form-item>
        <el-form-item label="译文" prop="target">
          <el-input
            v-model="termForm.target"
            placeholder="输入对应译文"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="termForm.description"
            type="textarea"
            :rows="2"
            placeholder="可选：添加术语描述"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="termForm.category"
            placeholder="选择或输入分类"
            filterable
            allow-create
          >
            <el-option
              v-for="category in termCategories"
              :key="category"
              :value="category"
              :label="category"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="cancelEdit">取消</el-button>
        <el-button type="primary" @click="saveTerm">
          {{ editingTerm ? '更新' : '添加' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowRight, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { TerminologyEntry } from '../../types'

interface Props {
  terminology?: TerminologyEntry[]
  customRules?: string
}

interface Emits {
  (e: 'update:terminology', terminology: TerminologyEntry[]): void
  (e: 'update:customRules', rules: string): void
  (e: 'terminology-change'): void
}

const props = withDefaults(defineProps<Props>(), {
  terminology: () => [],
  customRules: ''
})

const emit = defineEmits<Emits>()

const showAddDialog = ref(false)
const editingTerm = ref<TerminologyEntry | null>(null)
const termFormRef = ref<FormInstance>()
const customRules = ref(props.customRules)

const termForm = ref({
  source: '',
  target: '',
  description: '',
  category: ''
})

const termFormRules: FormRules = {
  source: [
    { required: true, message: '请输入原文', trigger: 'blur' }
  ],
  target: [
    { required: true, message: '请输入译文', trigger: 'blur' }
  ]
}

// Extract unique categories from existing terminology
const termCategories = computed(() => {
  const categories = props.terminology
    .map(term => term.category)
    .filter(Boolean) as string[]
  return [...new Set(categories)].sort()
})

const terminology = computed(() => props.terminology)

function handleRulesChange() {
  emit('update:customRules', customRules.value)
  emit('terminology-change')
}

function editTerm(term: TerminologyEntry) {
  editingTerm.value = term
  termForm.value = {
    source: term.source,
    target: term.target,
    description: term.description || '',
    category: term.category || ''
  }
  showAddDialog.value = true
}

function saveTerm() {
  if (!termFormRef.value) return

  termFormRef.value.validate((valid) => {
    if (!valid) return

    const newTerm: TerminologyEntry = {
      id: editingTerm.value?.id || generateId(),
      source: termForm.value.source.trim(),
      target: termForm.value.target.trim(),
      description: termForm.value.description.trim() || undefined,
      category: termForm.value.category.trim() || undefined
    }

    let updatedTerminology: TerminologyEntry[]

    if (editingTerm.value) {
      // Update existing term
      updatedTerminology = terminology.value.map(term =>
        term.id === editingTerm.value!.id ? newTerm : term
      )
      ElMessage.success('术语更新成功')
    } else {
      // Add new term
      updatedTerminology = [...terminology.value, newTerm]
      ElMessage.success('术语添加成功')
    }

    emit('update:terminology', updatedTerminology)
    emit('terminology-change')
    cancelEdit()
  })
}

function deleteTerm(termId: string) {
  ElMessageBox.confirm(
    '确定要删除这个术语吗？',
    '确认删除',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const updatedTerminology = terminology.value.filter(term => term.id !== termId)
    emit('update:terminology', updatedTerminology)
    emit('terminology-change')
    ElMessage.success('术语删除成功')
  }).catch(() => {
    // User cancelled
  })
}

function cancelEdit() {
  showAddDialog.value = false
  editingTerm.value = null
  termForm.value = {
    source: '',
    target: '',
    description: '',
    category: ''
  }
  if (termFormRef.value) {
    termFormRef.value.clearValidate()
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
</script>

<style scoped>
.terminology-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.terminology-manager__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.terminology-manager__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--file-viewer-text);
}

.terminology-manager__label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--file-viewer-text);
}

.terminology-manager__rules {
  display: flex;
  flex-direction: column;
}

.terminology-manager__list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--file-viewer-border);
  border-radius: 8px;
  background: var(--file-viewer-background);
}

.terminology-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid var(--file-viewer-border);
  transition: background-color 0.2s ease;
}

.terminology-item:last-child {
  border-bottom: none;
}

.terminology-item:hover {
  background: var(--file-viewer-surface);
}

.terminology-item__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.terminology-item__text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.terminology-item__source {
  font-weight: 500;
  color: var(--file-viewer-text);
}

.terminology-item__arrow {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.terminology-item__target {
  color: var(--el-color-primary);
  font-weight: 500;
}

.terminology-item__description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.terminology-item__category {
  margin-top: 4px;
}

.terminology-item__actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.terminology-manager__empty {
  padding: 40px 20px;
  text-align: center;
}

/* Custom scrollbar */
.terminology-manager__list::-webkit-scrollbar {
  width: 6px;
}

.terminology-manager__list::-webkit-scrollbar-track {
  background: var(--file-viewer-surface);
}

.terminology-manager__list::-webkit-scrollbar-thumb {
  background: var(--file-viewer-border);
  border-radius: 3px;
}

.terminology-manager__list::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-secondary);
}
</style>