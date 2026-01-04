<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useMedia } from '../composables/Media'
import { $Media } from '../modules/Media'
import { photoRepository } from '../modules/Photo/Infra/photoRepository'
import { createDefaultPhotoUseCase } from '../modules/Photo/Application/createDefaultPhotoUseCase'
import { loadUnsplashPhoto } from '../modules/PhotoUnsplash/Application/loadUnsplashPhoto'

// 仮想キャンバスサイズ
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 360

// Media
const { media, loadPhoto, setPhoto, error: mediaError } = useMedia()

// Node A: Source Image
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Node B: APCA Luminance Map
const luminanceCanvasRef = ref<HTMLCanvasElement | null>(null)

// Node C: Text Layer
const textContent = ref('Hello World')
type VerticalAlign = 'top' | 'center' | 'bottom'
type HorizontalAlign = 'left' | 'center' | 'right'
const verticalAlign = ref<VerticalAlign>('center')
const horizontalAlign = ref<HorizontalAlign>('center')

// object-fit: cover的な描画のためのパラメータ計算
function calcCoverRect(srcW: number, srcH: number, dstW: number, dstH: number) {
  const srcAspect = srcW / srcH
  const dstAspect = dstW / dstH

  let sx: number, sy: number, sw: number, sh: number

  if (srcAspect > dstAspect) {
    // ソースが横長 → 左右をクロップ
    sh = srcH
    sw = srcH * dstAspect
    sx = (srcW - sw) / 2
    sy = 0
  } else {
    // ソースが縦長 → 上下をクロップ
    sw = srcW
    sh = srcW / dstAspect
    sx = 0
    sy = (srcH - sh) / 2
  }

  return { sx, sy, sw, sh }
}

// Node A: ソース画像を描画
function renderSourceImage() {
  if (!media.value || !canvasRef.value) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const sourceImageData = $Media.getImageData(media.value)
  if (!sourceImageData) return

  // 固定サイズに設定
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  // オフスクリーンcanvasで元画像を復元
  const offscreen = new OffscreenCanvas(sourceImageData.width, sourceImageData.height)
  const offCtx = offscreen.getContext('2d')
  if (!offCtx) return
  offCtx.putImageData(sourceImageData, 0, 0)

  // cover描画
  const { sx, sy, sw, sh } = calcCoverRect(
    sourceImageData.width, sourceImageData.height,
    CANVAS_WIDTH, CANVAS_HEIGHT
  )
  ctx.drawImage(offscreen, sx, sy, sw, sh, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

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

  // 固定サイズに設定
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  // cover描画のパラメータ計算
  const { sx, sy, sw, sh } = calcCoverRect(
    sourceImageData.width, sourceImageData.height,
    CANVAS_WIDTH, CANVAS_HEIGHT
  )

  // 切り出し範囲のImageDataを作成
  const croppedImageData = new ImageData(CANVAS_WIDTH, CANVAS_HEIGHT)
  const srcData = sourceImageData.data
  const dstData = croppedImageData.data
  const srcW = sourceImageData.width

  for (let dy = 0; dy < CANVAS_HEIGHT; dy++) {
    for (let dx = 0; dx < CANVAS_WIDTH; dx++) {
      // ソース座標を計算
      const srcX = Math.floor(sx + (dx / CANVAS_WIDTH) * sw)
      const srcY = Math.floor(sy + (dy / CANVAS_HEIGHT) * sh)
      const srcIdx = (srcY * srcW + srcX) * 4
      const dstIdx = (dy * CANVAS_WIDTH + dx) * 4

      const r = srcData[srcIdx]!
      const g = srcData[srcIdx + 1]!
      const b = srcData[srcIdx + 2]!
      const a = srcData[srcIdx + 3]!

      // APCA輝度 (0-1)
      const y = calcApcaLuminance(r, g, b)
      const gray = Math.round(y * 255)

      dstData[dstIdx] = gray
      dstData[dstIdx + 1] = gray
      dstData[dstIdx + 2] = gray
      dstData[dstIdx + 3] = a
    }
  }

  ctx.putImageData(croppedImageData, 0, 0)
}

// mediaまたはcanvasが変更されたら描画を更新
watch([media, canvasRef, luminanceCanvasRef], async () => {
  await nextTick()
  renderSourceImage()
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

          <!-- Text Layer -->
          <section>
            <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Text Layer</h2>
            <div class="space-y-3">
              <!-- Text Input -->
              <input
                v-model="textContent"
                type="text"
                placeholder="Enter text..."
                class="w-full py-1.5 px-3 rounded text-xs bg-gray-800 text-gray-300 border border-gray-700 focus:border-gray-500 focus:outline-none"
              />

              <!-- Position Grid -->
              <div class="position-grid">
                <button
                  v-for="pos in [
                    { v: 'top', h: 'left' },
                    { v: 'top', h: 'center' },
                    { v: 'top', h: 'right' },
                    { v: 'center', h: 'left' },
                    { v: 'center', h: 'center' },
                    { v: 'center', h: 'right' },
                    { v: 'bottom', h: 'left' },
                    { v: 'bottom', h: 'center' },
                    { v: 'bottom', h: 'right' },
                  ]"
                  :key="`${pos.v}-${pos.h}`"
                  @click="verticalAlign = pos.v as VerticalAlign; horizontalAlign = pos.h as HorizontalAlign"
                  class="position-grid-cell"
                  :class="verticalAlign === pos.v && horizontalAlign === pos.h
                    ? 'active'
                    : ''"
                >
                </button>
              </div>
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
                class="node-canvas"
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
                class="node-canvas"
              />
              <p v-if="!media" class="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                No image
              </p>
            </div>
          </div>

          <!-- Node C: Text Overlay -->
          <div class="node-wrapper">
            <div class="node-title">
              <span class="node-badge">C</span>
              <span class="node-title-text">Text Layer</span>
              <span class="node-badge-offset"></span>
            </div>
            <div class="node-preview">
              <div
                class="text-layer"
                :class="[`align-v-${verticalAlign}`, `align-h-${horizontalAlign}`]"
              >
                <h1 class="text-layer-title">{{ textContent }}</h1>
              </div>
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
  /* 表示サイズ: 640 * 0.625 = 400, 360 * 0.625 = 225 */
  width: 400px;
  height: 225px;
}

.node-canvas {
  /* 仮想サイズ640x360をscaleで縮小表示 */
  width: 640px;
  height: 360px;
  transform: scale(0.625);
  transform-origin: top left;
}

/* Position Grid */
.position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.position-grid-cell {
  aspect-ratio: 1;
  border-radius: 4px;
  background: #374151;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s;
}

.position-grid-cell:hover {
  background: #4b5563;
}

.position-grid-cell.active {
  background: #0891b2;
}

/* Text Layer */
.text-layer {
  /* 仮想サイズ640x360をscaleで縮小表示 */
  width: 640px;
  height: 360px;
  transform: scale(0.625);
  transform-origin: top left;
  background: transparent;
  padding: 32px;
  display: flex;
  color: white;
}

/* Vertical alignment */
.text-layer.align-v-top {
  align-items: flex-start;
}

.text-layer.align-v-center {
  align-items: center;
}

.text-layer.align-v-bottom {
  align-items: flex-end;
}

/* Horizontal alignment */
.text-layer.align-h-left {
  justify-content: flex-start;
}

.text-layer.align-h-center {
  justify-content: center;
}

.text-layer.align-h-right {
  justify-content: flex-end;
}

.text-layer-title {
  font-size: 48px;
  font-weight: 700;
  margin: 0;
}
</style>
