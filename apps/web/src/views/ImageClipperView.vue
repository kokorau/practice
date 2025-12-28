<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useMedia, useMediaCanvasWebGL } from '../composables/Media'
import { photoRepository } from '../modules/Photo/Infra/photoRepository'
import { createDefaultPhotoUseCase } from '../modules/Photo/Application/createDefaultPhotoUseCase'
import { loadUnsplashPhoto } from '../modules/PhotoUnsplash/Application/loadUnsplashPhoto'
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import { $Media } from '../modules/Media'

// Media
const { media, loadPhoto, setPhoto, error: mediaError } = useMedia()

// Unsplash
const isLoadingUnsplash = ref(false)
const handleLoadUnsplash = async () => {
  console.log('[Unsplash] Loading...')
  isLoadingUnsplash.value = true
  try {
    await loadUnsplashPhoto({ query: 'portrait' })
    const loadedPhoto = photoRepository.get()
    console.log('[Unsplash] Loaded:', loadedPhoto)
    if (loadedPhoto) {
      setPhoto(loadedPhoto)
    }
  } catch (e) {
    console.error('[Unsplash] Error:', e)
  } finally {
    isLoadingUnsplash.value = false
  }
}

// Canvas描画 (Before)
const { canvasRef: originalCanvasRef } = useMediaCanvasWebGL(media)

// After Canvas (手動描画)
const resultCanvasRef = ref<HTMLCanvasElement | null>(null)

// ImageSegmenter
let imageSegmenter: ImageSegmenter | null = null
const isSegmenterReady = ref(false)
const isSegmenting = ref(false)
const segmentError = ref<string | null>(null)

// Segmenter 初期化
const initSegmenter = async () => {
  console.log('[Segmenter] Initializing...')
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )
    console.log('[Segmenter] FilesetResolver ready')
    imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
      },
      outputCategoryMask: true,
      outputConfidenceMasks: false,
      runningMode: 'IMAGE',
    })
    console.log('[Segmenter] Model loaded')
    isSegmenterReady.value = true
  } catch (e) {
    console.error('[Segmenter] Init failed:', e)
    segmentError.value = e instanceof Error ? e.message : 'Failed to init segmenter'
  }
}

// セグメンテーション実行
const runSegmentation = async () => {
  console.log('[Segmentation] Starting...', {
    hasSegmenter: !!imageSegmenter,
    hasMedia: !!media.value,
    hasCanvas: !!resultCanvasRef.value,
  })
  if (!imageSegmenter || !media.value || !resultCanvasRef.value) return

  const photo = $Media.getPhoto(media.value)
  console.log('[Segmentation] Photo:', photo)
  if (!photo) return

  isSegmenting.value = true
  segmentError.value = null

  try {
    console.log('[Segmentation] Processing...')
    // 元画像のImageDataを取得
    const { imageData } = photo
    const { width, height } = imageData

    // ImageDataからImageBitmapを作成
    const imageBitmap = await createImageBitmap(imageData)

    // オフスクリーンCanvasに描画してセグメンテーション
    const offscreen = new OffscreenCanvas(width, height)
    const offCtx = offscreen.getContext('2d')!
    offCtx.drawImage(imageBitmap, 0, 0)

    // セグメンテーション実行
    const result = imageSegmenter.segment(offscreen as unknown as HTMLCanvasElement)

    // マスクを取得
    const mask = result.categoryMask
    if (!mask) {
      segmentError.value = 'No mask returned'
      return
    }

    // 結果をAfterキャンバスに描画
    const canvas = resultCanvasRef.value
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    // 元画像を描画
    ctx.drawImage(imageBitmap, 0, 0)

    // マスクを適用（人物以外を透明に）
    const outputData = ctx.getImageData(0, 0, width, height)
    const maskData = mask.getAsUint8Array()

    for (let i = 0; i < maskData.length; i++) {
      // Selfie Segmenter: 0 = 人物, 非0 = 背景
      if (maskData[i] !== 0) {
        outputData.data[i * 4 + 3] = 0 // 背景を透明に
      }
    }

    ctx.putImageData(outputData, 0, 0)

    // リソース解放
    mask.close()
    imageBitmap.close()
  } catch (e) {
    segmentError.value = e instanceof Error ? e.message : 'Segmentation failed'
  } finally {
    isSegmenting.value = false
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

// 画像が変わったらセグメンテーション実行
watch(media, () => {
  if (media.value && isSegmenterReady.value) {
    runSegmentation()
  }
})

// 初期化
onMounted(async () => {
  await initSegmenter()

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
          <p class="text-xl font-bold font-medium text-gray-400">Image Clipper</p>
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

          <!-- Segmentation -->
          <section>
            <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Segmentation</h2>
            <div class="space-y-2">
              <button
                @click="runSegmentation"
                :disabled="!isSegmenterReady || isSegmenting || !media"
                class="w-full py-1.5 px-3 rounded text-xs bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ isSegmenting ? 'Processing...' : 'Run Segmentation' }}
              </button>
              <div class="text-[11px] text-gray-500">
                <span v-if="!isSegmenterReady" class="text-yellow-500">Loading model...</span>
                <span v-else class="text-green-500">Model ready</span>
              </div>
            </div>
          </section>

          <p v-if="mediaError" class="text-xs text-red-400">{{ mediaError }}</p>
          <p v-if="segmentError" class="text-xs text-red-400">{{ segmentError }}</p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex min-w-0 p-6 gap-5 overflow-auto">
        <!-- Before -->
        <section class="flex-1">
          <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Before</h2>
          <div class="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-800" style="aspect-ratio: 3/2;">
            <canvas
              ref="originalCanvasRef"
              :class="{ 'opacity-0': !media }"
              class="absolute inset-0 w-full h-full object-contain"
            />
            <p v-if="!media" class="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
              No image
            </p>
          </div>
        </section>

        <!-- After -->
        <section class="flex-1">
          <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">After</h2>
          <div class="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-800" style="aspect-ratio: 3/2;">
            <canvas
              ref="resultCanvasRef"
              :class="{ 'opacity-0': !media }"
              class="absolute inset-0 w-full h-full object-contain"
            />
            <p v-if="!media" class="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
              No image
            </p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
