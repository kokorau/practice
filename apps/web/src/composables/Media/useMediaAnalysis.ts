import { ref, watch, onUnmounted, isRef, type Ref, type ComputedRef } from 'vue'
import { type Media, $Media } from '../../modules/Media'
import type { PhotoAnalysis } from '../../modules/Photo/Domain'
import type { Lut } from '../../modules/Filter/Domain'
import { mediaAnalysisService } from '../../modules/Photo/Infra/Service/mediaAnalysisService'
import type { PixelEffects } from '../Filter/useFilter'

export type UseMediaAnalysisOptions = {
  lut?: Ref<Lut> | ComputedRef<Lut>
  pixelEffects?: Ref<PixelEffects> | ComputedRef<PixelEffects>
  /** サンプリングレート (Hz) - カメラモードでの解析頻度。0 で無効。Ref で動的変更可能 */
  sampleRate?: number | Ref<number>
}

export type UseMediaAnalysisReturn = {
  analysis: Ref<PhotoAnalysis | null>
  isAnalyzing: Ref<boolean>
  /** 手動で解析を実行 */
  analyze: () => Promise<void>
}

export const useMediaAnalysis = (
  media: Ref<Media | null>,
  options: UseMediaAnalysisOptions = {}
): UseMediaAnalysisReturn => {
  const analysis = ref<PhotoAnalysis | null>(null)
  const isAnalyzing = ref(false)

  // sampleRate を Ref として統一 (number or Ref<number> 両対応)
  const sampleRateOption = options.sampleRate ?? 5
  const sampleRateRef = isRef(sampleRateOption) ? sampleRateOption : ref(sampleRateOption)

  let intervalId: ReturnType<typeof setInterval> | null = null

  /** 解析実行 */
  const analyze = async () => {
    const currentMedia = media.value
    if (!currentMedia) {
      analysis.value = null
      return
    }

    // 既に解析中なら新しい解析は開始しない（重複防止）
    if (isAnalyzing.value) return

    isAnalyzing.value = true

    try {
      // ImageData を取得（メインスレッドで1回だけ）
      const imageData = $Media.getImageData(currentMedia)
      if (!imageData) {
        analysis.value = null
        return
      }

      // Worker で LUT 適用 + 解析を一括処理
      const effects = options.pixelEffects?.value
      analysis.value = await mediaAnalysisService.analyze(imageData, {
        lut: options.lut?.value,
        vibrance: effects?.vibrance,
        hueRotation: effects?.hueRotation,
        downsampleScale: 0.5, // 解析用に 1/2 サイズにダウンサンプル
      })
    } catch (e) {
      console.error('Media analysis failed:', e)
    } finally {
      isAnalyzing.value = false
    }
  }

  /** インターバル処理を開始 */
  const startInterval = () => {
    if (intervalId !== null || sampleRateRef.value <= 0) return
    const intervalMs = 1000 / sampleRateRef.value
    intervalId = setInterval(() => {
      analyze()
    }, intervalMs)
  }

  /** インターバル処理を停止 */
  const stopInterval = () => {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  // Media の変更を監視
  watch(media, (newMedia) => {
    if (!newMedia) {
      stopInterval()
      analysis.value = null
      return
    }

    if ($Media.isCamera(newMedia)) {
      // カメラモード: インターバルで定期解析
      startInterval()
    } else {
      // Photo モード: インターバル停止、即時解析
      stopInterval()
      analyze()
    }
  }, { immediate: true })

  // Photo モードで LUT/Effects が変わったら再解析
  watch([options.lut, options.pixelEffects].filter(Boolean) as Ref<unknown>[], () => {
    const currentMedia = media.value
    if (currentMedia && $Media.isPhoto(currentMedia)) {
      analyze()
    }
  }, { deep: true })

  // sampleRate の変更を監視してインターバルを再設定
  watch(sampleRateRef, () => {
    const currentMedia = media.value
    if (currentMedia && $Media.isCamera(currentMedia)) {
      stopInterval()
      startInterval()
    }
  })

  // クリーンアップ
  onUnmounted(() => {
    stopInterval()
  })

  return {
    analysis,
    isAnalyzing,
    analyze,
  }
}
