<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMedia, useMediaCanvasWebGL, useMediaAnalysis } from '../composables/Media'
import { photoRepository } from '../modules/Photo/Infra/photoRepository'
import { createDefaultPhotoUseCase } from '../modules/Photo/Application/createDefaultPhotoUseCase'
import { loadUnsplashPhoto } from '../modules/PhotoUnsplash/Application/loadUnsplashPhoto'
import { $ColorCorrection } from '../modules/Photo/Domain/ValueObject/ColorCorrection'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'
import {
  type Preset,
  type Pipeline,
  type Stage,
  $Pipeline,
  $Stage,
  $Adjustment,
  $Lut1D,
  $Preset,
  $Filter,
  $ExposureCorrection,
  type LuminanceStats,
  type ExposureCorrectionResult,
} from '../modules/Filter/Domain'
import HistogramCanvas from '../components/HistogramCanvas.vue'

// Media
const { media, loadPhoto, setPhoto, error: mediaError } = useMedia()

// Unsplash
const isLoadingUnsplash = ref(false)
const handleLoadUnsplash = async () => {
  isLoadingUnsplash.value = true
  try {
    await loadUnsplashPhoto()
    const loadedPhoto = photoRepository.get()
    if (loadedPhoto) {
      resetAll()
      setPhoto(loadedPhoto)
    }
  } finally {
    isLoadingUnsplash.value = false
  }
}

// プリセット一覧
const PRESETS = getPresets()

// パイプライン: void_input -> lut -> void_output の固定構造
const createInitialPipeline = (): Pipeline => ({
  stages: [
    $Stage.create('void_input', 'Input', $Lut1D.identity()),
    $Stage.create('lut', 'LUT', $Lut1D.identity()),
    $Stage.create('void_output', 'Output', $Lut1D.identity()),
  ],
})

const pipeline = ref<Pipeline>(createInitialPipeline())

// 各ステージのLUT（中間結果用）
const afterVoidInputLut = computed(() =>
  $Pipeline.composeUpTo(pipeline.value, 'void_input')
)
const afterLutLut = computed(() =>
  $Pipeline.composeUpTo(pipeline.value, 'lut')
)
const composedLut = computed(() => $Pipeline.compose(pipeline.value))

// Canvas描画 - 各ステージ
const { canvasRef: originalCanvasRef } = useMediaCanvasWebGL(media)
const { canvasRef: afterVoidInputCanvasRef } = useMediaCanvasWebGL(media, {
  lut: afterVoidInputLut,
})
const { canvasRef: afterLutCanvasRef } = useMediaCanvasWebGL(media, {
  lut: afterLutLut,
})
const { canvasRef: outputCanvasRef } = useMediaCanvasWebGL(media, {
  lut: composedLut,
})

// Analysis - 各ステージ
const { analysis: originalAnalysis } = useMediaAnalysis(media, { sampleRate: 5 })
const { analysis: afterVoidInputAnalysis } = useMediaAnalysis(media, { lut: afterVoidInputLut, sampleRate: 5 })
const { analysis: afterLutAnalysis } = useMediaAnalysis(media, { lut: afterLutLut, sampleRate: 5 })
const { analysis: outputAnalysis } = useMediaAnalysis(media, { lut: composedLut, sampleRate: 5 })

// 露出補正: ヒストグラムから統計を計算
const exposureStats = computed<LuminanceStats | null>(() => {
  if (!originalAnalysis.value) return null
  return $ExposureCorrection.computeStats(originalAnalysis.value.histogram.luminance)
})

// 露出補正結果
const exposureResult = computed<ExposureCorrectionResult | null>(() => {
  if (!exposureStats.value) return null
  return $ExposureCorrection.compute(exposureStats.value)
})

// 露出補正が有効か
const isExposureCorrectionEnabled = ref(true)

// 選択中のプリセット
const selectedPresetId = computed(() => {
  const lutStage = pipeline.value.stages.find(s => s.id === 'lut')
  return (lutStage as Stage & { presetId?: string })?.presetId ?? null
})

// ファイル入力ハンドラ
const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    resetAll()
    await loadPhoto(file)
  }
}

// ステージのLUTを更新
const updateStageLut = (stageId: string, lut: ReturnType<typeof $Lut1D.identity>, name?: string) => {
  pipeline.value = $Pipeline.updateStage(pipeline.value, stageId, {
    lut,
    ...(name ? { name } : {}),
  })
}

// プリセットを選択
const selectPreset = (presetId: string | null) => {
  if (!presetId) {
    updateStageLut('lut', $Lut1D.identity(), 'LUT')
    return
  }

  const preset = PRESETS.find(p => p.id === presetId)
  if (!preset) return

  const filter = $Preset.toFilter(preset, 7)
  const lut = preset.lut3d ?? $Filter.toLut(filter)

  pipeline.value = $Pipeline.updateStage(pipeline.value, 'lut', {
    name: preset.name,
    lut,
    presetId: preset.id,
  } as Partial<Stage & { presetId: string }>)
}

// 全てリセット
const resetAll = () => {
  pipeline.value = createInitialPipeline()
}

// 画像が変わったらリセット
watch(media, () => {
  resetAll()
})

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

// 露出補正を適用
const applyExposureCorrection = () => {
  if (!exposureResult.value || !isExposureCorrectionEnabled.value) {
    updateStageLut('void_input', $Lut1D.identity(), 'Input')
    return
  }
  const lut = $ExposureCorrection.toLut(exposureResult.value)
  updateStageLut('void_input', lut, 'Exposure')
}

// 露出補正結果が変わったら適用
watch([exposureResult, isExposureCorrectionEnabled], () => {
  applyExposureCorrection()
}, { immediate: true })

// 露出補正のトグル
const toggleExposureCorrection = () => {
  isExposureCorrectionEnabled.value = !isExposureCorrectionEnabled.value
}
</script>

<template>
  <div class="h-screen bg-gray-950 text-white flex justify-center">
    <div class="flex w-[1400px] max-w-full">
    <!-- Left Panel: Controls -->
    <div class="w-64 flex-shrink-0 bg-gray-900 flex flex-col">
      <div class="p-3">
        <p class="text-xl font-bold font-medium text-gray-400">Auto Correction</p>
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

        <!-- Exposure Stats -->
        <section v-if="exposureStats">
          <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Exposure</h2>
          <div class="text-[11px] text-gray-500 space-y-1">
            <div class="flex justify-between">
              <span>Median (p50)</span>
              <span class="font-mono">{{ (exposureStats.p50 * 100).toFixed(0) }}%</span>
            </div>
            <div class="flex justify-between">
              <span>Range (p10-p90)</span>
              <span class="font-mono">{{ (exposureStats.p10 * 100).toFixed(0) }}-{{ (exposureStats.p90 * 100).toFixed(0) }}%</span>
            </div>
            <div v-if="exposureResult" class="flex justify-between">
              <span>EV Delta</span>
              <span class="font-mono">{{ exposureResult.evDelta > 0 ? '+' : '' }}{{ exposureResult.evDelta.toFixed(2) }} EV</span>
            </div>
            <div v-if="exposureResult" class="flex justify-between">
              <span>Gain</span>
              <span class="font-mono">{{ exposureResult.gain.toFixed(3) }}</span>
            </div>
          </div>
        </section>

        <p v-if="mediaError" class="text-xs text-red-400">{{ mediaError }}</p>
      </div>
    </div>

    <!-- Main Content: Vertical Pipeline -->
    <div class="flex-1 flex flex-col min-w-0 p-6 gap-5 overflow-auto">
      <!-- Stage: Original -->
      <section>
        <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Original</h2>
        <div class="flex gap-4 items-start">
          <div class="relative bg-gray-900 rounded-lg overflow-hidden flex-1 border border-gray-800" style="aspect-ratio: 3/2;">
            <canvas
              ref="originalCanvasRef"
              :class="{ 'opacity-0': !media }"
              class="absolute inset-0 w-full h-full object-contain"
            />
            <p v-if="!media" class="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
              No image
            </p>
          </div>
          <div v-if="originalAnalysis" class="flex-1 bg-gray-900 rounded-lg p-4 h-[200px]">
            <HistogramCanvas :data="originalAnalysis.histogram" :width="320" :height="160" class="w-full h-full" />
          </div>
        </div>
      </section>

      <!-- Stage: Exposure -->
      <section>
        <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Exposure</h2>
        <div class="flex items-center gap-3 mb-3">
          <button
            @click="toggleExposureCorrection"
            class="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors"
            :class="isExposureCorrectionEnabled
              ? 'border-gray-600 text-gray-200 hover:border-gray-500'
              : 'border-gray-700 text-gray-500 hover:border-gray-600'"
          >
            Exposure
            <span v-if="isExposureCorrectionEnabled" class="px-1.5 py-0.5 rounded bg-gray-700 text-[10px] text-gray-400">ON</span>
          </button>
          <span v-if="exposureResult && isExposureCorrectionEnabled" class="text-[11px] text-gray-500">
            {{ exposureResult.evDelta > 0 ? '+' : '' }}{{ exposureResult.appliedEvDelta.toFixed(2) }} EV
            (gain {{ exposureResult.gain.toFixed(2) }})
          </span>
          <span v-else class="text-[11px] text-gray-500">Identity LUT (no change)</span>
        </div>
        <div class="flex gap-4 items-start">
          <div class="relative bg-gray-900 rounded-lg overflow-hidden flex-1 border border-gray-800" style="aspect-ratio: 3/2;">
            <canvas
              ref="afterVoidInputCanvasRef"
              :class="{ 'opacity-0': !media }"
              class="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <div v-if="afterVoidInputAnalysis" class="flex-1 bg-gray-900 rounded-lg p-4 h-[200px]">
            <HistogramCanvas :data="afterVoidInputAnalysis.histogram" :width="320" :height="160" class="w-full h-full" />
          </div>
        </div>
      </section>

      <!-- Stage: LUT -->
      <section>
        <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">LUT</h2>
        <div class="flex items-center gap-3 mb-3">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors border-gray-700 text-gray-500">
            <select
              :value="selectedPresetId ?? ''"
              @change="selectPreset(($event.target as HTMLSelectElement).value || null)"
              class="bg-transparent border-none focus:outline-none cursor-pointer text-xs"
              :class="selectedPresetId ? 'text-gray-200' : 'text-gray-500'"
            >
              <option value="" class="bg-gray-900 text-gray-400">None</option>
              <optgroup label="Film" class="bg-gray-900">
                <option v-for="preset in PRESETS.filter(p => p.category === 'film')" :key="preset.id" :value="preset.id" class="bg-gray-900">
                  {{ preset.name }}
                </option>
              </optgroup>
              <optgroup label="Cinematic" class="bg-gray-900">
                <option v-for="preset in PRESETS.filter(p => p.category === 'cinematic')" :key="preset.id" :value="preset.id" class="bg-gray-900">
                  {{ preset.name }}
                </option>
              </optgroup>
              <optgroup label="Creative" class="bg-gray-900">
                <option v-for="preset in PRESETS.filter(p => p.category === 'creative')" :key="preset.id" :value="preset.id" class="bg-gray-900">
                  {{ preset.name }}
                </option>
              </optgroup>
            </select>
          </div>
        </div>
        <div class="flex gap-4 items-start">
          <div class="relative bg-gray-900 rounded-lg overflow-hidden flex-1 border border-gray-800" style="aspect-ratio: 3/2;">
            <canvas
              ref="afterLutCanvasRef"
              :class="{ 'opacity-0': !media }"
              class="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <div v-if="afterLutAnalysis" class="flex-1 bg-gray-900 rounded-lg p-4 h-[200px]">
            <HistogramCanvas :data="afterLutAnalysis.histogram" :width="320" :height="160" class="w-full h-full" />
          </div>
        </div>
      </section>

      <!-- Stage: Void Output -->
      <section>
        <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Void Output</h2>
        <div class="flex items-center gap-3 mb-3">
          <span class="text-[11px] text-gray-500">
            {{ pipeline.stages.map(s => s.name).join(' → ') }}
          </span>
        </div>
        <div class="flex gap-4 items-start">
          <div class="relative bg-gray-900 rounded-lg overflow-hidden flex-1 border border-gray-800" style="aspect-ratio: 3/2;">
            <canvas
              ref="outputCanvasRef"
              :class="{ 'opacity-0': !media }"
              class="absolute inset-0 w-full h-full object-contain"
            />
            <p v-if="!media" class="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
              -
            </p>
          </div>
          <div v-if="outputAnalysis" class="flex-1 bg-gray-900 rounded-lg p-4 h-[200px]">
            <HistogramCanvas :data="outputAnalysis.histogram" :width="320" :height="160" class="w-full h-full" />
          </div>
        </div>
      </section>
    </div>
    </div>
  </div>
</template>
