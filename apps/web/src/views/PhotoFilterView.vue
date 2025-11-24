<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useMedia, useMediaCanvasWebGL, useMediaAnalysis, useMediaPalette } from '../composables/Media'
import { loadUnsplashPhoto } from '../modules/PhotoUnsplash/Application/loadUnsplashPhoto'
import { loadScreenshot } from '../modules/PhotoScreenshot/Application/loadScreenshot'
import { photoRepository } from '../modules/Photo/Infra/photoRepository'
import { createDefaultPhotoUseCase } from '../modules/Photo/Application/createDefaultPhotoUseCase'
import { useFilter } from '../composables/Filter/useFilter'
import { PRESETS } from '../modules/Filter/Domain'
import { $Media } from '../modules/Media'
import { useSegmentation } from '../composables/Segmentation/useSegmentation'
import { useColorLayers } from '../composables/Segmentation/useColorLayers'
import HistogramCanvas from '../components/HistogramCanvas.vue'
import PhotoStats from '../components/PhotoStats.vue'
import CurveEditor from '../components/CurveEditor.vue'
import ProfiledPaletteDisplay from '../components/ProfiledPaletteDisplay.vue'
import SegmentationDisplay from '../components/SegmentationDisplay.vue'
import LayerStackPreview from '../components/LayerStackPreview.vue'

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

// Filter
const { filter, lut, pixelEffects, currentPresetId, applyPreset, setters, setMasterPoint, reset } = useFilter(7)

// Canvas描画 - Before (オリジナル) と After (フィルター適用) - WebGL 使用
const { canvasRef: beforeCanvasRef, stats: renderStats, isProcessing } = useMediaCanvasWebGL(media)
const { canvasRef: afterCanvasRef } = useMediaCanvasWebGL(media, { lut, pixelEffects })

// サンプリングレート (動的に変更可能) - 0 で無効
type FpsOption = 60 | 30 | 15 | 5 | 0
const analysisSampleRate = ref<FpsOption>(5)
const paletteSampleRate = ref<FpsOption>(5)

// Analysis (リアルタイム対応、サンプリングレート付き)
const { analysis: originalAnalysis } = useMediaAnalysis(media, { sampleRate: analysisSampleRate })
const { analysis: filteredAnalysis } = useMediaAnalysis(media, { lut, pixelEffects, sampleRate: analysisSampleRate })

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

// イベントハンドラファクトリ (デバウンス付き)
const DEBOUNCE_MS = 16
const createHandler = (setter: (v: number) => void) => {
  const debounced = useDebounceFn(setter, DEBOUNCE_MS)
  return (e: Event) => debounced(parseFloat((e.target as HTMLInputElement).value))
}

// 全ハンドラを一括生成
const handlers = {
  exposure: createHandler(setters.exposure),
  highlights: createHandler(setters.highlights),
  shadows: createHandler(setters.shadows),
  whites: createHandler(setters.whites),
  blacks: createHandler(setters.blacks),
  brightness: createHandler(setters.brightness),
  contrast: createHandler(setters.contrast),
  temperature: createHandler(setters.temperature),
  tint: createHandler(setters.tint),
  clarity: createHandler(setters.clarity),
  fade: createHandler(setters.fade),
  vibrance: createHandler(setters.vibrance),
  splitShadowHue: createHandler(setters.splitShadowHue),
  splitShadowAmount: createHandler(setters.splitShadowAmount),
  splitHighlightHue: createHandler(setters.splitHighlightHue),
  splitHighlightAmount: createHandler(setters.splitHighlightAmount),
  splitBalance: createHandler(setters.splitBalance),
  toe: createHandler(setters.toe),
  shoulder: createHandler(setters.shoulder),
  liftR: createHandler(setters.liftR),
  liftG: createHandler(setters.liftG),
  liftB: createHandler(setters.liftB),
  gammaR: createHandler(setters.gammaR),
  gammaG: createHandler(setters.gammaG),
  gammaB: createHandler(setters.gammaB),
  gainR: createHandler(setters.gainR),
  gainG: createHandler(setters.gainG),
  gainB: createHandler(setters.gainB),
}

const debouncedSetMasterPoint = useDebounceFn(setMasterPoint, DEBOUNCE_MS)
const handlePointUpdate = (index: number, value: number) => {
  debouncedSetMasterPoint(index, value)
}

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
    <div class="flex w-[1200px] max-w-full">
    <!-- Left Panel: Tabs + Controls -->
    <div class="w-80 flex-shrink-0 border-r border-gray-700 flex flex-col">
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
            <div v-if="isStreaming" class="mt-3 pt-3 border-t border-gray-600 space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-gray-500" style="font-size: 10px;">Analysis</span>
                <div class="flex gap-0.5">
                  <button
                    v-for="fps in [0, 5, 15, 30, 60] as const"
                    :key="`analysis-${fps}`"
                    @click="analysisSampleRate = fps"
                    class="px-1 py-0 rounded transition-colors"
                    style="font-size: 9px;"
                    :class="analysisSampleRate === fps ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-500 hover:bg-gray-600'"
                  >
                    {{ fps === 0 ? 'Off' : fps }}
                  </button>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-500" style="font-size: 10px;">Palette</span>
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
        <div v-if="activeTab === 'edit'" class="space-y-3">
        <!-- Presets (コンパクト) -->
        <div class="border border-gray-700 rounded-lg p-2">
          <div class="flex flex-wrap gap-1">
            <button
              v-for="preset in PRESETS"
              :key="preset.id"
              @click="applyPreset(preset)"
              :class="[
                'px-1.5 py-0.5 rounded transition-colors',
                currentPresetId === preset.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ]"
              :title="preset.description"
              style="font-size: 10px;"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>
        <!-- Basic Adjustments -->
        <div class="border border-gray-700 rounded-lg p-3">
          <div class="flex justify-between items-center mb-2">
            <h2 class="text-xs text-gray-400 font-medium">Adjustments</h2>
            <button
              @click="reset"
              class="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-400"
              style="font-size: 10px;"
            >
              Reset
            </button>
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Exposure</span>
              <input type="range" min="-2" max="2" step="0.01" :value="filter.adjustment.exposure" @input="handlers.exposure" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Highlights</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.highlights" @input="handlers.highlights" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Shadows</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.shadows" @input="handlers.shadows" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Whites</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.whites" @input="handlers.whites" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Blacks</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.blacks" @input="handlers.blacks" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Brightness</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.brightness" @input="handlers.brightness" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Contrast</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.contrast" @input="handlers.contrast" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Clarity</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.clarity" @input="handlers.clarity" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Temp</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.temperature" @input="handlers.temperature" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Tint</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.tint" @input="handlers.tint" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Fade</span>
              <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.fade" @input="handlers.fade" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Vibrance</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.vibrance" @input="handlers.vibrance" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- Split Toning -->
        <div class="border border-gray-700 rounded-lg p-3">
          <h2 class="text-xs text-gray-400 font-medium mb-2">Split Toning</h2>
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Sh Hue</span>
              <input type="range" min="0" max="360" step="1" :value="filter.adjustment.splitShadowHue" @input="handlers.splitShadowHue" class="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer" style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Sh Amt</span>
              <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.splitShadowAmount" @input="handlers.splitShadowAmount" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Hi Hue</span>
              <input type="range" min="0" max="360" step="1" :value="filter.adjustment.splitHighlightHue" @input="handlers.splitHighlightHue" class="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer" style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Hi Amt</span>
              <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.splitHighlightAmount" @input="handlers.splitHighlightAmount" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Balance</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.splitBalance" @input="handlers.splitBalance" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- Film Curve -->
        <div class="border border-gray-700 rounded-lg p-3">
          <h2 class="text-xs text-gray-400 font-medium mb-2">Film Curve</h2>
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Toe</span>
              <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.toe" @input="handlers.toe" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 w-16 flex-shrink-0">Shoulder</span>
              <input type="range" min="0" max="1" step="0.01" :value="filter.adjustment.shoulder" @input="handlers.shoulder" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- Color Balance (Lift/Gamma/Gain) -->
        <div class="border border-gray-700 rounded-lg p-3">
          <h2 class="text-xs text-gray-400 font-medium mb-2">Color Balance</h2>
          <div class="space-y-1.5">
            <!-- Lift -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-red-400 w-16 flex-shrink-0">Lift R</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.liftR" @input="handlers.liftR" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-green-400 w-16 flex-shrink-0">Lift G</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.liftG" @input="handlers.liftG" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-blue-400 w-16 flex-shrink-0">Lift B</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.liftB" @input="handlers.liftB" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <!-- Gamma -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-red-400 w-16 flex-shrink-0">Gamma R</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gammaR" @input="handlers.gammaR" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-green-400 w-16 flex-shrink-0">Gamma G</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gammaG" @input="handlers.gammaG" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-blue-400 w-16 flex-shrink-0">Gamma B</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gammaB" @input="handlers.gammaB" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <!-- Gain -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-red-400 w-16 flex-shrink-0">Gain R</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gainR" @input="handlers.gainR" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-green-400 w-16 flex-shrink-0">Gain G</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gainG" @input="handlers.gainG" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-blue-400 w-16 flex-shrink-0">Gain B</span>
              <input type="range" min="-1" max="1" step="0.01" :value="filter.adjustment.gainB" @input="handlers.gainB" class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- Curve Editor -->
        <div class="border border-gray-700 rounded-lg p-3">
          <h2 class="text-xs text-gray-400 font-medium mb-2">Tone Curve</h2>
          <CurveEditor
            :curve="filter.master"
            :width="240"
            :height="100"
            @update:point="handlePointUpdate"
          />
        </div>
        </div>
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
