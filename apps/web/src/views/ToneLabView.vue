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

// Curve fit type
const fitType = ref<CurveFitType>('polynomial')

// Filter (shared for all images)
const PRESETS = getPresets()
const { filter, lut: filterLut, currentPresetId, applyPreset, setters, setMasterPoint, reset } = useFilter(7)

// Canvas refs for each photo (3 per photo: original, flat, filter)
const canvasRefs = ref<Map<string, HTMLCanvasElement>>(new Map())

// WebGL renderers cache
const renderers = new Map<HTMLCanvasElement, LutRenderer>()

// Load 5 random photos
const loadPhotos = async () => {
  isLoading.value = true
  error.value = null
  try {
    const loaded = await fetchUnsplashPhotos({ count: 5 })
    photos.value = loaded
    // Extract profiles for each photo
    profiles.value = loaded.map((photo) => {
      const smallImageData = downsampleImageData(photo.imageData, 320)
      return $LuminanceProfile.extract(smallImageData, 1, 7)
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load photos'
  } finally {
    isLoading.value = false
  }
}

// Downsample ImageData for faster analysis
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

// Render a photo to canvas with optional LUT
const renderToCanvas = (
  canvas: HTMLCanvasElement,
  photo: Photo,
  lut: Lut1D | null
) => {
  const renderer = getRenderer(canvas)
  canvas.width = photo.width
  canvas.height = photo.height
  const options: RenderOptions = { lut: lut ?? createIdentityLut() }
  renderer.render(photo.imageData, options)
}

// Store canvas ref
const setCanvasRef = (el: HTMLCanvasElement | null, photoIndex: number, type: 'original' | 'flat' | 'filter') => {
  if (el) {
    canvasRefs.value.set(`${photoIndex}-${type}`, el)
  }
}

// Render all canvases when photos or filter changes
const renderAllCanvases = () => {
  photos.value.forEach((photo, index) => {
    const profile = profiles.value[index]

    // Original
    const originalCanvas = canvasRefs.value.get(`${index}-original`)
    if (originalCanvas) {
      renderToCanvas(originalCanvas, photo, null)
    }

    // Flat (inverse LUT to neutralize)
    const flatCanvas = canvasRefs.value.get(`${index}-flat`)
    if (flatCanvas && profile) {
      const inverseLut = $LuminanceProfile.toFittedInverseLut(profile, fitType.value)
      renderToCanvas(flatCanvas, photo, {
        type: 'lut1d',
        r: inverseLut,
        g: inverseLut,
        b: inverseLut,
      })
    }

    // Filter (inverse LUT + filter LUT)
    const filterCanvas = canvasRefs.value.get(`${index}-filter`)
    if (filterCanvas && profile && filterLut.value) {
      const inverseLut = $LuminanceProfile.toFittedInverseLut(profile, fitType.value)

      // Only compose if filterLut is 1D LUT
      if (filterLut.value.type === 'lut1d') {
        const fLut = filterLut.value as Lut1D
        const composedR = new Float32Array(256)
        const composedG = new Float32Array(256)
        const composedB = new Float32Array(256)
        for (let i = 0; i < 256; i++) {
          const flatVal = inverseLut[i]!
          const flatIdx = Math.round(flatVal * 255)
          composedR[i] = fLut.r[flatIdx]!
          composedG[i] = fLut.g[flatIdx]!
          composedB[i] = fLut.b[flatIdx]!
        }
        renderToCanvas(filterCanvas, photo, { type: 'lut1d', r: composedR, g: composedG, b: composedB })
      } else {
        // For 3D LUT, just apply inverse for now
        renderToCanvas(filterCanvas, photo, {
          type: 'lut1d',
          r: inverseLut,
          g: inverseLut,
          b: inverseLut,
        })
      }
    }
  })
}

// Watch for changes and re-render
watch([photos, profiles, fitType, filterLut], () => {
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

        <!-- Fit Type -->
        <div class="mt-3 flex items-center gap-2">
          <span class="text-xs text-gray-500">Fit:</span>
          <div class="flex gap-1">
            <button
              v-for="ft in (['polynomial', 'spline', 'simple', 'raw'] as const)"
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
      <!-- Header -->
      <div v-if="photos.length > 0" class="grid grid-cols-3 gap-2 mb-2 text-xs text-gray-400 font-medium">
        <div class="text-center">Original</div>
        <div class="text-center">Flat</div>
        <div class="text-center">Filter</div>
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
