<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMedia, useMediaCanvasWebGL, useMediaAnalysis, useMediaPalette } from '../composables/Media'
import { loadUnsplashPhoto } from '../modules/PhotoUnsplash/Application/loadUnsplashPhoto'
import { loadScreenshot } from '../modules/PhotoScreenshot/Application/loadScreenshot'
import { photoRepository } from '../modules/Photo/Infra/photoRepository'
import { createDefaultPhotoUseCase } from '../modules/Photo/Application/createDefaultPhotoUseCase'
import { useFilter } from '../composables/Filter/useFilter'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'
import { $Media } from '../modules/Media'
import { useSegmentation } from '../composables/Segmentation/useSegmentation'
import { useColorLayers } from '../composables/Segmentation/useColorLayers'
import HistogramCanvas from '../components/HistogramCanvas.vue'
import PhotoStats from '../components/PhotoStats.vue'
import ProfiledPaletteDisplay from '../components/ProfiledPaletteDisplay.vue'
import SegmentationDisplay from '../components/SegmentationDisplay.vue'
import LayerStackPreview from '../components/LayerStackPreview.vue'
import FilterPanel from '../components/Filter/FilterPanel.vue'

// Media (Photo + Camera + ScreenCapture 統一)
const {
  media,
  loadPhoto,
  setPhoto,
  startCamera,
  stopCamera,
  startScreenCapture,
  stopScreenCapture,
  isCameraActive,
  isScreenCaptureActive,
  isStreaming,
  error: mediaError,
} = useMedia()

// Presets
const PRESETS = getPresets()

// Filter
const { filter, lut, pixelEffects, currentPresetId, applyPreset, setters, setMasterPoint, reset } = useFilter(7)

// Canvas描画 - Before (オリジナル) と After (フィルター適用) - WebGL 使用
const { canvasRef: beforeCanvasRef, stats: renderStats, isProcessing } = useMediaCanvasWebGL(media)
const { canvasRef: afterCanvasRef } = useMediaCanvasWebGL(media, { lut, pixelEffects })

// サンプリングレート (動的に変更可能) - 0 で無効
type FpsOption = 60 | 30 | 15 | 5 | 0
const paletteSampleRate = ref<FpsOption>(5)

// Analysis (リアルタイム対応、5 FPS固定)
const { analysis: originalAnalysis } = useMediaAnalysis(media, { sampleRate: 5 })
const { analysis: filteredAnalysis } = useMediaAnalysis(media, { lut, pixelEffects, sampleRate: 5 })

// Palette (リアルタイム対応、低サンプリングレート)
const { palette: originalPalette } = useMediaPalette(media, { sampleRate: paletteSampleRate })
const { palette: filteredPalette } = useMediaPalette(media, { lut, pixelEffects, sampleRate: paletteSampleRate })

// Photo (for Segmentation/ColorLayers - Photo モード専用)
const photo = computed(() => media.value ? $Media.getPhoto(media.value) : null)

// Segmentation (edge-based) - manual trigger, Photo モードのみ
const edgeThreshold = ref(30)
const colorMergeThreshold = ref(0.12)
const minSegmentArea = ref(200)
const {
  segmentVisualization,
  edgeVisualization,
  overlayVisualization,
  segmentCount,
  compute: computeSegmentation,
  isLoading: isSegmentationLoading,
} = useSegmentation(photo, edgeThreshold, colorMergeThreshold, minSegmentArea)

// Color-based layers (k-means) - manual trigger, Photo モードのみ
const numColorLayers = ref(6)
const { colorLayerMap, originalImageData: colorLayerImageData, compute: computeColorLayers, isLoading: isColorLayersLoading } = useColorLayers(photo, numColorLayers)

// ファイル入力ハンドラ
const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    await loadPhoto(file)
  }
}

// カメラ起動/停止
const handleToggleCamera = async () => {
  if (isCameraActive.value) {
    stopCamera()
  } else {
    await startCamera({ width: 1280, height: 720, facingMode: 'user' })
  }
}

// スクリーンキャプチャ起動/停止
const handleToggleScreenCapture = async () => {
  if (isScreenCaptureActive.value) {
    stopScreenCapture()
  } else {
    await startScreenCapture()
  }
}

// 初期化: photoRepository に既存の Photo があれば Media に変換
// なければ、デフォルトのカラーパレット画像を生成
onMounted(() => {
  const existingPhoto = photoRepository.get()
  if (existingPhoto && !media.value) {
    setPhoto(existingPhoto)
  } else if (!media.value) {
    // デフォルトのカラーパレット画像を生成
    const defaultPhoto = createDefaultPhotoUseCase()
    photoRepository.set(defaultPhoto)
    setPhoto(defaultPhoto)
  }
})

// タブ状態
type TabId = 'source' | 'edit'
const activeTab = ref<TabId>('source')


// Unsplash
const isLoadingUnsplash = ref(false)
const handleLoadUnsplash = async () => {
  isLoadingUnsplash.value = true
  try {
    await loadUnsplashPhoto()
    const loadedPhoto = photoRepository.get()
    if (loadedPhoto) setPhoto(loadedPhoto)
  } finally {
    isLoadingUnsplash.value = false
  }
}

// Screenshot
const screenshotUrl = ref('')
const isLoadingScreenshot = ref(false)
const handleLoadScreenshot = async () => {
  if (!screenshotUrl.value) return
  isLoadingScreenshot.value = true
  try {
    await loadScreenshot({ url: screenshotUrl.value })
    const loadedPhoto = photoRepository.get()
    if (loadedPhoto) setPhoto(loadedPhoto)
  } finally {
    isLoadingScreenshot.value = false
  }
}

// Default Palette
const handleLoadDefaultPalette = () => {
  const defaultPhoto = createDefaultPhotoUseCase()
  photoRepository.set(defaultPhoto)
  setPhoto(defaultPhoto)
}
</script>

<template>
  <div class="h-screen bg-gray-900 text-white flex justify-center">
    <div class="flex w-[1800px] max-w-full">
    <!-- Left Panel: Tabs + Controls -->
    <div class="w-[480px] flex-shrink-0 border-r border-gray-700 flex flex-col">
      <!-- Tab Headers -->
      <div class="flex border-b border-gray-700">
        <button
          @click="activeTab = 'source'"
          :class="[
            'flex-1 px-2 py-2 text-xs font-medium transition-colors',
            activeTab === 'source'
              ? 'text-white bg-gray-800 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          ]"
        >
          Source
        </button>
        <button
          @click="activeTab = 'edit'"
          :class="[
            'flex-1 px-2 py-2 text-xs font-medium transition-colors',
            activeTab === 'edit'
              ? 'text-white bg-gray-800 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          ]"
        >
          Edit
        </button>
      </div>

      <!-- Tab Content (Scrollable) -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Source Tab -->
        <div v-if="activeTab === 'source'" class="space-y-4">
          <div class="border border-gray-700 rounded-lg p-4">
            <h2 class="text-sm text-gray-400 mb-3">Unsplash</h2>
            <button
              @click="handleLoadUnsplash"
              :disabled="isLoadingUnsplash"
              class="w-full py-2 px-4 rounded text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isLoadingUnsplash ? 'Loading...' : 'Random Photo' }}
            </button>
          </div>
          <div class="border border-gray-700 rounded-lg p-4">
            <h2 class="text-sm text-gray-400 mb-3">Screen Capture</h2>
            <button
              @click="handleToggleScreenCapture"
              class="w-full py-2 px-4 rounded text-sm font-semibold text-white"
              :class="isScreenCaptureActive ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-600 hover:bg-cyan-700'"
            >
              {{ isScreenCaptureActive ? 'Stop Capture' : 'Start Capture' }}
            </button>
            <p class="mt-2 text-xs text-gray-500">Select a tab/window to capture</p>

            <!-- FPS Settings (Streaming モード用) -->
            <div v-if="isStreaming" class="mt-3 pt-3 border-t border-gray-600">
              <div class="flex items-center justify-between">
                <span class="text-gray-500" style="font-size: 10px;">Palette Rate</span>
                <div class="flex gap-0.5">
                  <button
                    v-for="fps in [0, 5, 15, 30, 60] as const"
                    :key="`palette-${fps}`"
                    @click="paletteSampleRate = fps"
                    class="px-1 py-0 rounded transition-colors"
                    style="font-size: 9px;"
                    :class="paletteSampleRate === fps ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-500 hover:bg-gray-600'"
                  >
                    {{ fps === 0 ? 'Off' : fps }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="border border-gray-700 rounded-lg p-4">
            <h2 class="text-sm text-gray-400 mb-3">Camera</h2>
            <button
              @click="handleToggleCamera"
              class="w-full py-2 px-4 rounded text-sm font-semibold text-white"
              :class="isCameraActive ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'"
            >
              {{ isCameraActive ? 'Stop Camera' : 'Start Camera' }}
            </button>
          </div>
          <div class="border border-gray-700 rounded-lg p-4">
            <h2 class="text-sm text-gray-400 mb-3">Upload</h2>
            <input
              type="file"
              accept="image/*"
              @change="handleFileChange"
              class="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700
                cursor-pointer"
            />
          </div>
          <div class="border border-gray-700 rounded-lg p-4">
            <h2 class="text-sm text-gray-400 mb-3">Screenshot</h2>
            <input
              v-model="screenshotUrl"
              type="url"
              placeholder="https://example.com"
              class="w-full px-3 py-2 mb-2 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              @click="handleLoadScreenshot"
              :disabled="isLoadingScreenshot || !screenshotUrl"
              class="w-full py-2 px-4 rounded text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isLoadingScreenshot ? 'Capturing...' : 'Capture' }}
            </button>
          </div>
          <div class="border border-gray-700 rounded-lg p-4">
            <h2 class="text-sm text-gray-400 mb-3">Default Palette</h2>
            <button
              @click="handleLoadDefaultPalette"
              class="w-full py-2 px-4 rounded text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700"
            >
              Load Color Grid
            </button>
            <p class="mt-2 text-xs text-gray-500">20 hues × 10 shades color palette</p>
          </div>
          <p v-if="mediaError" class="text-xs text-red-400">{{ mediaError }}</p>
        </div>

        <!-- Edit Tab (Presets + Adjustments) -->
        <FilterPanel
          v-if="activeTab === 'edit'"
          :filter="filter"
          :presets="PRESETS"
          :current-preset-id="currentPresetId"
          :setters="setters"
          @apply-preset="applyPreset"
          @update:master-point="setMasterPoint"
          @reset="reset"
        />
      </div>
    </div>

    <!-- Right Panel: Preview + Analysis -->
    <div class="flex-1 flex flex-col min-w-0 p-4 gap-4 overflow-auto">
      <!-- Preview Area - Before/After -->
      <div class="flex-shrink-0">
        <!-- FPS display for streaming mode -->
        <div class="flex items-center justify-between mb-2 h-5">
          <div class="text-xs text-gray-500">
            <span v-if="isStreaming">
              {{ isScreenCaptureActive ? 'Screen Capture' : 'Camera' }}
            </span>
          </div>
          <div v-if="isStreaming && isProcessing" class="text-xs font-mono">
            <span class="text-green-400">{{ renderStats.fps }} FPS</span>
            <span class="text-gray-500 ml-2">{{ renderStats.frameTime }}ms</span>
            <span class="text-gray-600 ml-2">#{{ renderStats.frameCount }}</span>
          </div>
        </div>

        <!-- Before/After Grid -->
        <div class="grid grid-cols-2 gap-2">
          <!-- Before -->
          <div class="relative bg-gray-800 border border-gray-700 rounded-lg overflow-hidden" style="aspect-ratio: 16/9;">
            <div class="absolute top-2 left-2 text-xs text-gray-400 bg-gray-900/70 px-2 py-0.5 rounded">Before</div>
            <div class="absolute inset-0 flex items-center justify-center">
              <canvas
                ref="beforeCanvasRef"
                :class="{ 'hidden': !media }"
                class="max-w-full max-h-full object-contain"
              />
              <p v-if="!media" class="text-gray-500 text-xs text-center px-4">
                画像/カメラ/画面キャプチャ<br/>を選択してください
              </p>
            </div>
          </div>
          <!-- After -->
          <div class="relative bg-gray-800 border border-gray-700 rounded-lg overflow-hidden" style="aspect-ratio: 16/9;">
            <div class="absolute top-2 left-2 text-xs text-gray-400 bg-gray-900/70 px-2 py-0.5 rounded">After</div>
            <div class="absolute inset-0 flex items-center justify-center">
              <canvas
                ref="afterCanvasRef"
                :class="{ 'hidden': !media }"
                class="max-w-full max-h-full object-contain"
              />
              <p v-if="!media" class="text-gray-500 text-xs">-</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Palette -->
      <div v-if="originalPalette" class="border border-gray-700 rounded-lg p-3 bg-gray-800 flex-shrink-0">
        <h2 class="text-xs text-gray-400 font-medium mb-2">Color Palette</h2>
        <ProfiledPaletteDisplay :original="originalPalette" :filtered="filteredPalette" />
      </div>

      <!-- Histogram & Statistics -->
      <div v-if="originalAnalysis && filteredAnalysis" class="grid grid-cols-2 gap-4 flex-shrink-0">
        <!-- Histogram (縦並び) -->
        <div class="border border-gray-700 rounded-lg p-3 bg-gray-800">
          <h2 class="text-xs text-gray-400 font-medium mb-2">Histogram</h2>
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-8 flex-shrink-0">Bfr</span>
              <HistogramCanvas :data="originalAnalysis.histogram" :width="300" :height="50" class="flex-1" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-8 flex-shrink-0">Aft</span>
              <HistogramCanvas :data="filteredAnalysis.histogram" :width="300" :height="50" class="flex-1" />
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div class="border border-gray-700 rounded-lg p-3 bg-gray-800 min-w-0">
          <h2 class="text-xs text-gray-400 font-medium mb-2">Statistics</h2>
          <div class="grid grid-cols-2 gap-6">
            <div class="min-w-0">
              <span class="text-xs text-gray-500">Before</span>
              <PhotoStats :stats="originalAnalysis.stats" />
            </div>
            <div class="min-w-0">
              <span class="text-xs text-gray-500">After</span>
              <PhotoStats :stats="filteredAnalysis.stats" />
            </div>
          </div>
        </div>
      </div>

      <!-- Segmentation -->
      <div v-if="photo" class="border border-gray-700 rounded-lg p-3 bg-gray-800 flex-shrink-0">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xs text-gray-400 font-medium">Segmentation</h2>
          <button
            @click="computeSegmentation"
            :disabled="isSegmentationLoading"
            class="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded"
          >
            {{ isSegmentationLoading ? 'Computing...' : segmentVisualization ? 'Recompute' : 'Compute' }}
          </button>
        </div>
        <template v-if="segmentVisualization">
          <SegmentationDisplay
            :segment-visualization="segmentVisualization"
            :edge-visualization="edgeVisualization"
            :overlay-visualization="overlayVisualization"
            :segment-count="segmentCount"
            :edge-threshold="edgeThreshold"
            @update:edge-threshold="edgeThreshold = $event"
          />
        </template>
        <p v-else class="text-xs text-gray-500">Click "Compute" to analyze segmentation</p>
      </div>

      <!-- 3D Layer Stack Preview (Color-based) -->
      <div v-if="photo" class="border border-gray-700 rounded-lg p-3 bg-gray-800 flex-shrink-0">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xs text-gray-400 font-medium">Color Layers</h2>
          <button
            @click="computeColorLayers"
            :disabled="isColorLayersLoading"
            class="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded"
          >
            {{ isColorLayersLoading ? 'Computing...' : colorLayerMap ? 'Recompute' : 'Compute' }}
          </button>
        </div>
        <template v-if="colorLayerMap">
          <div class="flex items-center gap-4 text-xs mb-2">
            <div class="flex items-center gap-2">
              <span class="text-gray-500 w-12">Layers</span>
              <input
                type="range"
                min="3"
                max="12"
                step="1"
                v-model.number="numColorLayers"
                class="w-20 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span class="text-gray-500 w-6">{{ numColorLayers }}</span>
            </div>
            <!-- Layer color indicators -->
            <div class="flex gap-1 ml-auto">
              <div
                v-for="layer in colorLayerMap.layers"
                :key="layer.id"
                class="w-4 h-4 rounded-sm border border-gray-600"
                :style="{ backgroundColor: `rgb(${layer.color.r}, ${layer.color.g}, ${layer.color.b})` }"
                :title="`${(layer.ratio * 100).toFixed(1)}%`"
              />
            </div>
          </div>
          <LayerStackPreview
            :color-layer-map="colorLayerMap"
            :original-image-data="colorLayerImageData"
          />
        </template>
        <p v-else class="text-xs text-gray-500">Click "Compute" to analyze color layers</p>
      </div>
    </div>
    </div>
  </div>
</template>
