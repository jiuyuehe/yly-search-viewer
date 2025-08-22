<template>
  <div class="ai-sidebar">
    <el-aside width="300px" class="ai-sidebar-container">
      <div class="ai-sidebar-header">
        <el-icon><Cpu /></el-icon>
        <span>AI 工具</span>
      </div>
      
      <el-collapse v-model="activeTools" class="ai-tools-collapse">
        <!-- Custom Extract Tool -->
        <el-collapse-item name="custom-extract">
          <template #title>
            <div class="tool-title">
              <el-icon><MagicStick /></el-icon>
              <span>自定义抽取</span>
            </div>
          </template>
          <div class="tool-content">
            <CustomExtract :file="file" />
          </div>
        </el-collapse-item>
        
        <!-- Summary Tool (Placeholder) -->
        <el-collapse-item name="summary">
          <template #title>
            <div class="tool-title">
              <el-icon><Document /></el-icon>
              <span>文档摘要</span>
            </div>
          </template>
          <div class="tool-content">
            <el-text type="info">摘要功能开发中...</el-text>
          </div>
        </el-collapse-item>
        
        <!-- Tags Tool (Placeholder) -->
        <el-collapse-item name="tags">
          <template #title>
            <div class="tool-title">
              <el-icon><PriceTag /></el-icon>
              <span>标签提取</span>
            </div>
          </template>
          <div class="tool-content">
            <el-text type="info">标签提取功能开发中...</el-text>
          </div>
        </el-collapse-item>
        
        <!-- Q&A Tool (Placeholder) -->
        <el-collapse-item name="qa">
          <template #title>
            <div class="tool-title">
              <el-icon><ChatDotRound /></el-icon>
              <span>文档问答</span>
            </div>
          </template>
          <div class="tool-content">
            <el-text type="info">问答功能开发中...</el-text>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-aside>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  ElAside, ElIcon, ElCollapse, ElCollapseItem, ElText
} from 'element-plus'
import { 
  Cpu, MagicStick, Document, PriceTag, ChatDotRound
} from '@element-plus/icons-vue'
import CustomExtract from './CustomExtract.vue'
import type { FileObject } from '../../types'

interface Props {
  file: FileObject
}

defineProps<Props>()

// Reactive state
const activeTools = ref(['custom-extract'])
</script>

<style scoped>
.ai-sidebar {
  height: 100%;
  border-left: 1px solid var(--el-border-color-lighter);
}

.ai-sidebar-container {
  height: 100%;
  background-color: var(--el-bg-color-page);
}

.ai-sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  font-weight: 600;
  font-size: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-bg-color);
}

.ai-tools-collapse {
  border: none;
}

.ai-tools-collapse :deep(.el-collapse-item__header) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-bg-color);
}

.ai-tools-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.ai-tools-collapse :deep(.el-collapse-item__content) {
  padding: 16px;
  background-color: var(--el-bg-color-page);
}

.tool-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.tool-content {
  width: 100%;
}
</style>