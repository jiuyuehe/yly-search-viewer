import { App } from 'vue'
import FileViewer from './components/core/FileViewer.vue'
import ImagePreview from './components/preview/ImagePreview.vue'
import PdfPreview from './components/preview/PdfPreview.vue'
import VideoPreview from './components/preview/VideoPreview.vue'
import OfficePreview from './components/preview/OfficePreview.vue'
import TextPreview from './components/preview/TextPreview.vue'

// Export types
export type {
  FileObject,
  FileViewerConfig,
  PreviewerProps,
  PreviewerEmits,
  SupportedFileTypes,
  ViewerTheme
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
  TextPreview
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