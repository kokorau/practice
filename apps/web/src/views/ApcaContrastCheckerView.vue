<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useMedia, useMediaCanvasWebGL } from '../composables/Media'
import { $Media } from '../modules/Media'
import { photoRepository } from '../modules/Photo/Infra/photoRepository'
import { createDefaultPhotoUseCase } from '../modules/Photo/Application/createDefaultPhotoUseCase'
import { loadUnsplashPhoto } from '../modules/PhotoUnsplash/Application/loadUnsplashPhoto'

// Media
const { media, loadPhoto, setPhoto, error: mediaError } = useMedia()

// Canvas描画 (Node A: Source Image)
const { canvasRef } = useMediaCanvasWebGL(media)

// Node B: APCA Luminance Map
const luminanceCanvasRef = ref<HTMLCanvasElement | null>(null)

// sRGB to Linear RGB (gamma expansion)
function sRGBtoLinear(val: number): number {
  return val <= 0.04045
    ? val / 12.92
    : Math.pow((val + 0.055) / 1.055, 2.4)
}

// APCA Luminance (Y) calculation
// Y = 0.2126729 * R + 0.7151522 * G + 0.0721750 * B
function calcApcaLuminance(r: number, g: number, b: number): number {
  const rLin = sRGBtoLinear(r / 255)
  const gLin = sRGBtoLinear(g / 255)
  const bLin = sRGBtoLinear(b / 255)
  return 0.2126729 * rLin + 0.7151522 * gLin + 0.0721750 * bLin
}

// 輝度マップを描画
function renderLuminanceMap() {
  if (!media.value || !luminanceCanvasRef.value) return

  const canvas = luminanceCanvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Media から ImageData を取得
  const sourceImageData = $Media.getImageData(media.value)
  if (!sourceImageData) return

  canvas.width = sourceImageData.width
  canvas.height = sourceImageData.height

  // ImageData をコピーして加工
  const imageData = new ImageData(
    new Uint8ClampedArray(sourceImageData.data),
    sourceImageData.width,
    sourceImageData.height
  )
  const data = imageData.data

  // 各ピクセルのAPCA輝度を計算して白黒に変換
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!

    // APCA輝度 (0-1)
    const y = calcApcaLuminance(r, g, b)

    // 0-255に変換して白黒で表示
    const gray = Math.round(y * 255)
    data[i] = gray     // R
    data[i + 1] = gray // G
    data[i + 2] = gray // B
    // Alpha は変更しない
  }

  ctx.putImageData(imageData, 0, 0)
}

// mediaまたはcanvasが変更されたら輝度マップを更新
watch([media, luminanceCanvasRef], async () => {
  await nextTick()
  renderLuminanceMap()
})

// Unsplash
const isLoadingUnsplash = ref(false)
const handleLoadUnsplash = async () => {
  isLoadingUnsplash.value = true
  try {
    await loadUnsplashPhoto()
    const loadedPhoto = photoRepository.get()
    if (loadedPhoto) {
      setPhoto(loadedPhoto)
    }
  } finally {
    isLoadingUnsplash.value = false
  }
}

// ファイル入力ハンドラ
const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    await loadPhoto(file)
  }
}

// 初期化
onMounted(() => {
  const existingPhoto = photoRepository.get()
  if (existingPhoto && !media.value) {
    setPhoto(existingPhoto)
  } else if (!media.value) {
    const defaultPhoto = createDefaultPhotoUseCase()
    photoRepository.set(defaultPhoto)
    setPhoto(defaultPhoto)
  }
})
</script>

<template>
  <div class="h-screen bg-gray-950 text-white flex justify-center">
    <div class="flex w-[1400px] max-w-full">
      <!-- Left Panel: Controls -->
      <div class="w-64 flex-shrink-0 bg-gray-900 flex flex-col">
        <div class="p-3">
          <p class="text-xl font-bold text-gray-400">APCA Contrast</p>
        </div>

        <div class="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
          <!-- Image Source -->
          <section>
            <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Source</h2>
            <div class="space-y-2">
              <button
                @click="handleLoadUnsplash"
                :disabled="isLoadingUnsplash"
                class="w-full py-1.5 px-3 rounded text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {{ isLoadingUnsplash ? 'Loading...' : 'Random Photo' }}
              </button>
              <label class="block w-full py-1.5 px-3 rounded text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 cursor-pointer text-center transition-colors">
                Choose File
                <input type="file" accept="image/*" @change="handleFileChange" class="hidden" />
              </label>
            </div>
          </section>

          <!-- Error -->
          <p v-if="mediaError" class="text-xs text-red-400">{{ mediaError }}</p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col min-w-0 p-6 gap-6 overflow-auto">
        <!-- Node Row -->
        <div class="node-row">
          <!-- Node A: Source Image -->
          <div class="node-wrapper">
            <div class="node-title">
              <span class="node-badge">A</span>
              <span class="node-title-text">Source Image</span>
              <span class="node-badge-offset"></span>
            </div>
            <div class="node-preview">
              <canvas
                ref="canvasRef"
                :class="{ 'opacity-0': !media }"
                class="node-canvas-cover"
              />
              <p v-if="!media" class="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                No image
              </p>
            </div>
          </div>

          <!-- Node B: APCA Luminance -->
          <div class="node-wrapper">
            <div class="node-title">
              <span class="node-badge">B</span>
              <span class="node-title-text">APCA Luminance (Y)</span>
              <span class="node-badge-offset"></span>
            </div>
            <div class="node-preview">
              <canvas
                ref="luminanceCanvasRef"
                :class="{ 'opacity-0': !media }"
                class="node-canvas-cover"
              />
              <p v-if="!media" class="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                No image
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node-row {
  display: flex;
  gap: 2rem;
  justify-content: center;
  flex-wrap: wrap;
}

.node-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.node-title {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: 0.5rem;
}

.node-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  background: #4ecdc4;
  color: #1a1a2e;
  font-size: 0.625rem;
  font-weight: 700;
  border-radius: 0.25rem;
  flex-shrink: 0;
}

.node-title-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}

.node-badge-offset {
  width: 1.25rem;
  flex-shrink: 0;
}

.node-preview {
  position: relative;
  background: #1e1e3a;
  border: 1px solid #3a3a5a;
  border-radius: 0.5rem;
  overflow: hidden;
  width: 400px;
  aspect-ratio: 16/9;
}

.node-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.node-canvas-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
