export interface FileObject {
  /** File type identifier */
  type: 'pdf' | 'image' | 'video' | 'office' | 'xmind' | 'bim' | 'cad' | 'text'
  /** File URL or data URI */
  url: string
  /** Optional file metadata */
  meta?: {
    title?: string
    author?: string
    size?: number
    mimeType?: string
    lastModified?: Date
    [key: string]: any
  }
}

export interface FileViewerConfig {
  /** Theme mode */
  theme?: 'light' | 'dark' | 'auto'
  /** Show toolbar controls */
  toolbar?: boolean
  /** Initial zoom level (0.1 - 5.0) */
  zoom?: number
  /** Enable file preloading */
  preload?: boolean
  /** Maximum file size for preview (in bytes) */
  maxFileSize?: number
  /** Enable keep-alive caching */
  cache?: boolean
  /** Custom CSS classes */
  className?: string
  /** Error fallback content */
  fallbackContent?: string
}

export interface PreviewerProps {
  /** File object to preview */
  file: FileObject
  /** Configuration options */
  config?: FileViewerConfig
  /** Loading state */
  loading?: boolean
  /** Error state */
  error?: string | null
}

export interface PreviewerEmits {
  /** File load event */
  load: [file: FileObject]
  /** Error event */
  error: [error: Error]
  /** Progress event for large files */
  progress: [loaded: number, total: number]
  /** Ready event when component is ready */
  ready: []
}

export type SupportedFileTypes = {
  pdf: ['pdf']
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  video: ['mp4', 'webm', 'ogg', 'avi', 'mov', 'm3u8']
  office: ['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt']
  xmind: ['xmind']
  bim: ['ifc', 'gltf', 'glb']
  cad: ['dwg', 'dxf']
  text: ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts']
}

export interface ViewerTheme {
  primary: string
  background: string
  surface: string
  text: string
  border: string
  shadow: string
}

export const themes: Record<'light' | 'dark', ViewerTheme> = {
  light: {
    primary: '#409eff',
    background: '#ffffff',
    surface: '#f5f7fa',
    text: '#303133',
    border: '#dcdfe6',
    shadow: 'rgba(0, 0, 0, 0.1)'
  },
  dark: {
    primary: '#409eff',
    background: '#1a1a1a',
    surface: '#2d2d2d',
    text: '#e4e7ed',
    border: '#4c4d4f',
    shadow: 'rgba(255, 255, 255, 0.1)'
  }
}

// Translation related types
export interface Language {
  code: string
  name: string
  nativeName: string
}

export interface TranslationRecord {
  id: string
  sourceText: string
  translatedText: string
  sourceLang: string
  targetLang: string
  timestamp: Date
  model?: string
  score?: number
}

export interface TranslationSettings {
  model: 'gpt-4' | 'deepl' | 'custom'
  temperature: number
  style: 'formal' | 'casual' | 'technical'
  customApiUrl?: string
  customApiKey?: string
}

export interface TranslationHistoryData {
  records: TranslationRecord[]
  maxRecords: number
}

export interface TerminologyEntry {
  id: string
  source: string
  target: string
  description?: string
  category?: string
}

export interface TranslationHighlight {
  start: number
  end: number
  type: 'word' | 'sentence' | 'paragraph'
  target: 'source' | 'translated'
  matched?: boolean
}

export interface TranslationState {
  sourceText: string
  translatedText: string
  sourceLang: string
  targetLang: string
  isTranslating: boolean
  error: string | null
  highlights: TranslationHighlight[]
  characterCount: {
    source: number
    translated: number
    ratio: number
  }
}