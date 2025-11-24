<script setup lang="ts">
import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { usePhotoUpload } from '../composables/PhotoLocal/usePhotoUpload'
import { loadUnsplashPhoto } from '../modules/PhotoUnsplash/Application/loadUnsplashPhoto'
import { loadScreenshot } from '../modules/PhotoScreenshot/Application/loadScreenshot'
import { photoRepository } from '../modules/Photo/Infra/photoRepository'
import { usePhotoCanvas } from '../composables/Photo/usePhotoCanvas'
import { usePhotoAnalysis } from '../composables/Photo/usePhotoAnalysis'
import { useFilter } from '../composables/Filter/useFilter'
import { PRESETS } from '../modules/Filter/Domain'
import { useProfiledPalette } from '../composables/Palette/useProfiledPalette'
import { useSegmentation } from '../composables/Segmentation/useSegmentation'
import { useColorLayers } from '../composables/Segmentation/useColorLayers'
import HistogramCanvas from '../components/HistogramCanvas.vue'
import PhotoStats from '../components/PhotoStats.vue'
import CurveEditor from '../components/CurveEditor.vue'
import ProfiledPaletteDisplay from '../components/ProfiledPaletteDisplay.vue'
import SegmentationDisplay from '../components/SegmentationDisplay.vue'
import LayerStackPreview from '../components/LayerStackPreview.vue'

const { photo, handleFileChange } = usePhotoUpload()
const { filter, lut, pixelEffects, currentPresetId, applyPreset, setters, setMasterPoint, reset } = useFilter(7)

// Canvas描画は即時 (軽い)
const { canvasRef } = usePhotoCanvas(photo, { lut, pixelEffects })

// Original analysis (before filter)
const { analysis: originalAnalysis } = usePhotoAnalysis(photo)
// Filtered analysis (after filter)
const { analysis: filteredAnalysis } = usePhotoAnalysis(photo, { lut })

// Palette extraction with role profiling
const { palette: originalPalette } = useProfiledPalette(photo)
const { palette: filteredPalette } = useProfiledPalette(photo, { lut })

// Segmentation (edge-based)
const edgeThreshold = ref(30)
const colorMergeThreshold = ref(0.12)
const minSegmentArea = ref(200)
const {
  segmentVisualization,
  edgeVisualization,
  overlayVisualization,
  segmentCount,
} = useSegmentation(photo, edgeThreshold, colorMergeThreshold, minSegmentArea)

// Color-based layers (k-means)
const numColorLayers = ref(6)
const { colorLayerMap, originalImageData: colorLayerImageData } = useColorLayers(photo, numColorLayers)

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
    photo.value = photoRepository.get()
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
    photo.value = photoRepository.get()
  } finally {
    isLoadingScreenshot.value = false
  }
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
      <!-- Preview Area (16:9 container) -->
      <div class="flex-shrink-0">
        <div class="relative w-full bg-gray-800 border border-gray-700 rounded-lg overflow-hidden" style="aspect-ratio: 16/9;">
          <div class="absolute inset-0 flex items-center justify-center">
            <canvas
              ref="canvasRef"
              :class="{ 'hidden': !photo }"
              class="max-w-full max-h-full object-contain"
            />
            <p v-if="!photo" class="text-gray-500">
              画像をアップロードしてください
            </p>
          </div>
        </div>
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

      <!-- Palette -->
      <div v-if="originalPalette" class="border border-gray-700 rounded-lg p-3 bg-gray-800 flex-shrink-0">
        <h2 class="text-xs text-gray-400 font-medium mb-2">Color Palette</h2>
        <ProfiledPaletteDisplay :original="originalPalette" :filtered="filteredPalette" />
      </div>

      <!-- Segmentation -->
      <div v-if="photo" class="border border-gray-700 rounded-lg p-3 bg-gray-800 flex-shrink-0">
        <h2 class="text-xs text-gray-400 font-medium mb-2">Segmentation</h2>
        <SegmentationDisplay
          :segment-visualization="segmentVisualization"
          :edge-visualization="edgeVisualization"
          :overlay-visualization="overlayVisualization"
          :segment-count="segmentCount"
          :edge-threshold="edgeThreshold"
          @update:edge-threshold="edgeThreshold = $event"
        />
      </div>

      <!-- 3D Layer Stack Preview (Color-based) -->
      <div v-if="colorLayerMap" class="border border-gray-700 rounded-lg p-3 bg-gray-800 flex-shrink-0">
        <h2 class="text-xs text-gray-400 font-medium mb-2">Color Layers ({{ colorLayerMap.layers.length }} layers)</h2>
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
      </div>
    </div>
    </div>
  </div>
</template>
