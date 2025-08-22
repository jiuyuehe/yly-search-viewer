import type { FileObject, SupportedFileTypes } from '../types'

/**
 * Supported file extensions mapping
 */
export const SUPPORTED_EXTENSIONS: SupportedFileTypes = {
  pdf: ['pdf'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
  video: ['mp4', 'webm', 'ogg', 'avi', 'mov', 'm3u8'],
  office: ['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt'],
  xmind: ['xmind'],
  bim: ['ifc', 'gltf', 'glb'],
  cad: ['dwg', 'dxf'],
  text: ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts']
}

/**
 * Get file extension from URL or filename
 */
export function getFileExtension(url: string): string {
  const filename = url.split('/').pop() || ''
  const extension = filename.split('.').pop()
  return extension?.toLowerCase() || ''
}

/**
 * Detect file type based on URL or MIME type
 */
export function detectFileType(url: string, mimeType?: string): FileObject['type'] {
  const extension = getFileExtension(url)
  
  // Check by MIME type first
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType === 'application/pdf') return 'pdf'
    if (mimeType.includes('officedocument') || mimeType.includes('msword') || mimeType.includes('excel')) {
      return 'office'
    }
  }
  
  // Fallback to extension detection
  for (const [type, extensions] of Object.entries(SUPPORTED_EXTENSIONS)) {
    if (extensions.includes(extension)) {
      return type as FileObject['type']
    }
  }
  
  return 'text' // Default fallback
}

/**
 * Check if file type is supported
 */
export function isFileTypeSupported(type: string): boolean {
  return Object.keys(SUPPORTED_EXTENSIONS).includes(type)
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Check if URL is a data URI
 */
export function isDataUri(url: string): boolean {
  return url.startsWith('data:')
}

/**
 * Extract MIME type from data URI
 */
export function getMimeTypeFromDataUri(dataUri: string): string | null {
  const match = dataUri.match(/^data:([^;]+)/)
  return match ? match[1] : null
}

/**
 * Validate file object
 */
export function validateFileObject(file: FileObject): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'File object is required' }
  }
  
  if (!file.url) {
    return { valid: false, error: 'File URL is required' }
  }
  
  if (!file.type) {
    return { valid: false, error: 'File type is required' }
  }
  
  if (!isFileTypeSupported(file.type)) {
    return { valid: false, error: `File type '${file.type}' is not supported` }
  }
  
  return { valid: true }
}

/**
 * Create file object from URL
 */
export function createFileObject(url: string, options?: Partial<FileObject>): FileObject {
  const mimeType = options?.meta?.mimeType || (isDataUri(url) ? getMimeTypeFromDataUri(url) : undefined)
  const type = options?.type || detectFileType(url, mimeType || undefined)
  
  return {
    type,
    url,
    meta: {
      mimeType,
      ...options?.meta
    },
    ...options
  }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Check if file size exceeds limit
 */
export function isFileSizeExceeded(fileSize: number, maxSize: number): boolean {
  return fileSize > maxSize
}