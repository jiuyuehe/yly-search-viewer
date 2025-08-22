<template>
  <div class="extract-template-manager">
    <el-card>
      <template #header>
        <div class="header-actions">
          <span>自定义抽取模板管理</span>
          <el-button type="primary" @click="showCreateDialog = true">
            <el-icon><Plus /></el-icon>
            创建模板
          </el-button>
        </div>
      </template>

      <!-- Template List -->
      <el-table 
        :data="templates" 
        v-loading="loading"
        @row-click="handleRowClick"
        style="width: 100%"
      >
        <el-table-column prop="name" label="模板名称" min-width="150">
          <template #default="{ row }">
            <div class="template-name">
              <el-tag 
                :type="row.isActive ? 'success' : 'info'" 
                size="small"
                style="margin-right: 8px"
              >
                {{ row.isActive ? '启用' : '禁用' }}
              </el-tag>
              {{ row.name }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.category || '默认' }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="字段数量" width="100">
          <template #default="{ row }">
            <el-text>{{ row.fields.length }} 个</el-text>
          </template>
        </el-table-column>
        
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group size="small">
              <el-button @click.stop="editTemplate(row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button @click.stop="duplicateTemplate(row)">
                <el-icon><CopyDocument /></el-icon>
                复制
              </el-button>
              <el-button 
                type="danger" 
                @click.stop="deleteTemplate(row)"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Create/Edit Template Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingTemplate ? '编辑模板' : '创建模板'"
      width="60%"
      :close-on-click-modal="false"
    >
      <el-form
        ref="templateFormRef"
        :model="templateForm"
        :rules="templateRules"
        label-width="100px"
      >
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="templateForm.name" placeholder="请输入模板名称" />
        </el-form-item>
        
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="templateForm.description" 
            type="textarea" 
            placeholder="请输入模板描述"
            :rows="2"
          />
        </el-form-item>
        
        <el-form-item label="分类" prop="category">
          <el-input v-model="templateForm.category" placeholder="如：合同、发票、报告等" />
        </el-form-item>
        
        <el-form-item label="状态" prop="isActive">
          <el-switch 
            v-model="templateForm.isActive" 
            active-text="启用" 
            inactive-text="禁用"
          />
        </el-form-item>

        <!-- Fields Configuration -->
        <el-form-item label="字段配置">
          <div class="fields-container">
            <div 
              v-for="(field, index) in templateForm.fields" 
              :key="field.id"
              class="field-item"
            >
              <el-card :body-style="{ padding: '15px' }">
                <template #header>
                  <div class="field-header">
                    <span>字段 {{ index + 1 }}</span>
                    <el-button 
                      type="danger" 
                      size="small" 
                      text 
                      @click="removeField(index)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </template>
                
                <el-row :gutter="20">
                  <el-col :span="8">
                    <el-form-item label="字段名称">
                      <el-input v-model="field.name" placeholder="字段名称" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="显示标签">
                      <el-input v-model="field.label" placeholder="显示标签" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="字段类型">
                      <el-select v-model="field.type" @change="onFieldTypeChange(field)">
                        <el-option label="文本" value="text" />
                        <el-option label="数字" value="number" />
                        <el-option label="日期" value="date" />
                        <el-option label="选择" value="select" />
                        <el-option label="多行文本" value="textarea" />
                        <el-option label="是/否" value="boolean" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="描述">
                      <el-input v-model="field.description" placeholder="字段描述（可选）" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="必填">
                      <el-switch v-model="field.required" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="默认值">
                      <el-input v-model="field.defaultValue" placeholder="默认值" />
                    </el-form-item>
                  </el-col>
                </el-row>
                
                <!-- Options for select type -->
                <div v-if="field.type === 'select'" class="select-options">
                  <el-form-item label="选项配置">
                    <div class="options-container">
                      <div 
                        v-for="(option, optIndex) in field.options" 
                        :key="optIndex"
                        class="option-item"
                      >
                        <el-input 
                          v-model="field.options![optIndex]" 
                          placeholder="选项值"
                          style="margin-right: 10px;"
                        />
                        <el-button 
                          type="danger" 
                          size="small" 
                          text 
                          @click="removeOption(field, optIndex)"
                        >
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                      <el-button 
                        type="primary" 
                        size="small" 
                        text 
                        @click="addOption(field)"
                      >
                        <el-icon><Plus /></el-icon>
                        添加选项
                      </el-button>
                    </div>
                  </el-form-item>
                </div>
              </el-card>
            </div>
            
            <el-button 
              type="primary" 
              @click="addField"
              style="width: 100%; margin-top: 10px;"
            >
              <el-icon><Plus /></el-icon>
              添加字段
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate" :loading="saving">
          {{ editingTemplate ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  ElCard, ElButton, ElTable, ElTableColumn, ElTag, ElText, ElDialog, 
  ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElSwitch, ElRow, 
  ElCol, ElIcon, ElButtonGroup, ElMessage, ElMessageBox
} from 'element-plus'
import { 
  Plus, Edit, Delete, CopyDocument 
} from '@element-plus/icons-vue'
import { useExtractStore } from '../../stores/extract'
import type { ExtractTemplate, ExtractFieldSchema } from '../../types'

const extractStore = useExtractStore()

// Reactive state
const showCreateDialog = ref(false)
const editingTemplate = ref<ExtractTemplate | null>(null)
const templateFormRef = ref()
const saving = ref(false)

// Computed
const templates = computed(() => extractStore.templates)
const loading = computed(() => extractStore.loading)

// Form data
const templateForm = ref({
  name: '',
  description: '',
  category: '',
  isActive: true,
  fields: [] as ExtractFieldSchema[]
})

// Form validation rules
const templateRules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ]
}

// Methods
const resetForm = () => {
  templateForm.value = {
    name: '',
    description: '',
    category: '',
    isActive: true,
    fields: []
  }
  editingTemplate.value = null
}

const handleRowClick = (row: ExtractTemplate) => {
  // Could navigate to template details or history
  console.log('Template clicked:', row)
}

const editTemplate = (template: ExtractTemplate) => {
  editingTemplate.value = template
  templateForm.value = {
    name: template.name,
    description: template.description || '',
    category: template.category || '',
    isActive: template.isActive,
    fields: JSON.parse(JSON.stringify(template.fields)) // Deep copy
  }
  showCreateDialog.value = true
}

const duplicateTemplate = async (template: ExtractTemplate) => {
  try {
    await extractStore.createTemplate({
      name: `${template.name} (副本)`,
      description: template.description,
      category: template.category,
      fields: JSON.parse(JSON.stringify(template.fields)), // Deep copy
      isActive: true,
      createdBy: template.createdBy
    })
    
    ElMessage.success('模板复制成功')
  } catch (error) {
    ElMessage.error('模板复制失败')
    console.error(error)
  }
}

const deleteTemplate = async (template: ExtractTemplate) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板"${template.name}"吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await extractStore.deleteTemplate(template.id)
    ElMessage.success('模板删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('模板删除失败')
      console.error(error)
    }
  }
}

const addField = () => {
  const newField: ExtractFieldSchema = {
    id: generateFieldId(),
    name: '',
    label: '',
    type: 'text',
    required: false,
    description: '',
    defaultValue: ''
  }
  templateForm.value.fields.push(newField)
}

const removeField = (index: number) => {
  templateForm.value.fields.splice(index, 1)
}

const onFieldTypeChange = (field: ExtractFieldSchema) => {
  if (field.type === 'select' && !field.options) {
    field.options = ['选项1']
  } else if (field.type !== 'select') {
    delete field.options
  }
}

const addOption = (field: ExtractFieldSchema) => {
  if (!field.options) {
    field.options = []
  }
  field.options.push('')
}

const removeOption = (field: ExtractFieldSchema, index: number) => {
  if (field.options) {
    field.options.splice(index, 1)
  }
}

const saveTemplate = async () => {
  try {
    await templateFormRef.value?.validate()
    
    if (templateForm.value.fields.length === 0) {
      ElMessage.warning('请至少添加一个字段')
      return
    }
    
    // Validate fields
    for (const field of templateForm.value.fields) {
      if (!field.name || !field.label) {
        ElMessage.warning('请完整填写所有字段的名称和标签')
        return
      }
    }
    
    saving.value = true
    
    if (editingTemplate.value) {
      await extractStore.updateTemplate(editingTemplate.value.id, templateForm.value)
      ElMessage.success('模板更新成功')
    } else {
      await extractStore.createTemplate(templateForm.value)
      ElMessage.success('模板创建成功')
    }
    
    showCreateDialog.value = false
    resetForm()
  } catch (error) {
    ElMessage.error('保存失败')
    console.error(error)
  } finally {
    saving.value = false
  }
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

const generateFieldId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Lifecycle
onMounted(async () => {
  await extractStore.loadFromStorage()
})
</script>

<style scoped>
.extract-template-manager {
  padding: 20px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-name {
  display: flex;
  align-items: center;
}

.fields-container {
  width: 100%;
}

.field-item {
  margin-bottom: 15px;
}

.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.select-options {
  margin-top: 10px;
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-item {
  display: flex;
  align-items: center;
}
</style>