<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMedia, useMediaCanvasWebGL } from '../composables/Media'
import { loadUnsplashPhoto } from '../modules/PhotoUnsplash/Application/loadUnsplashPhoto'
import { photoRepository } from '../modules/Photo/Infra/photoRepository'
import { useLuminanceProfile } from '../composables/Filter/useLuminanceProfile'
import { type Lut } from '../modules/Filter/Domain'
import { $Media } from '../modules/Media'
import LuminanceProfilePanel from '../components/LuminanceProfilePanel.vue'

// Media
const {
  media,
  setPhoto,
  error: mediaError,
} = useMedia()

// Photo (for LuminanceProfile)
const photo = computed(() => media.value ? $Media.getPhoto(media.value) : null)

// Canvas - Before (original)
const { canvasRef: beforeCanvasRef } = useMediaCanvasWebGL(media)

// LuminanceProfile (auto-extract)
const {
  profile: luminanceProfile,
  inverseLut,
  fitType: luminanceFitType,
  isExtracting: isLuminanceExtracting,
  extractionTime: luminanceExtractionTime,
} = useLuminanceProfile(photo)

// After canvas に inverse LUT を適用するための lut
const afterLut = computed<Lut>(() => {
  if (!inverseLut.value) {
    // Identity LUT
    const identity = new Float32Array(256)
    for (let i = 0; i < 256; i++) identity[i] = i / 255
    return { type: 'lut1d', r: identity, g: identity, b: identity }
  }
  // LuminanceLut (Float32Array) を Lut1D 形式に変換
  return {
    type: 'lut1d',
    r: inverseLut.value,
    g: inverseLut.value,
    b: inverseLut.value,
  }
})

// Canvas - After (with inverse LUT applied)
const { canvasRef: afterCanvasRef } = useMediaCanvasWebGL(media, { lut: afterLut })

// Unsplash random photo
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

// ファイルアップロード
const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, img.width, img.height)
    setPhoto({ imageData, width: img.width, height: img.height })
  }
  img.src = URL.createObjectURL(file)
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white p-6">
    <div class="max-w-5xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold">Tone Lab</h1>
        <div class="flex gap-2">
          <button
            @click="handleLoadUnsplash"
            :disabled="isLoadingUnsplash"
            class="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded font-medium"
          >
            {{ isLoadingUnsplash ? 'Loading...' : 'Random Photo' }}
          </button>
          <label class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded font-medium cursor-pointer">
            Upload
            <input type="file" accept="image/*" @change="handleFileChange" class="hidden" />
          </label>
        </div>
      </div>

      <!-- Error -->
      <p v-if="mediaError" class="text-sm text-red-400">{{ mediaError }}</p>

      <!-- Before / After -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Before -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div class="px-3 py-2 border-b border-gray-700 text-xs text-gray-400">Before</div>
          <div class="aspect-video flex items-center justify-center">
            <canvas
              ref="beforeCanvasRef"
              :class="{ 'hidden': !media }"
              class="max-w-full max-h-full object-contain"
            />
            <p v-if="!media" class="text-gray-500 text-sm">No image loaded</p>
          </div>
        </div>

        <!-- After -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div class="px-3 py-2 border-b border-gray-700 text-xs text-gray-400">After (Flattened)</div>
          <div class="aspect-video flex items-center justify-center">
            <canvas
              ref="afterCanvasRef"
              :class="{ 'hidden': !media }"
              class="max-w-full max-h-full object-contain"
            />
            <p v-if="!media" class="text-gray-500 text-sm">-</p>
          </div>
        </div>
      </div>

      <!-- Luminance Profile -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h2 class="text-sm text-gray-400 font-medium mb-3">Luminance Profile (Oklab)</h2>
        <LuminanceProfilePanel
          :profile="luminanceProfile"
          :fit-type="luminanceFitType"
          :extraction-time="luminanceExtractionTime"
          :is-extracting="isLuminanceExtracting"
          @update:fit-type="luminanceFitType = $event"
        />
      </div>
    </div>
  </div>
</template>
