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

// パイプライン
const pipeline = ref<Pipeline>($Pipeline.empty())

// ノーマライズStageが存在するか
const hasNormalizeStage = computed(() =>
  pipeline.value.stages.some(s => s.id === 'normalize')
)

// LUT Stageが存在するか
const hasLutStage = computed(() =>
  pipeline.value.stages.some(s => s.id === 'lut')
)

// 合成されたLUT
const composedLut = computed(() => $Pipeline.compose(pipeline.value))

// 中間LUT（各ステージ適用後）
const normalizeLut = computed(() => {
  if (!hasNormalizeStage.value) return $Lut1D.identity()
  return $Pipeline.composeUpTo(pipeline.value, 'normalize')
})

// Canvas描画 - 各ステージ
const { canvasRef: originalCanvasRef } = useMediaCanvasWebGL(media)
const { canvasRef: afterNormalizeCanvasRef } = useMediaCanvasWebGL(media, {
  lut: normalizeLut,
})
const { canvasRef: afterFilterCanvasRef } = useMediaCanvasWebGL(media, {
  lut: composedLut,
})
const { canvasRef: outputCanvasRef } = useMediaCanvasWebGL(media, {
  lut: composedLut,
})

// Analysis - 各ステージ
const { analysis: originalAnalysis } = useMediaAnalysis(media, { sampleRate: 5 })
const { analysis: afterNormalizeAnalysis } = useMediaAnalysis(media, { lut: normalizeLut, sampleRate: 5 })
const { analysis: outputAnalysis } = useMediaAnalysis(media, { lut: composedLut, sampleRate: 5 })

// 推定された色調補正パラメータ
const colorGradingEstimate = computed(() => {
  if (!originalAnalysis.value) return null
  return $ColorCorrection.estimateFromStats(originalAnalysis.value.stats)
})

// ノーマライズパラメータ
const normalizationParams = computed(() => {
  if (!colorGradingEstimate.value) return null
  return $ColorCorrection.toNormalizationParams(colorGradingEstimate.value)
})

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

// ノーマライズStageを作成
const createNormalizeStage = (): Stage | null => {
  if (!normalizationParams.value) return null

  const params = normalizationParams.value
  // AdjustmentからLUTを生成
  const adjustment = {
    ...$Adjustment.identity(),
    temperature: params.temperature,
    tint: params.tint,
    brightness: params.brightness,
    contrast: params.contrast,
  }
  const lutRGB = $Adjustment.toLutFloatRGB(adjustment)
  const lut = $Lut1D.create(lutRGB.r, lutRGB.g, lutRGB.b)

  return $Stage.create('normalize', 'Normalize', lut)
}

// LUT Stageを作成
const createLutStage = (preset: Preset): Stage => {
  const filter = $Preset.toFilter(preset, 7)
  const lut = preset.lut3d ?? $Filter.toLut(filter)

  const stage = $Stage.create('lut', preset.name, lut)
  // presetIdを保持（UI用）
  return { ...stage, presetId: preset.id } as Stage & { presetId: string }
}

// ノーマライズを適用
const applyNormalization = () => {
  const stage = createNormalizeStage()
  if (!stage) return

  // 既存のnormalizeステージがあれば置換、なければ先頭に追加
  if (hasNormalizeStage.value) {
    pipeline.value = $Pipeline.updateStage(pipeline.value, 'normalize', {
      lut: stage.lut,
    })
  } else {
    // normalizeは常に最初
    pipeline.value = {
      stages: [stage, ...pipeline.value.stages],
    }
  }
}

// ノーマライズをリセット
const resetNormalization = () => {
  pipeline.value = $Pipeline.removeStage(pipeline.value, 'normalize')
}

// プリセットを選択
const selectPreset = (presetId: string | null) => {
  if (!presetId) {
    // LUTステージを削除
    pipeline.value = $Pipeline.removeStage(pipeline.value, 'lut')
    return
  }

  const preset = PRESETS.find(p => p.id === presetId)
  if (!preset) return

  const stage = createLutStage(preset)

  // 既存のlutステージがあれば置換、なければ末尾に追加
  if (hasLutStage.value) {
    pipeline.value = $Pipeline.updateStage(pipeline.value, 'lut', {
      name: stage.name,
      lut: stage.lut,
      presetId: preset.id,
    } as Partial<Stage & { presetId: string }>)
  } else {
    pipeline.value = $Pipeline.addStage(pipeline.value, stage)
  }
}

// 全てリセット
const resetAll = () => {
  pipeline.value = $Pipeline.empty()
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

// Normalizeをデフォルトでオンにする
watch(normalizationParams, (params) => {
  if (params && !hasNormalizeStage.value) {
    applyNormalization()
  }
}, { immediate: true })
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

        <!-- Detected Info -->
        <section v-if="colorGradingEstimate">
          <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Detected</h2>
          <div class="text-[11px] text-gray-500 space-y-1">
            <div class="flex justify-between">
              <span>Cast</span>
              <span class="font-mono">
                <span class="text-red-400">{{ colorGradingEstimate.colorCast.r.toFixed(0) }}</span>
                <span class="text-gray-600">/</span>
                <span class="text-green-400">{{ colorGradingEstimate.colorCast.g.toFixed(0) }}</span>
                <span class="text-gray-600">/</span>
                <span class="text-blue-400">{{ colorGradingEstimate.colorCast.b.toFixed(0) }}</span>
              </span>
            </div>
            <div class="flex justify-between">
              <span>Brightness</span>
              <span class="font-mono">{{ colorGradingEstimate.brightnessOffset > 0 ? '+' : '' }}{{ colorGradingEstimate.brightnessOffset.toFixed(0) }}</span>
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

      <!-- Stage: Normalize -->
      <section>
        <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Normalize</h2>
        <div class="flex items-center gap-3 mb-3">
          <button
            @click="hasNormalizeStage ? resetNormalization() : applyNormalization()"
            :disabled="!normalizationParams && !hasNormalizeStage"
            class="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors disabled:opacity-30"
            :class="hasNormalizeStage
              ? 'border-gray-600 text-gray-200 hover:border-gray-500'
              : 'border-gray-700 text-gray-500 hover:border-gray-600'"
          >
            Normalize
            <span v-if="hasNormalizeStage" class="px-1.5 py-0.5 rounded bg-gray-700 text-[10px] text-gray-400">ON</span>
          </button>
          <span v-if="normalizationParams && hasNormalizeStage" class="text-[11px] text-gray-500">
            temp {{ normalizationParams.temperature > 0 ? '+' : '' }}{{ (normalizationParams.temperature * 100).toFixed(0) }}
            / bright {{ normalizationParams.brightness > 0 ? '+' : '' }}{{ (normalizationParams.brightness * 100).toFixed(0) }}
          </span>
        </div>
        <div v-if="hasNormalizeStage" class="flex gap-4 items-start">
          <div class="relative bg-gray-900 rounded-lg overflow-hidden flex-1 border border-gray-800" style="aspect-ratio: 3/2;">
            <canvas
              ref="afterNormalizeCanvasRef"
              :class="{ 'opacity-0': !media }"
              class="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <div v-if="afterNormalizeAnalysis" class="flex-1 bg-gray-900 rounded-lg p-4 h-[200px]">
            <HistogramCanvas :data="afterNormalizeAnalysis.histogram" :width="320" :height="160" class="w-full h-full" />
          </div>
        </div>
      </section>

      <!-- Stage: Filter -->
      <section>
        <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Filter</h2>
        <div class="flex items-center gap-3 mb-3">
          <div
            class="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors"
            :class="hasLutStage
              ? 'border-gray-600 text-gray-200'
              : 'border-gray-700 text-gray-500'"
          >
            <select
              :value="selectedPresetId ?? ''"
              @change="selectPreset(($event.target as HTMLSelectElement).value || null)"
              class="bg-transparent border-none focus:outline-none cursor-pointer text-xs"
              :class="hasLutStage ? 'text-gray-200' : 'text-gray-500'"
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
        <div v-if="hasLutStage" class="flex gap-4 items-start">
          <div class="relative bg-gray-900 rounded-lg overflow-hidden flex-1 border border-gray-800" style="aspect-ratio: 3/2;">
            <canvas
              ref="afterFilterCanvasRef"
              :class="{ 'opacity-0': !media }"
              class="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <div v-if="outputAnalysis" class="flex-1 bg-gray-900 rounded-lg p-4 h-[200px]">
            <HistogramCanvas :data="outputAnalysis.histogram" :width="320" :height="160" class="w-full h-full" />
          </div>
        </div>
      </section>

      <!-- Output (always shown) -->
      <section>
        <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Output</h2>
        <div class="flex items-center gap-3 mb-3">
          <span class="text-[11px] text-gray-500">
            {{ pipeline.stages.length === 0 ? 'No processing' : pipeline.stages.map(s => s.name).join(' → ') }}
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
