<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMedia, useMediaCanvasWebGL, useMediaAnalysis } from '../composables/Media'
import { photoRepository } from '../modules/Photo/Infra/photoRepository'
import { createDefaultPhotoUseCase } from '../modules/Photo/Application/createDefaultPhotoUseCase'
import { loadUnsplashPhoto } from '../modules/PhotoUnsplash/Application/loadUnsplashPhoto'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'
import {
  type Pipeline,
  type Stage,
  $Pipeline,
  $Stage,
  $Lut1D,
  $Lut3D,
  $Preset,
  $Filter,
  $ExposureCorrection,
  $ContrastCorrection,
  $WhiteBalanceCorrection,
  $SaturationCorrection,
  $AutoCorrection,
  type LuminanceStats,
  type SaturationStats,
  type ExposureCorrectionResult,
  type ContrastCorrectionResult,
  type WhiteBalanceCorrectionResult,
  type SaturationCorrectionResult,
  type AutoCorrectionResult,
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

// パイプライン: void_input -> contrast -> wb -> saturation -> lut -> void_output の固定構造
// Note: saturationは3D LUTなので、Creative LUT(lut)と合成して適用する
const createInitialPipeline = (): Pipeline => ({
  stages: [
    $Stage.create('void_input', 'Input', $Lut1D.identity()),
    $Stage.create('contrast', 'Contrast', $Lut1D.identity()),
    $Stage.create('wb', 'WB', $Lut1D.identity()),
    $Stage.create('saturation', 'Saturation', $Lut3D.identity(17)),
    $Stage.create('lut', 'LUT', $Lut1D.identity()),
    $Stage.create('void_output', 'Output', $Lut1D.identity()),
  ],
})

const pipeline = ref<Pipeline>(createInitialPipeline())

// 各ステージのLUT（中間結果用）- 1D LUT部分
const afterVoidInputLut = computed(() =>
  $Pipeline.composeUpTo(pipeline.value, 'void_input')
)
const afterContrastLut = computed(() =>
  $Pipeline.composeUpTo(pipeline.value, 'contrast')
)
const afterWbLut = computed(() =>
  $Pipeline.composeUpTo(pipeline.value, 'wb')
)

// 1D LUT部分の合成（exposure + contrast + wb）
const composed1DLut = computed(() =>
  $Pipeline.composeUpTo(pipeline.value, 'wb')
)

// Saturation 3D LUT
const saturationLut = computed(() => {
  const stage = pipeline.value.stages.find(s => s.id === 'saturation')
  if (!stage || !$Lut3D.is(stage.lut)) return $Lut3D.identity(17)
  return stage.lut
})

// Creative LUT (プリセット)
const creativeLut = computed(() => {
  const stage = pipeline.value.stages.find(s => s.id === 'lut')
  if (!stage) return $Lut3D.identity(17)
  // 1D LUTなら3Dに変換
  if ($Lut1D.is(stage.lut)) {
    return $Lut3D.fromLut1D(stage.lut, 17)
  }
  return stage.lut
})

// Saturation + Creative の合成3D LUT
const composedSaturationAndCreativeLut = computed(() =>
  $Lut3D.compose(saturationLut.value, creativeLut.value)
)

// 中間表示用: WB後 + Saturation適用
const afterSaturationLut = computed(() => {
  // 1D LUT (wb まで) を 3D に変換し、saturation と合成
  const lut1D = $Pipeline.composeUpTo(pipeline.value, 'wb')
  const lut3D = $Lut3D.fromLut1D(lut1D, 17)
  return $Lut3D.compose(lut3D, saturationLut.value)
})

// 中間表示用: LUT後（saturation + creative）
const afterLutLut = computed(() => {
  const lut1D = $Pipeline.composeUpTo(pipeline.value, 'wb')
  const lut3D = $Lut3D.fromLut1D(lut1D, 17)
  return $Lut3D.compose(lut3D, composedSaturationAndCreativeLut.value)
})

// 最終出力用のLUT（1D LUT + saturation 3D + creative 3D）
const composedLut = computed(() => {
  const lut1D = composed1DLut.value
  const lut3D = $Lut3D.fromLut1D(lut1D, 17)
  return $Lut3D.compose(lut3D, composedSaturationAndCreativeLut.value)
})

// Canvas描画 - 各ステージ
const { canvasRef: originalCanvasRef } = useMediaCanvasWebGL(media)
const { canvasRef: afterVoidInputCanvasRef } = useMediaCanvasWebGL(media, {
  lut: afterVoidInputLut,
})
const { canvasRef: afterContrastCanvasRef } = useMediaCanvasWebGL(media, {
  lut: afterContrastLut,
})
const { canvasRef: afterWbCanvasRef } = useMediaCanvasWebGL(media, {
  lut: afterWbLut,
})
const { canvasRef: afterSaturationCanvasRef } = useMediaCanvasWebGL(media, {
  lut: afterSaturationLut,
})
const { canvasRef: afterLutCanvasRef } = useMediaCanvasWebGL(media, {
  lut: afterLutLut,
})

// Analysis - 各ステージ
const { analysis: originalAnalysis } = useMediaAnalysis(media, { sampleRate: 5 })
const { analysis: afterVoidInputAnalysis } = useMediaAnalysis(media, { lut: afterVoidInputLut, sampleRate: 5 })
const { analysis: afterContrastAnalysis } = useMediaAnalysis(media, { lut: afterContrastLut, sampleRate: 5 })
const { analysis: afterWbAnalysis } = useMediaAnalysis(media, { lut: afterWbLut, sampleRate: 5 })
const { analysis: afterSaturationAnalysis } = useMediaAnalysis(media, { lut: afterSaturationLut, sampleRate: 5 })
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

// コントラスト補正: 露出補正後のヒストグラムから統計を計算
const contrastStats = computed<LuminanceStats | null>(() => {
  if (!afterVoidInputAnalysis.value) return null
  return $ExposureCorrection.computeStats(afterVoidInputAnalysis.value.histogram.luminance)
})

// コントラスト補正結果
const contrastResult = computed<ContrastCorrectionResult | null>(() => {
  if (!contrastStats.value) return null
  const classification = $ExposureCorrection.classify(contrastStats.value)
  return $ContrastCorrection.compute(contrastStats.value, classification)
})

// コントラスト補正が有効か
const isContrastCorrectionEnabled = ref(true)

// WB補正: コントラスト補正後のヒストグラムから統計を計算
// Note: WB補正は本来ニュートラルピクセルの検出が必要だが、
// 現在のuseMediaAnalysisではRGBヒストグラムからの簡易推定を行う
const wbResult = computed<WhiteBalanceCorrectionResult | null>(() => {
  if (!afterContrastAnalysis.value || !contrastStats.value) return null
  // RGB ヒストグラムの中央値からニュートラルを推定
  const rHist = afterContrastAnalysis.value.histogram.r
  const gHist = afterContrastAnalysis.value.histogram.g
  const bHist = afterContrastAnalysis.value.histogram.b

  // 各チャンネルの中央値を計算
  const getMedian = (hist: Uint32Array | number[]): number => {
    const total = Array.from(hist).reduce((a, b) => a + b, 0)
    let cumsum = 0
    for (let i = 0; i < hist.length; i++) {
      cumsum += hist[i]!
      if (cumsum >= total / 2) {
        return i / 255
      }
    }
    return 0.5
  }

  const medR = getMedian(rHist)
  const medG = getMedian(gHist)
  const medB = getMedian(bHist)

  // 簡易的なNeutralStats（本来は低彩度ピクセルから抽出するが、ここでは全体中央値で代用）
  const neutralStats = {
    count: 1000,
    ratio: 0.1,
    medianRGB: [medR, medG, medB] as [number, number, number],
    confidence: 'medium' as const,
  }

  // LuminanceStats はコントラスト補正時のものを使用
  return $WhiteBalanceCorrection.compute(neutralStats, contrastStats.value)
})

// WB補正が有効か
const isWbCorrectionEnabled = ref(true)

// 彩度補正: WB補正後のヒストグラムから統計を計算
// 彩度統計の計算（RGB ヒストグラムから推定）
const saturationStats = computed<SaturationStats | null>(() => {
  if (!afterWbAnalysis.value) return null

  const rHist = afterWbAnalysis.value.histogram.r
  const gHist = afterWbAnalysis.value.histogram.g
  const bHist = afterWbAnalysis.value.histogram.b

  // 各チャンネルのパーセンタイルを計算
  const getPercentile = (hist: Uint32Array | number[], p: number): number => {
    const total = Array.from(hist).reduce((a, b) => a + b, 0)
    let cumsum = 0
    for (let i = 0; i < hist.length; i++) {
      cumsum += hist[i]!
      if (cumsum >= total * p) {
        return i / 255
      }
    }
    return 0.5
  }

  // 各パーセンタイルでのRGB値を取得
  const r50 = getPercentile(rHist, 0.5)
  const g50 = getPercentile(gHist, 0.5)
  const b50 = getPercentile(bHist, 0.5)

  const r95 = getPercentile(rHist, 0.95)
  const g95 = getPercentile(gHist, 0.95)
  const b95 = getPercentile(bHist, 0.95)

  const r99 = getPercentile(rHist, 0.99)
  const g99 = getPercentile(gHist, 0.99)
  const b99 = getPercentile(bHist, 0.99)

  // 彩度プロキシ: max - min の推定
  // p50での彩度
  const sat50 = Math.max(r50, g50, b50) - Math.min(r50, g50, b50)
  // p95での彩度（高彩度ピクセルの代表値）
  const sat95 = Math.max(r95, g95, b95) - Math.min(r95, g95, b95)
  // p99での彩度
  const sat99 = Math.max(r99, g99, b99) - Math.min(r99, g99, b99)

  return {
    p95Proxy: sat95,
    p99Proxy: sat99,
    meanProxy: sat50,
  }
})

// WB補正後のLuminanceStats（彩度補正のガード条件に使用）
const saturationLuminanceStats = computed<LuminanceStats | null>(() => {
  if (!afterWbAnalysis.value) return null
  return $ExposureCorrection.computeStats(afterWbAnalysis.value.histogram.luminance)
})

// 彩度補正結果
const saturationResult = computed<SaturationCorrectionResult | null>(() => {
  if (!saturationStats.value || !saturationLuminanceStats.value) return null
  return $SaturationCorrection.compute(saturationStats.value, saturationLuminanceStats.value)
})

// 彩度補正が有効か
const isSaturationCorrectionEnabled = ref(true)

// ========================================
// 統合版自動補正（2フェーズ設計）
// ========================================

// 統合版が有効か
const isIntegratedCorrectionEnabled = ref(true)

// 統合版の結果（オリジナルから一発で計算）
const integratedResult = computed<AutoCorrectionResult | null>(() => {
  if (!originalAnalysis.value) return null

  const input = {
    histogram: {
      luminance: originalAnalysis.value.histogram.luminance,
      r: originalAnalysis.value.histogram.r,
      g: originalAnalysis.value.histogram.g,
      b: originalAnalysis.value.histogram.b,
    },
  }

  return $AutoCorrection.compute(input)
})

// 統合版 LUT
const integratedLut = computed(() => {
  if (!integratedResult.value || !isIntegratedCorrectionEnabled.value) {
    return $Lut3D.identity(17)
  }
  return $AutoCorrection.toLut3D(integratedResult.value, 17)
})

// 統合版 Canvas
const { canvasRef: integratedCanvasRef } = useMediaCanvasWebGL(media, {
  lut: integratedLut,
})

// 統合版 Analysis
const { analysis: integratedAnalysis } = useMediaAnalysis(media, { lut: integratedLut, sampleRate: 5 })

// 統合版のサマリー
const integratedSummary = computed(() => {
  if (!integratedResult.value) return 'No correction'
  return $AutoCorrection.getSummary(integratedResult.value)
})

// 統合版のトグル
const toggleIntegratedCorrection = () => {
  isIntegratedCorrectionEnabled.value = !isIntegratedCorrectionEnabled.value
}

// Output Canvas
const { canvasRef: outputCanvasRef } = useMediaCanvasWebGL(media, {
  lut: composedLut,
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

// ステージのLUTを更新（1D LUT）
const updateStageLut = (stageId: string, lut: ReturnType<typeof $Lut1D.identity>, name?: string) => {
  pipeline.value = $Pipeline.updateStage(pipeline.value, stageId, {
    lut,
    ...(name ? { name } : {}),
  })
}

// ステージのLUTを更新（3D LUT）
const updateStageLut3D = (stageId: string, lut: ReturnType<typeof $Lut3D.identity>, name?: string) => {
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

// コントラスト補正を適用
const applyContrastCorrection = () => {
  if (!contrastResult.value || !isContrastCorrectionEnabled.value) {
    updateStageLut('contrast', $Lut1D.identity(), 'Contrast')
    return
  }
  const lut = $ContrastCorrection.toLut(contrastResult.value)
  updateStageLut('contrast', lut, 'Contrast')
}

// コントラスト補正結果が変わったら適用
watch([contrastResult, isContrastCorrectionEnabled], () => {
  applyContrastCorrection()
}, { immediate: true })

// コントラスト補正のトグル
const toggleContrastCorrection = () => {
  isContrastCorrectionEnabled.value = !isContrastCorrectionEnabled.value
}

// WB補正を適用
const applyWbCorrection = () => {
  if (!wbResult.value || !isWbCorrectionEnabled.value) {
    updateStageLut('wb', $Lut1D.identity(), 'WB')
    return
  }
  const lut = $WhiteBalanceCorrection.toLut(wbResult.value)
  updateStageLut('wb', lut, 'WB')
}

// WB補正結果が変わったら適用
watch([wbResult, isWbCorrectionEnabled], () => {
  applyWbCorrection()
}, { immediate: true })

// WB補正のトグル
const toggleWbCorrection = () => {
  isWbCorrectionEnabled.value = !isWbCorrectionEnabled.value
}

// 彩度補正を適用
const applySaturationCorrection = () => {
  if (!saturationResult.value || !isSaturationCorrectionEnabled.value) {
    updateStageLut3D('saturation', $Lut3D.identity(17), 'Saturation')
    return
  }
  const lut = $SaturationCorrection.toLut3D(saturationResult.value, 17)
  updateStageLut3D('saturation', lut, 'Saturation')
}

// 彩度補正結果が変わったら適用
watch([saturationResult, isSaturationCorrectionEnabled], () => {
  applySaturationCorrection()
}, { immediate: true })

// 彩度補正のトグル
const toggleSaturationCorrection = () => {
  isSaturationCorrectionEnabled.value = !isSaturationCorrectionEnabled.value
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

        <!-- Contrast Stats -->
        <section v-if="contrastStats">
          <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Contrast</h2>
          <div class="text-[11px] text-gray-500 space-y-1">
            <div class="flex justify-between">
              <span>Range (p90-p10)</span>
              <span class="font-mono">{{ (contrastStats.range * 100).toFixed(0) }}%</span>
            </div>
            <div class="flex justify-between">
              <span>Mid Ratio</span>
              <span class="font-mono">{{ (contrastStats.midRatio * 100).toFixed(0) }}%</span>
            </div>
            <div v-if="contrastResult" class="flex justify-between">
              <span>Delta</span>
              <span class="font-mono">{{ contrastResult.delta > 0 ? '+' : '' }}{{ (contrastResult.delta * 100).toFixed(1) }}%</span>
            </div>
            <div v-if="contrastResult" class="flex justify-between">
              <span>Amount</span>
              <span class="font-mono">{{ contrastResult.amount > 0 ? '+' : '' }}{{ (contrastResult.amount * 100).toFixed(2) }}%</span>
            </div>
            <div v-if="contrastResult && contrastResult.guardApplied" class="flex justify-between text-yellow-500">
              <span>Guard</span>
              <span class="font-mono">{{ contrastResult.guardType }}</span>
            </div>
          </div>
        </section>

        <!-- WB Stats -->
        <section v-if="wbResult">
          <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">White Balance</h2>
          <div class="text-[11px] text-gray-500 space-y-1">
            <div class="flex justify-between">
              <span>Raw Kr (G/R)</span>
              <span class="font-mono">{{ wbResult.rawKr.toFixed(3) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Raw Kb (G/B)</span>
              <span class="font-mono">{{ wbResult.rawKb.toFixed(3) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Final R</span>
              <span class="font-mono">{{ wbResult.gainR.toFixed(3) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Final B</span>
              <span class="font-mono">{{ wbResult.gainB.toFixed(3) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Strength</span>
              <span class="font-mono">{{ (wbResult.effectiveStrength * 100).toFixed(1) }}%</span>
            </div>
            <div v-if="wbResult.guardApplied" class="flex justify-between text-yellow-500">
              <span>Guards</span>
              <span class="font-mono">{{ wbResult.guards.join(', ') }}</span>
            </div>
          </div>
        </section>

        <!-- Saturation Stats -->
        <section v-if="saturationResult">
          <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Saturation</h2>
          <div class="text-[11px] text-gray-500 space-y-1">
            <div class="flex justify-between">
              <span>Current (p95)</span>
              <span class="font-mono">{{ saturationStats ? (saturationStats.p95Proxy * 100).toFixed(1) : '-' }}%</span>
            </div>
            <div class="flex justify-between">
              <span>Delta</span>
              <span class="font-mono">{{ saturationResult.delta > 0 ? '+' : '' }}{{ (saturationResult.delta * 100).toFixed(1) }}%</span>
            </div>
            <div class="flex justify-between">
              <span>Compression</span>
              <span class="font-mono">{{ (saturationResult.compressionBase * 100).toFixed(1) }}%</span>
            </div>
            <div v-if="saturationResult.guardApplied" class="flex justify-between text-yellow-500">
              <span>Guard</span>
              <span class="font-mono">{{ saturationResult.guardType }}</span>
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

      <!-- Stage: Contrast -->
      <section>
        <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Contrast</h2>
        <div class="flex items-center gap-3 mb-3">
          <button
            @click="toggleContrastCorrection"
            class="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors"
            :class="isContrastCorrectionEnabled
              ? 'border-gray-600 text-gray-200 hover:border-gray-500'
              : 'border-gray-700 text-gray-500 hover:border-gray-600'"
          >
            Contrast
            <span v-if="isContrastCorrectionEnabled" class="px-1.5 py-0.5 rounded bg-gray-700 text-[10px] text-gray-400">ON</span>
          </button>
          <span v-if="contrastResult && isContrastCorrectionEnabled" class="text-[11px] text-gray-500">
            {{ contrastResult.amount > 0 ? '+' : '' }}{{ (contrastResult.amount * 100).toFixed(1) }}%
            <span v-if="contrastResult.guardApplied" class="text-yellow-500">({{ contrastResult.guardType }})</span>
          </span>
          <span v-else class="text-[11px] text-gray-500">Identity LUT (no change)</span>
        </div>
        <div class="flex gap-4 items-start">
          <div class="relative bg-gray-900 rounded-lg overflow-hidden flex-1 border border-gray-800" style="aspect-ratio: 3/2;">
            <canvas
              ref="afterContrastCanvasRef"
              :class="{ 'opacity-0': !media }"
              class="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <div v-if="afterContrastAnalysis" class="flex-1 bg-gray-900 rounded-lg p-4 h-[200px]">
            <HistogramCanvas :data="afterContrastAnalysis.histogram" :width="320" :height="160" class="w-full h-full" />
          </div>
        </div>
      </section>

      <!-- Stage: WB -->
      <section>
        <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">White Balance</h2>
        <div class="flex items-center gap-3 mb-3">
          <button
            @click="toggleWbCorrection"
            class="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors"
            :class="isWbCorrectionEnabled
              ? 'border-gray-600 text-gray-200 hover:border-gray-500'
              : 'border-gray-700 text-gray-500 hover:border-gray-600'"
          >
            WB
            <span v-if="isWbCorrectionEnabled" class="px-1.5 py-0.5 rounded bg-gray-700 text-[10px] text-gray-400">ON</span>
          </button>
          <span v-if="wbResult && isWbCorrectionEnabled" class="text-[11px] text-gray-500">
            R:{{ wbResult.gainR.toFixed(2) }} B:{{ wbResult.gainB.toFixed(2) }} ({{ (wbResult.effectiveStrength * 100).toFixed(0) }}%)
            <span v-if="wbResult.guardApplied" class="text-yellow-500">({{ wbResult.guards.join(', ') }})</span>
          </span>
          <span v-else class="text-[11px] text-gray-500">Identity LUT (no change)</span>
        </div>
        <div class="flex gap-4 items-start">
          <div class="relative bg-gray-900 rounded-lg overflow-hidden flex-1 border border-gray-800" style="aspect-ratio: 3/2;">
            <canvas
              ref="afterWbCanvasRef"
              :class="{ 'opacity-0': !media }"
              class="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <div v-if="afterWbAnalysis" class="flex-1 bg-gray-900 rounded-lg p-4 h-[200px]">
            <HistogramCanvas :data="afterWbAnalysis.histogram" :width="320" :height="160" class="w-full h-full" />
          </div>
        </div>
      </section>

      <!-- Stage: Saturation -->
      <section>
        <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Saturation</h2>
        <div class="flex items-center gap-3 mb-3">
          <button
            @click="toggleSaturationCorrection"
            class="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors"
            :class="isSaturationCorrectionEnabled
              ? 'border-gray-600 text-gray-200 hover:border-gray-500'
              : 'border-gray-700 text-gray-500 hover:border-gray-600'"
          >
            Saturation
            <span v-if="isSaturationCorrectionEnabled" class="px-1.5 py-0.5 rounded bg-gray-700 text-[10px] text-gray-400">ON</span>
          </button>
          <span v-if="saturationResult && isSaturationCorrectionEnabled" class="text-[11px] text-gray-500">
            Compression: {{ (saturationResult.compressionBase * 100).toFixed(1) }}%
            <span v-if="saturationResult.guardApplied" class="text-yellow-500">({{ saturationResult.guardType }})</span>
          </span>
          <span v-else class="text-[11px] text-gray-500">Identity LUT (no change)</span>
        </div>
        <div class="flex gap-4 items-start">
          <div class="relative bg-gray-900 rounded-lg overflow-hidden flex-1 border border-gray-800" style="aspect-ratio: 3/2;">
            <canvas
              ref="afterSaturationCanvasRef"
              :class="{ 'opacity-0': !media }"
              class="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <div v-if="afterSaturationAnalysis" class="flex-1 bg-gray-900 rounded-lg p-4 h-[200px]">
            <HistogramCanvas :data="afterSaturationAnalysis.histogram" :width="320" :height="160" class="w-full h-full" />
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

      <!-- Stage: Output -->
      <section>
        <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Output (Pipeline)</h2>
        <div class="flex items-center gap-3 mb-3">
          <span class="text-[11px] text-gray-500">
            {{ pipeline.stages.filter(s => !s.id.startsWith('void_')).map(s => s.name).join(' → ') }}
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

      <!-- Integrated Auto Correction -->
      <section class="border-t border-gray-700 pt-5">
        <h2 class="text-[11px] text-emerald-400 uppercase tracking-wider mb-2">Integrated Auto Correction</h2>
        <div class="flex items-center gap-3 mb-3">
          <button
            @click="toggleIntegratedCorrection"
            class="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors"
            :class="isIntegratedCorrectionEnabled
              ? 'border-emerald-600 text-emerald-200 hover:border-emerald-500'
              : 'border-gray-700 text-gray-500 hover:border-gray-600'"
          >
            Integrated
            <span v-if="isIntegratedCorrectionEnabled" class="px-1.5 py-0.5 rounded bg-emerald-900 text-[10px] text-emerald-400">ON</span>
          </button>
          <span v-if="integratedResult && isIntegratedCorrectionEnabled" class="text-[11px] text-gray-400">
            {{ integratedSummary }}
          </span>
          <span v-else class="text-[11px] text-gray-500">Identity LUT (no change)</span>
        </div>
        <div class="flex gap-4 items-start">
          <div class="relative bg-gray-900 rounded-lg overflow-hidden flex-1 border border-emerald-900" style="aspect-ratio: 3/2;">
            <canvas
              ref="integratedCanvasRef"
              :class="{ 'opacity-0': !media }"
              class="absolute inset-0 w-full h-full object-contain"
            />
            <p v-if="!media" class="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
              -
            </p>
          </div>
          <div v-if="integratedAnalysis" class="flex-1 bg-gray-900 rounded-lg p-4 h-[200px]">
            <HistogramCanvas :data="integratedAnalysis.histogram" :width="320" :height="160" class="w-full h-full" />
          </div>
        </div>
        <!-- 統合版の詳細 -->
        <div v-if="integratedResult && isIntegratedCorrectionEnabled" class="mt-3 grid grid-cols-4 gap-4">
          <div class="text-[11px] text-gray-500 space-y-1">
            <div class="text-emerald-400 font-medium">Exposure</div>
            <div class="flex justify-between">
              <span>EV</span>
              <span class="font-mono">{{ integratedResult.exposure.appliedEvDelta > 0 ? '+' : '' }}{{ integratedResult.exposure.appliedEvDelta.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Gain</span>
              <span class="font-mono">{{ integratedResult.exposure.gain.toFixed(3) }}</span>
            </div>
          </div>
          <div class="text-[11px] text-gray-500 space-y-1">
            <div class="text-emerald-400 font-medium">Contrast</div>
            <div class="flex justify-between">
              <span>Amount</span>
              <span class="font-mono">{{ integratedResult.contrast.amount > 0 ? '+' : '' }}{{ (integratedResult.contrast.amount * 100).toFixed(1) }}%</span>
            </div>
            <div v-if="integratedResult.contrast.guardApplied" class="flex justify-between text-yellow-500">
              <span>Guard</span>
              <span class="font-mono">{{ integratedResult.contrast.guardType }}</span>
            </div>
          </div>
          <div class="text-[11px] text-gray-500 space-y-1">
            <div class="text-emerald-400 font-medium">White Balance</div>
            <div class="flex justify-between">
              <span>R</span>
              <span class="font-mono">{{ integratedResult.wb.gainR.toFixed(3) }}</span>
            </div>
            <div class="flex justify-between">
              <span>B</span>
              <span class="font-mono">{{ integratedResult.wb.gainB.toFixed(3) }}</span>
            </div>
          </div>
          <div class="text-[11px] text-gray-500 space-y-1">
            <div class="text-emerald-400 font-medium">Saturation</div>
            <div class="flex justify-between">
              <span>Compression</span>
              <span class="font-mono">{{ (integratedResult.saturation.compressionBase * 100).toFixed(1) }}%</span>
            </div>
            <div v-if="integratedResult.saturation.guardApplied" class="flex justify-between text-yellow-500">
              <span>Guard</span>
              <span class="font-mono">{{ integratedResult.saturation.guardType }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
    </div>
  </div>
</template>
