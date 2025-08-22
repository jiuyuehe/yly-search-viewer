<template>
  <div class="video-preview">
    <!-- Loading State -->
    <div v-if="loading" class="video-preview__loading" v-loading="loading" element-loading-text="加载视频中...">
      <div style="height: 400px;"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="video-preview__error">
      <el-result icon="error" title="视频加载失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="retry">重试</el-button>
        </template>
      </el-result>
    </div>

    <!-- Video Content -->
    <div v-else class="video-preview__content">
      <!-- Video Player -->
      <div class="video-preview__player" ref="playerContainer">
        <video
          ref="videoRef"
          :src="file.url"
          class="video-preview__video"
          controls
          preload="metadata"
          @loadstart="handleLoadStart"
          @loadedmetadata="handleMetadataLoaded"
          @loadeddata="handleDataLoaded"
          @error="handleVideoError"
          @progress="handleProgress"
          @timeupdate="handleTimeUpdate"
          @ended="handleEnded"
        >
          <source :src="file.url" :type="file.meta?.mimeType || 'video/mp4'">
          <!-- Subtitle tracks -->
          <track
            v-for="subtitle in subtitles"
            :key="subtitle.lang"
            :kind="subtitle.kind"
            :src="subtitle.src"
            :srclang="subtitle.lang"
            :label="subtitle.label"
            :default="subtitle.default"
          >
          您的浏览器不支持视频播放。
        </video>

        <!-- Custom Controls Overlay -->
        <div v-if="showCustomControls" class="video-preview__controls-overlay">
          <div class="video-preview__controls">
            <!-- Play/Pause Button -->
            <el-button
              type="primary"
              :icon="isPlaying ? VideoPause : VideoPlay"
              circle
              size="large"
              @click="togglePlay"
            />

            <!-- Time Display -->
            <div class="video-preview__time">
              <span>{{ formatTime(currentTime) }}</span>
              <span>/</span>
              <span>{{ formatTime(duration) }}</span>
            </div>

            <!-- Progress Bar -->
            <div class="video-preview__progress-container">
              <el-slider
                v-model="progress"
                :show-tooltip="false"
                @change="seekTo"
                @input="handleSeek"
              />
            </div>

            <!-- Volume Control -->
            <div class="video-preview__volume">
              <el-button
                :icon="isMuted ? Mute : Microphone"
                text
                @click="toggleMute"
              />
              <el-slider
                v-model="volume"
                :show-tooltip="false"
                :min="0"
                :max="100"
                style="width: 80px"
                @change="setVolume"
              />
            </div>

            <!-- Playback Speed -->
            <el-dropdown @command="setPlaybackRate">
              <el-button text>
                {{ playbackRate }}x
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="rate in playbackRates"
                    :key="rate"
                    :command="rate"
                    :class="{ 'is-active': rate === playbackRate }"
                  >
                    {{ rate }}x
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <!-- Subtitle Toggle -->
            <el-dropdown v-if="subtitles.length > 0" @command="setSubtitle">
              <el-button text>
                <el-icon><ChatLineSquare /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="off">关闭字幕</el-dropdown-item>
                  <el-dropdown-item
                    v-for="subtitle in subtitles"
                    :key="subtitle.lang"
                    :command="subtitle.lang"
                  >
                    {{ subtitle.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <!-- Fullscreen Button -->
            <el-button
              :icon="FullScreen"
              text
              @click="toggleFullscreen"
            />
          </div>
        </div>
      </div>

      <!-- Video Information -->
      <div class="video-preview__info">
        <div class="video-preview__info-item">
          <span class="label">时长:</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
        <div v-if="videoInfo.resolution" class="video-preview__info-item">
          <span class="label">分辨率:</span>
          <span>{{ videoInfo.resolution }}</span>
        </div>
        <div v-if="file.meta?.size" class="video-preview__info-item">
          <span class="label">文件大小:</span>
          <span>{{ formatFileSize(file.meta.size) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import {
  ElButton,
  ElIcon,
  ElResult,
  ElSlider,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem
} from 'element-plus'
import {
  VideoPlay,
  VideoPause,
  Microphone,
  Mute,
  ArrowDown,
  ChatLineSquare,
  FullScreen
} from '@element-plus/icons-vue'
import type { FileObject, FileViewerConfig } from '../../types'
import { formatFileSize } from '../../utils/file'

// HLS.js integration for streaming video
import Hls from 'hls.js'

interface SubtitleTrack {
  lang: string
  label: string
  src: string
  kind: 'subtitles' | 'captions'
  default?: boolean
}

interface Props {
  file: FileObject
  config?: FileViewerConfig
  zoom?: number
}

interface Emits {
  (e: 'load', file: FileObject): void
  (e: 'error', error: Error): void
  (e: 'progress', loaded: number, total: number): void
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({}),
  zoom: 1
})

const emit = defineEmits<Emits>()

// Reactive state
const loading = ref(true)
const error = ref<string | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progress = ref(0)
const volume = ref(100)
const isMuted = ref(false)
const playbackRate = ref(1)
const showCustomControls = ref(false)
const hls = ref<Hls | null>(null)

// Refs
const videoRef = ref<HTMLVideoElement>()
const playerContainer = ref<HTMLElement>()

// Video info
const videoInfo = ref({
  resolution: '',
  bitrate: 0,
  framerate: 0
})

// Configuration
const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2]
const subtitles = ref<SubtitleTrack[]>([])

// Computed
const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '00:00'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Methods
function handleLoadStart() {
  loading.value = true
  error.value = null
}

function handleMetadataLoaded() {
  if (!videoRef.value) return
  
  duration.value = videoRef.value.duration
  
  // Get video resolution
  videoInfo.value.resolution = `${videoRef.value.videoWidth}x${videoRef.value.videoHeight}`
  
  loading.value = false
  emit('load', props.file)
}

function handleDataLoaded() {
  loading.value = false
}

function handleVideoError() {
  loading.value = false
  error.value = '视频加载失败'
  emit('error', new Error('Failed to load video'))
}

function handleProgress() {
  if (!videoRef.value) return
  
  const buffered = videoRef.value.buffered
  if (buffered.length > 0) {
    const loaded = buffered.end(buffered.length - 1)
    const total = duration.value
    if (total > 0) {
      emit('progress', loaded, total)
    }
  }
}

function handleTimeUpdate() {
  if (!videoRef.value) return
  
  currentTime.value = videoRef.value.currentTime
  if (duration.value > 0) {
    progress.value = (currentTime.value / duration.value) * 100
  }
}

function handleEnded() {
  isPlaying.value = false
}

function togglePlay() {
  if (!videoRef.value) return
  
  if (isPlaying.value) {
    videoRef.value.pause()
    isPlaying.value = false
  } else {
    videoRef.value.play()
    isPlaying.value = true
  }
}

function seekTo(value: number) {
  if (!videoRef.value) return
  
  const time = (value / 100) * duration.value
  videoRef.value.currentTime = time
}

function handleSeek(value: number) {
  // Real-time seeking preview (optional)
  progress.value = value
}

function toggleMute() {
  if (!videoRef.value) return
  
  isMuted.value = !isMuted.value
  videoRef.value.muted = isMuted.value
}

function setVolume(value: number) {
  if (!videoRef.value) return
  
  volume.value = value
  videoRef.value.volume = value / 100
  isMuted.value = value === 0
}

function setPlaybackRate(rate: number) {
  if (!videoRef.value) return
  
  playbackRate.value = rate
  videoRef.value.playbackRate = rate
}

function setSubtitle(lang: string) {
  if (!videoRef.value) return
  
  const textTracks = videoRef.value.textTracks
  for (let i = 0; i < textTracks.length; i++) {
    const track = textTracks[i]
    if (lang === 'off') {
      track.mode = 'disabled'
    } else {
      track.mode = track.language === lang ? 'showing' : 'disabled'
    }
  }
}

function toggleFullscreen() {
  if (!playerContainer.value) return
  
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    playerContainer.value.requestFullscreen()
  }
}

function setupHLS() {
  if (!videoRef.value) return
  
  const videoUrl = props.file.url
  
  // Check if it's an HLS stream
  if (videoUrl.includes('.m3u8')) {
    if (Hls.isSupported()) {
      hls.value = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      })
      
      hls.value.loadSource(videoUrl)
      hls.value.attachMedia(videoRef.value)
      
      hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed')
      })
      
      hls.value.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data)
        if (data.fatal) {
          handleVideoError()
        }
      })
    } else if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoRef.value.src = videoUrl
    } else {
      error.value = '浏览器不支持HLS视频流'
    }
  }
}

function retry() {
  error.value = null
  loading.value = true
  
  if (hls.value) {
    hls.value.destroy()
    hls.value = null
  }
  
  nextTick(() => {
    setupHLS()
  })
}

// Event listeners
function handleKeydown(event: KeyboardEvent) {
  if (!videoRef.value) return
  
  switch (event.code) {
    case 'Space':
      event.preventDefault()
      togglePlay()
      break
    case 'ArrowLeft':
      event.preventDefault()
      videoRef.value.currentTime = Math.max(0, currentTime.value - 10)
      break
    case 'ArrowRight':
      event.preventDefault()
      videoRef.value.currentTime = Math.min(duration.value, currentTime.value + 10)
      break
    case 'ArrowUp':
      event.preventDefault()
      setVolume(Math.min(100, volume.value + 10))
      break
    case 'ArrowDown':
      event.preventDefault()
      setVolume(Math.max(0, volume.value - 10))
      break
    case 'KeyF':
      event.preventDefault()
      toggleFullscreen()
      break
    case 'KeyM':
      event.preventDefault()
      toggleMute()
      break
  }
}

// Lifecycle
onMounted(() => {
  setupHLS()
  
  // Add keyboard listeners
  document.addEventListener('keydown', handleKeydown)
  
  // Add play/pause listeners
  if (videoRef.value) {
    videoRef.value.addEventListener('play', () => {
      isPlaying.value = true
    })
    
    videoRef.value.addEventListener('pause', () => {
      isPlaying.value = false
    })
  }
})

onUnmounted(() => {
  if (hls.value) {
    hls.value.destroy()
  }
  
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.video-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--file-viewer-background);
}

.video-preview__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.video-preview__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.video-preview__content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.video-preview__player {
  flex: 1;
  position: relative;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-preview__video {
  width: 100%;
  height: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.video-preview__controls-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  opacity: 0;
  transition: opacity 0.3s ease;
  padding: 20px 16px 16px;
}

.video-preview__player:hover .video-preview__controls-overlay {
  opacity: 1;
}

.video-preview__controls {
  display: flex;
  align-items: center;
  gap: 16px;
  color: white;
}

.video-preview__time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-family: monospace;
  min-width: 120px;
}

.video-preview__progress-container {
  flex: 1;
}

.video-preview__volume {
  display: flex;
  align-items: center;
  gap: 8px;
}

.video-preview__info {
  display: flex;
  gap: 24px;
  padding: 16px;
  background-color: var(--file-viewer-surface);
  border-top: 1px solid var(--file-viewer-border);
  flex-shrink: 0;
}

.video-preview__info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.video-preview__info-item .label {
  font-weight: 500;
  color: var(--file-viewer-text);
}

/* Custom slider styles for video controls */
:deep(.el-slider__runway) {
  background-color: rgba(255, 255, 255, 0.3);
}

:deep(.el-slider__bar) {
  background-color: var(--file-viewer-primary);
}

:deep(.el-slider__button) {
  border-color: var(--file-viewer-primary);
  background-color: var(--file-viewer-primary);
}

/* Dropdown styles */
:deep(.el-dropdown-menu__item.is-active) {
  color: var(--file-viewer-primary);
  background-color: var(--file-viewer-surface);
}
</style>