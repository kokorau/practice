<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { Photo } from '../modules/Photo/Domain'
import { fetchUnsplashPhotos } from '../modules/PhotoUnsplash/Infra/fetchUnsplashPhoto'
import { useFilter } from '../composables/Filter/useFilter'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'
import { $LuminanceProfile, type LuminanceProfile, type CurveFitType, type Lut1D } from '../modules/Filter/Domain'
import { LutRenderer, type RenderOptions } from '../modules/Filter/Infra/WebGL/LutRenderer'
import FilterPanel from '../components/Filter/FilterPanel.vue'

// Photos array
const photos = ref<Photo[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

// Luminance profiles for each photo
const profiles = ref<(LuminanceProfile | null)[]>([])

// Curve fit type (default to 'normalize' for stability)
const fitType = ref<CurveFitType>('normalize')

// Flatten strength (0 = no change, 1 = full flatten)
const flatStrength = ref(0.5)

// Preserve mean luminance (prevent dark/bright images from shifting too much)
const preserveMean = ref(true)

// Filter (shared for all images)
const PRESETS = getPresets()
const { filter, lut: filterLut, currentPresetId, applyPreset, setters, setMasterPoint, reset } = useFilter(7)

// Canvas refs for each photo (3 per photo: original, flat, filter)
const canvasRefs = ref<Map<string, HTMLCanvasElement>>(new Map())

// WebGL renderers cache
const renderers = new Map<HTMLCanvasElement, LutRenderer>()

// Display images cache (original, downscaled)
const displayImages = ref<Map<number, ImageData>>(new Map())

// Flattened images cache (Oklab-based, color-preserving)
const flattenedImages = ref<Map<string, ImageData>>(new Map()) // key: `${index}-${fitType}-${strength}`

// Load 5 random photos
const loadPhotos = async () => {
  isLoading.value = true
  error.value = null
  flattenedImages.value.clear()
  try {
    const loaded = await fetchUnsplashPhotos({ count: 5 })
    photos.value = loaded

    // Create display images and extract profiles
    displayImages.value.clear()
    profiles.value = loaded.map((photo, index) => {
      // Cache display image
      const displayImg = getDisplayImageData(photo)
      displayImages.value.set(index, displayImg)

      // Extract profile from small version
      const smallImageData = downsampleImageData(photo.imageData, 320)
      return $LuminanceProfile.extract(smallImageData, 1, 7)
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load photos'
  } finally {
    isLoading.value = false
  }
}

// Downsample ImageData
const downsampleImageData = (imageData: ImageData, maxWidth: number): ImageData => {
  if (imageData.width <= maxWidth) return imageData

  const scale = maxWidth / imageData.width
  const newWidth = Math.floor(imageData.width * scale)
  const newHeight = Math.floor(imageData.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = newWidth
  canvas.height = newHeight
  const ctx = canvas.getContext('2d')!

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = imageData.width
  tempCanvas.height = imageData.height
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.putImageData(imageData, 0, 0)

  ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight)
  return ctx.getImageData(0, 0, newWidth, newHeight)
}

// Downscale photo for display (max 400px width)
const getDisplayImageData = (photo: Photo): ImageData => {
  return downsampleImageData(photo.imageData, 400)
}

// Get or create flattened image (Oklab color-preserving)
const getFlattenedImage = (index: number): ImageData | null => {
  const strengthKey = Math.round(flatStrength.value * 100) // quantize for caching
  const preserveMeanKey = preserveMean.value ? 1 : 0
  const key = `${index}-${fitType.value}-${strengthKey}-${preserveMeanKey}`
  const cached = flattenedImages.value.get(key)
  if (cached) return cached

  const profile = profiles.value[index]
  const displayImg = displayImages.value.get(index)
  if (!profile || !displayImg) return null

  // Apply inverse LUT with strength blending using Oklab (preserves colors)
  let inverseLut = $LuminanceProfile.toFittedInverseLut(profile, fitType.value)

  // Shift LUT to preserve original mean luminance (prevents dark/bright images from shifting too much)
  if (preserveMean.value) {
    inverseLut = $LuminanceProfile.shiftLutToPreserveMean(inverseLut, profile.meanLuminance)
  }

  const blendedLut = $LuminanceProfile.blendLut(inverseLut, flatStrength.value)
  const flattened = $LuminanceProfile.applyLut(displayImg, blendedLut)
  flattenedImages.value.set(key, flattened)
  return flattened
}

// Get or create LutRenderer for a canvas
const getRenderer = (canvas: HTMLCanvasElement): LutRenderer => {
  let renderer = renderers.get(canvas)
  if (!renderer) {
    renderer = new LutRenderer({ canvas })
    renderers.set(canvas, renderer)
  }
  return renderer
}

// Create identity LUT
const createIdentityLut = (): Lut1D => {
  const identity = new Float32Array(256)
  for (let i = 0; i < 256; i++) identity[i] = i / 255
  return { type: 'lut1d', r: identity, g: identity, b: identity }
}

// Render ImageData to canvas with optional LUT (WebGL)
const renderToCanvas = (
  canvas: HTMLCanvasElement,
  imageData: ImageData,
  lut: Lut1D | null
) => {
  const renderer = getRenderer(canvas)
  const options: RenderOptions = { lut: lut ?? createIdentityLut() }
  renderer.render(imageData, options)
}

// Store canvas ref
const setCanvasRef = (el: HTMLCanvasElement | null, photoIndex: number, type: 'original' | 'flat' | 'filter') => {
  if (el) {
    canvasRefs.value.set(`${photoIndex}-${type}`, el)
  }
}

// Render all canvases
const renderAllCanvases = () => {
  photos.value.forEach((_photo, index) => {
    const imageData = displayImages.value.get(index)
    if (!imageData) return

    // Original - no LUT
    const originalCanvas = canvasRefs.value.get(`${index}-original`)
    if (originalCanvas) {
      renderToCanvas(originalCanvas, imageData, null)
    }

    // Flat - pre-computed with Oklab (color-preserving)
    const flatCanvas = canvasRefs.value.get(`${index}-flat`)
    if (flatCanvas) {
      const flattenedImg = getFlattenedImage(index)
      if (flattenedImg) {
        renderToCanvas(flatCanvas, flattenedImg, null)
      }
    }

    // Filter - apply filter LUT to flattened image
    const filterCanvas = canvasRefs.value.get(`${index}-filter`)
    if (filterCanvas) {
      const flattenedImg = getFlattenedImage(index)
      if (flattenedImg) {
        const fLut = filterLut.value?.type === 'lut1d' ? filterLut.value as Lut1D : createIdentityLut()
        renderToCanvas(filterCanvas, flattenedImg, fLut)
      }
    }
  })
}

// Clear flattened cache when fitType, strength, or preserveMean changes
watch([fitType, flatStrength, preserveMean], () => {
  flattenedImages.value.clear()
})

// Watch for changes and re-render
watch([photos, displayImages, profiles, fitType, flatStrength, preserveMean, filterLut], () => {
  nextTick(renderAllCanvases)
}, { deep: true })
</script>

<template>
  <div class="h-screen bg-gray-900 text-white flex">
    <!-- Left Panel: Filter -->
    <div class="w-80 flex-shrink-0 border-r border-gray-700 flex flex-col overflow-hidden">
      <div class="p-4 border-b border-gray-700">
        <h1 class="text-lg font-semibold mb-3">Tone Lab</h1>
        <button
          @click="loadPhotos"
          :disabled="isLoading"
          class="w-full py-2 px-4 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded font-medium"
        >
          {{ isLoading ? 'Loading...' : 'Load 5 Random Photos' }}
        </button>
        <p v-if="error" class="mt-2 text-xs text-red-400">{{ error }}</p>
      </div>

      <!-- Filter Panel -->
      <div class="flex-1 overflow-y-auto p-4">
        <FilterPanel
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

    <!-- Right Panel: Photo Grid -->
    <div class="flex-1 overflow-auto p-4">
      <!-- Header with Fit Type -->
      <div v-if="photos.length > 0" class="flex items-center justify-between mb-2">
        <div class="grid grid-cols-3 gap-2 flex-1 text-xs text-gray-400 font-medium">
          <div class="text-center">Original</div>
          <div class="text-center">Flat</div>
          <div class="text-center">Filter</div>
        </div>
        <!-- Controls -->
        <div class="flex items-center gap-4 ml-4">
          <!-- Strength Slider -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">Strength:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              v-model.number="flatStrength"
              class="w-20 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span class="text-xs text-gray-400 w-8">{{ Math.round(flatStrength * 100) }}%</span>
          </div>
          <!-- Preserve Mean Toggle -->
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              v-model="preserveMean"
              class="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span class="text-xs text-gray-500">Keep Mean</span>
          </label>
          <!-- Fit Type Selector -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">Fit:</span>
            <div class="flex gap-1">
              <button
                v-for="ft in (['normalize', 'polynomial', 'spline', 'simple', 'raw'] as const)"
                :key="ft"
                @click="fitType = ft"
                :class="[
                  'px-2 py-0.5 text-[10px] rounded',
                  fitType === ft ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                ]"
              >
                {{ ft }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Photo Rows -->
      <div v-if="photos.length > 0" class="space-y-2">
        <div v-for="(_photo, index) in photos" :key="index" class="grid grid-cols-3 gap-2">
          <!-- Original -->
          <div class="bg-gray-800 rounded overflow-hidden" style="aspect-ratio: 16/10;">
            <canvas
              :ref="(el) => setCanvasRef(el as HTMLCanvasElement, index, 'original')"
              class="w-full h-full object-contain"
            />
          </div>

          <!-- Flat -->
          <div class="bg-gray-800 rounded overflow-hidden" style="aspect-ratio: 16/10;">
            <canvas
              :ref="(el) => setCanvasRef(el as HTMLCanvasElement, index, 'flat')"
              class="w-full h-full object-contain"
            />
          </div>

          <!-- Filter -->
          <div class="bg-gray-800 rounded overflow-hidden" style="aspect-ratio: 16/10;">
            <canvas
              :ref="(el) => setCanvasRef(el as HTMLCanvasElement, index, 'filter')"
              class="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="flex items-center justify-center h-full">
        <p class="text-gray-500">Click "Load 5 Random Photos" to get started</p>
      </div>
    </div>
  </div>
</template>
