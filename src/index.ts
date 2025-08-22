import type { App } from 'vue'
import FileViewer from './components/core/FileViewer.vue'
import ImagePreview from './components/preview/ImagePreview.vue'
import PdfPreview from './components/preview/PdfPreview.vue'
import VideoPreview from './components/preview/VideoPreview.vue'
import OfficePreview from './components/preview/OfficePreview.vue'
import TextPreview from './components/preview/TextPreview.vue'
import XmindPreview from './components/preview/XmindPreview.vue'
import BimPreview from './components/preview/BimPreview.vue'
import CadPreview from './components/preview/CadPreview.vue'

// AI Components
import AISidebar from './components/ai/AISidebar.vue'
import CustomExtract from './components/ai/CustomExtract.vue'
import ExtractTemplateManager from './components/ai/ExtractTemplateManager.vue'
import ExtractHistory from './components/ai/ExtractHistory.vue'

// Export types
export type {
  FileObject,
  FileViewerConfig,
  PreviewerProps,
  PreviewerEmits,
  SupportedFileTypes,
  ViewerTheme,
  ExtractTemplate,
  ExtractResult,
  ExtractFieldSchema,
  ExtractHistory as ExtractHistoryData,
  AIService,
  Entity
} from './types'

// Export utilities
export {
  detectFileType,
  validateFileObject,
  createFileObject,
  formatFileSize,
  getFileExtension,
  isFileTypeSupported
} from './utils/file'

// Export AI services
export { aiService } from './services/ai'

// Export stores
export { useExtractStore } from './stores/extract'

// Export components
export {
  FileViewer,
  ImagePreview,
  PdfPreview,
  VideoPreview,
  OfficePreview,
  TextPreview,
  XmindPreview,
  BimPreview,
  CadPreview,
  AISidebar,
  CustomExtract,
  ExtractTemplateManager,
  ExtractHistory
}

// Vue plugin
export default {
  install(app: App) {
    app.component('FileViewer', FileViewer)
    app.component('ImagePreview', ImagePreview)
    app.component('PdfPreview', PdfPreview)
    app.component('VideoPreview', VideoPreview)
    app.component('OfficePreview', OfficePreview)
    app.component('TextPreview', TextPreview)
    app.component('XmindPreview', XmindPreview)
    app.component('BimPreview', BimPreview)
    app.component('CadPreview', CadPreview)
    app.component('AISidebar', AISidebar)
    app.component('CustomExtract', CustomExtract)
    app.component('ExtractTemplateManager', ExtractTemplateManager)
    app.component('ExtractHistory', ExtractHistory)
  }
}

// Individual component installs
FileViewer.install = (app: App) => {
  app.component('FileViewer', FileViewer)
}

ImagePreview.install = (app: App) => {
  app.component('ImagePreview', ImagePreview)
}

PdfPreview.install = (app: App) => {
  app.component('PdfPreview', PdfPreview)
}

VideoPreview.install = (app: App) => {
  app.component('VideoPreview', VideoPreview)
}

OfficePreview.install = (app: App) => {
  app.component('OfficePreview', OfficePreview)
}

TextPreview.install = (app: App) => {
  app.component('TextPreview', TextPreview)
}

XmindPreview.install = (app: App) => {
  app.component('XmindPreview', XmindPreview)
}

BimPreview.install = (app: App) => {
  app.component('BimPreview', BimPreview)
}

CadPreview.install = (app: App) => {
  app.component('CadPreview', CadPreview)
}