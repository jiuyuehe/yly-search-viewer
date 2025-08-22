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

// Translation components
import TranslationEditor from './components/text/TranslationEditor.vue'
import TranslationPair from './components/text/TranslationPair.vue'
import LanguageSelector from './components/text/LanguageSelector.vue'
import TerminologyManager from './components/text/TerminologyManager.vue'
import AISettingsPanel from './components/text/AISettingsPanel.vue'
import TranslationHistory from './components/text/TranslationHistory.vue'
import TranslationPanel from './components/ai/TranslationPanel.vue'

// Export types
export type {
  FileObject,
  FileViewerConfig,
  PreviewerProps,
  PreviewerEmits,
  SupportedFileTypes,
  ViewerTheme,
  Language,
  TranslationRecord,
  TranslationSettings,
  TranslationHistoryData,
  TerminologyEntry,
  TranslationHighlight,
  TranslationState
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
  TranslationEditor,
  TranslationPair,
  LanguageSelector,
  TerminologyManager,
  AISettingsPanel,
  TranslationHistory,
  TranslationPanel
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
    app.component('TranslationEditor', TranslationEditor)
    app.component('TranslationPair', TranslationPair)
    app.component('LanguageSelector', LanguageSelector)
    app.component('TerminologyManager', TerminologyManager)
    app.component('AISettingsPanel', AISettingsPanel)
    app.component('TranslationHistory', TranslationHistory)
    app.component('TranslationPanel', TranslationPanel)
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

// Translation component installs
TranslationEditor.install = (app: App) => {
  app.component('TranslationEditor', TranslationEditor)
}

TranslationPair.install = (app: App) => {
  app.component('TranslationPair', TranslationPair)
}

LanguageSelector.install = (app: App) => {
  app.component('LanguageSelector', LanguageSelector)
}

TerminologyManager.install = (app: App) => {
  app.component('TerminologyManager', TerminologyManager)
}

AISettingsPanel.install = (app: App) => {
  app.component('AISettingsPanel', AISettingsPanel)
}

TranslationHistory.install = (app: App) => {
  app.component('TranslationHistory', TranslationHistory)
}

TranslationPanel.install = (app: App) => {
  app.component('TranslationPanel', TranslationPanel)
}