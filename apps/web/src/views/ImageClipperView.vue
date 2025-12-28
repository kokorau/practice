<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useMedia, useMediaCanvasWebGL } from '../composables/Media'
import { photoRepository } from '../modules/Photo/Infra/photoRepository'
import { createDefaultPhotoUseCase } from '../modules/Photo/Application/createDefaultPhotoUseCase'
import { loadUnsplashPhoto } from '../modules/PhotoUnsplash/Application/loadUnsplashPhoto'
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import { $Media } from '../modules/Media'
import ClipperWorker from '../workers/clipperPipeline.worker?worker'
import type { PipelineInput, PipelineOutput } from '../workers/clipperPipeline.worker'

// ============================================
// Pipeline Types
// ============================================
type PipelineStage = {
  id: string
  name: string
  enabled: boolean
}

// パイプライン適用順に定義
type PipelineParams = {
  erode: { radius: number }           // 1. マスク収縮
  feather: { radius: number }         // 2. エッジぼかし
  decontaminate: {                    // 3. 色汚染除去
    edgeLow: number
    edgeHigh: number
    searchRadius: number
  }
  hairRefine: { opacity: number }     // 4. 髪透明度調整
  applyAlpha: Record<string, never>   // 5. アルファ適用
}

// ============================================
// Pipeline State
// ============================================
// パイプライン適用順
const stages = reactive<PipelineStage[]>([
  { id: 'erode', name: '1. Erode', enabled: true },
  { id: 'feather', name: '2. Feather', enabled: false },
  { id: 'decontaminate', name: '3. Decontaminate', enabled: true },
  { id: 'hairRefine', name: '4. Hair Refine', enabled: false },
  { id: 'applyAlpha', name: '5. Apply Alpha', enabled: true },
])

const params = reactive<PipelineParams>({
  erode: { radius: 1 },
  feather: { radius: 2 },
  decontaminate: {
    edgeLow: 0.2,
    edgeHigh: 0.8,
    searchRadius: 3,
  },
  hairRefine: { opacity: 0.8 },
  applyAlpha: {},
})

const toggleStage = (id: string) => {
  const stage = stages.find(s => s.id === id)
  if (stage) stage.enabled = !stage.enabled
}

// ============================================
// Web Worker
// ============================================
let worker: Worker | null = null

const initWorker = () => {
  worker = new ClipperWorker()
}

onUnmounted(() => {
  worker?.terminate()
})

// 処理時間
const processingTime = ref<number | null>(null)
const segmentationTime = ref<number | null>(null)

// ============================================
// Media
// ============================================
const { media, loadPhoto, setPhoto, error: mediaError } = useMedia()

// Unsplash
const isLoadingUnsplash = ref(false)
const handleLoadUnsplash = async () => {
  isLoadingUnsplash.value = true
  try {
    await loadUnsplashPhoto({ query: 'portrait' })
    const loadedPhoto = photoRepository.get()
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

// ============================================
// ImageSegmenter (2モデル: Selfie + Multiclass)
// ============================================
let selfieSegmenter: ImageSegmenter | null = null
let multiclassSegmenter: ImageSegmenter | null = null
const isSegmenterReady = ref(false)
const isSegmenting = ref(false)
const segmentError = ref<string | null>(null)

const initSegmenter = async () => {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )

    // 並列で両モデルを初期化
    const [selfie, multiclass] = await Promise.all([
      ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
        },
        outputCategoryMask: false,
        outputConfidenceMasks: true,
        runningMode: 'IMAGE',
      }),
      ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
        },
        outputCategoryMask: true,
        outputConfidenceMasks: false,
        runningMode: 'IMAGE',
      }),
    ])

    selfieSegmenter = selfie
    multiclassSegmenter = multiclass
    isSegmenterReady.value = true
  } catch (e) {
    segmentError.value = e instanceof Error ? e.message : 'Failed to init segmenter'
  }
}

// ============================================
// Main Pipeline Execution
// ============================================
const runPipeline = async () => {
  if (!selfieSegmenter || !multiclassSegmenter || !media.value || !resultCanvasRef.value || !worker) return

  const photo = $Media.getPhoto(media.value)
  if (!photo) return

  isSegmenting.value = true
  segmentError.value = null
  processingTime.value = null
  segmentationTime.value = null

  try {
    const { imageData } = photo
    const { width, height } = imageData

    // ImageBitmap作成
    const imageBitmap = await createImageBitmap(imageData)

    // セグメンテーション実行（両モデル）
    const segStartTime = performance.now()

    // Selfie用キャンバス
    const selfieCanvas = new OffscreenCanvas(width, height)
    const selfieCtx = selfieCanvas.getContext('2d')!
    selfieCtx.drawImage(imageBitmap, 0, 0)

    // Multiclass用キャンバス（256x256にリサイズ）
    const multiclassCanvas = new OffscreenCanvas(256, 256)
    const multiclassCtx = multiclassCanvas.getContext('2d')!
    multiclassCtx.drawImage(imageBitmap, 0, 0, 256, 256)

    // 両モデルを実行
    const selfieResult = selfieSegmenter.segment(selfieCanvas as unknown as HTMLCanvasElement)
    const multiclassResult = multiclassSegmenter.segment(multiclassCanvas as unknown as HTMLCanvasElement)

    // Selfie: confidence mask
    const confidenceMasks = selfieResult.confidenceMasks
    if (!confidenceMasks || confidenceMasks.length === 0) {
      segmentError.value = 'No confidence mask returned'
      return
    }

    // Multiclass: category mask (髪 = 1)
    const categoryMask = multiclassResult.categoryMask
    if (!categoryMask) {
      segmentError.value = 'No category mask returned'
      return
    }

    segmentationTime.value = performance.now() - segStartTime

    // マスクを取得
    const personMask = confidenceMasks[0]!.getAsFloat32Array()
    const categoryData = categoryMask.getAsUint8Array()

    // 髪マスクを元画像サイズにスケールアップ
    const hairMask = new Float32Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = Math.floor((x / width) * 256)
        const srcY = Math.floor((y / height) * 256)
        const srcIdx = srcY * 256 + srcX
        // カテゴリ1 = 髪
        hairMask[y * width + x] = categoryData[srcIdx] === 1 ? 1.0 : 0.0
      }
    }

    // キャンバス準備
    const canvas = resultCanvasRef.value
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(imageBitmap, 0, 0)

    const outputData = ctx.getImageData(0, 0, width, height)
    const pixels = new Uint8ClampedArray(outputData.data)

    // Worker にパイプライン処理を依頼
    const getStageEnabled = (id: string) => stages.find(s => s.id === id)?.enabled ?? false

    const input: PipelineInput = {
      mask: personMask,
      hairMask,
      pixels,
      width,
      height,
      params: {
        erode: {
          radius: params.erode.radius,
          enabled: getStageEnabled('erode'),
        },
        feather: {
          radius: params.feather.radius,
          enabled: getStageEnabled('feather'),
        },
        decontaminate: {
          edgeLow: params.decontaminate.edgeLow,
          edgeHigh: params.decontaminate.edgeHigh,
          searchRadius: params.decontaminate.searchRadius,
          enabled: getStageEnabled('decontaminate'),
        },
        hairRefine: {
          opacity: params.hairRefine.opacity,
          enabled: getStageEnabled('hairRefine'),
        },
        applyAlpha: {
          enabled: getStageEnabled('applyAlpha'),
        },
      },
    }

    // Worker に送信（Transferable で高速化）
    const workerResult = await new Promise<PipelineOutput>((resolve) => {
      worker!.onmessage = (e: MessageEvent<PipelineOutput>) => {
        resolve(e.data)
      }
      worker!.postMessage(input, [personMask.buffer, hairMask.buffer, pixels.buffer])
    })

    processingTime.value = workerResult.duration

    // 結果を描画
    const finalData = new ImageData(workerResult.pixels, width, height)
    ctx.putImageData(finalData, 0, 0)

    // リソース解放
    confidenceMasks.forEach(m => m.close())
    categoryMask.close()
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

// 画像が変わったらパイプライン実行
watch(media, () => {
  if (media.value && isSegmenterReady.value) {
    runPipeline()
  }
})

// パラメータやステージが変わったら自動実行
watch(
  [() => JSON.stringify(stages), () => JSON.stringify(params)],
  () => {
    if (media.value && isSegmenterReady.value && !isSegmenting.value) {
      runPipeline()
    }
  }
)

// 初期化
onMounted(async () => {
  initWorker()
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

          <!-- Status -->
          <section>
            <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Status</h2>
            <div class="text-[11px] text-gray-500 space-y-1">
              <div v-if="!isSegmenterReady" class="text-yellow-500">Loading model...</div>
              <div v-else-if="isSegmenting" class="text-blue-400 flex items-center gap-2">
                <svg class="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
              <div v-else class="text-green-500">Ready</div>
              <div v-if="segmentationTime !== null" class="flex justify-between">
                <span>Segmentation</span>
                <span class="font-mono">{{ segmentationTime.toFixed(0) }}ms</span>
              </div>
              <div v-if="processingTime !== null" class="flex justify-between">
                <span>Post-process</span>
                <span class="font-mono">{{ processingTime.toFixed(0) }}ms</span>
              </div>
              <div v-if="segmentationTime !== null && processingTime !== null" class="flex justify-between font-medium text-gray-400">
                <span>Total</span>
                <span class="font-mono">{{ (segmentationTime + processingTime).toFixed(0) }}ms</span>
              </div>
            </div>
          </section>

          <!-- Stages -->
          <section>
            <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Stages</h2>
            <div class="space-y-3">
              <!-- Stage items dynamically rendered -->
              <div v-for="stage in stages" :key="stage.id" class="space-y-1">
                <button
                  @click="toggleStage(stage.id)"
                  class="flex items-center gap-2 text-xs"
                  :class="stage.enabled ? 'text-gray-200' : 'text-gray-500'"
                >
                  <span class="w-3 h-3 rounded border flex items-center justify-center"
                    :class="stage.enabled ? 'border-blue-500 bg-blue-500' : 'border-gray-600'">
                    <span v-if="stage.enabled" class="text-[8px]">✓</span>
                  </span>
                  {{ stage.name }}
                </button>

                <!-- Erode params -->
                <div v-if="stage.id === 'erode' && stage.enabled" class="pl-5 space-y-1">
                  <label class="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Radius</span>
                    <input type="number" v-model.number="params.erode.radius" min="0" max="10" step="1"
                      class="w-16 px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300 text-right" />
                  </label>
                </div>

                <!-- Feather params -->
                <div v-if="stage.id === 'feather' && stage.enabled" class="pl-5 space-y-1">
                  <label class="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Radius</span>
                    <input type="number" v-model.number="params.feather.radius" min="1" max="10" step="1"
                      class="w-16 px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300 text-right" />
                  </label>
                </div>

                <!-- Decontaminate params -->
                <div v-if="stage.id === 'decontaminate' && stage.enabled" class="pl-5 space-y-1">
                  <label class="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Edge Low</span>
                    <input type="number" v-model.number="params.decontaminate.edgeLow" min="0" max="1" step="0.05"
                      class="w-16 px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300 text-right" />
                  </label>
                  <label class="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Edge High</span>
                    <input type="number" v-model.number="params.decontaminate.edgeHigh" min="0" max="1" step="0.05"
                      class="w-16 px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300 text-right" />
                  </label>
                  <label class="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Search Radius</span>
                    <input type="number" v-model.number="params.decontaminate.searchRadius" min="1" max="20" step="1"
                      class="w-16 px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300 text-right" />
                  </label>
                </div>

                <!-- Hair Refine params -->
                <div v-if="stage.id === 'hairRefine' && stage.enabled" class="pl-5 space-y-1">
                  <label class="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Opacity</span>
                    <input type="number" v-model.number="params.hairRefine.opacity" min="0" max="1" step="0.1"
                      class="w-16 px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300 text-right" />
                  </label>
                </div>
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
