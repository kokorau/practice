import { ref, watch, onUnmounted, isRef, type Ref, type ComputedRef } from 'vue'
import { type Media, $Media } from '../../modules/Media'
import type { ProfiledPalette } from '../../modules/Palette/Domain'
import type { Lut } from '../../modules/Filter/Domain'
import { mediaPaletteService } from '../../modules/Palette/Infra/Service/mediaPaletteService'
import type { PixelEffects } from '../Filter/useFilter'

export type UseMediaPaletteOptions = {
  lut?: Ref<Lut> | ComputedRef<Lut>
  pixelEffects?: Ref<PixelEffects> | ComputedRef<PixelEffects>
  /** サンプリングレート (Hz) - カメラモードでのパレット抽出頻度。0 で無効。Ref で動的変更可能 */
  sampleRate?: number | Ref<number>
}

export type UseMediaPaletteReturn = {
  palette: Ref<ProfiledPalette | null>
  isLoading: Ref<boolean>
  /** 手動でパレット抽出を実行 */
  extract: () => Promise<void>
}

export const useMediaPalette = (
  media: Ref<Media | null>,
  options: UseMediaPaletteOptions = {}
): UseMediaPaletteReturn => {
  const palette = ref<ProfiledPalette | null>(null)
  const isLoading = ref(false)

  // sampleRate を Ref として統一 (number or Ref<number> 両対応)
  const sampleRateOption = options.sampleRate ?? 2 // デフォルト 2 FPS（パレット抽出は重いので低め）
  const sampleRateRef = isRef(sampleRateOption) ? sampleRateOption : ref(sampleRateOption)

  let intervalId: ReturnType<typeof setInterval> | null = null

  /** パレット抽出実行 */
  const extract = async () => {
    const currentMedia = media.value
    if (!currentMedia) {
      palette.value = null
      return
    }

    // 既に処理中なら新しい処理は開始しない
    if (isLoading.value) return

    isLoading.value = true

    try {
      // ImageData を取得（メインスレッドで1回だけ）
      const imageData = $Media.getImageData(currentMedia)
      if (!imageData) {
        palette.value = null
        return
      }

      // Worker で LUT 適用 + パレット抽出を一括処理
      const effects = options.pixelEffects?.value
      palette.value = await mediaPaletteService.extract(imageData, {
        lut: options.lut?.value,
        vibrance: effects?.vibrance,
        hueRotation: effects?.hueRotation,
        downsampleScale: 0.25, // パレット抽出用に 1/4 サイズにダウンサンプル
      })
    } catch (e) {
      console.error('Media palette extraction failed:', e)
    } finally {
      isLoading.value = false
    }
  }

  /** インターバル処理を開始 */
  const startInterval = () => {
    if (intervalId !== null || sampleRateRef.value <= 0) return
    const intervalMs = 1000 / sampleRateRef.value
    intervalId = setInterval(() => {
      extract()
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
      palette.value = null
      return
    }

    if ($Media.isCamera(newMedia)) {
      // カメラモード: インターバルで定期抽出
      startInterval()
    } else {
      // Photo モード: インターバル停止、即時抽出
      stopInterval()
      extract()
    }
  }, { immediate: true })

  // Photo モードで LUT/Effects が変わったら再抽出
  watch([options.lut, options.pixelEffects].filter(Boolean) as Ref<unknown>[], () => {
    const currentMedia = media.value
    if (currentMedia && $Media.isPhoto(currentMedia)) {
      extract()
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
    palette,
    isLoading,
    extract,
  }
}
