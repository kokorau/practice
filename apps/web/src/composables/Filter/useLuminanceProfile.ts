import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'
import {
  type LuminanceProfile,
  type LuminanceLut,
  type CurveFitType,
  $LuminanceProfile,
} from '../../modules/Filter/Domain'

export type UseLuminanceProfileOptions = {
  /** 黒点/白点検出のパーセンタイル (default: 1%) */
  percentile?: number
  /** コントロールポイント数 (default: 7) */
  numControlPoints?: number
  /** 解析用ダウンサンプル後の最大幅 (default: 320) */
  maxAnalysisWidth?: number
  /** カーブフィッティングタイプ (default: 'polynomial') */
  fitType?: CurveFitType
}

export type UseLuminanceProfileReturn = {
  /** 輝度プロファイル */
  profile: Ref<LuminanceProfile | null>
  /** プロファイル適用 LUT */
  lut: ComputedRef<LuminanceLut | null>
  /** プロファイル除去（フラット化）LUT */
  inverseLut: ComputedRef<LuminanceLut | null>
  /** カーブフィットタイプ */
  fitType: Ref<CurveFitType>
  /** 抽出中かどうか */
  isExtracting: Ref<boolean>
  /** 抽出処理時間 (ms) */
  extractionTime: Ref<number>
}

/**
 * 画像から LuminanceProfile を自動抽出する composable
 * Oklab ベースの知覚的輝度解析を行う
 */
export const useLuminanceProfile = (
  photo: Ref<Photo | null> | ComputedRef<Photo | null>,
  options: UseLuminanceProfileOptions = {}
): UseLuminanceProfileReturn => {
  const {
    percentile = 1,
    numControlPoints = 7,
    maxAnalysisWidth = 320,
    fitType: initialFitType = 'polynomial',
  } = options

  const profile = ref<LuminanceProfile | null>(null)
  const isExtracting = ref(false)
  const extractionTime = ref(0)
  const fitType = ref<CurveFitType>(initialFitType)

  // LUT (fitted)
  const lut = computed<LuminanceLut | null>(() => {
    if (!profile.value) return null
    return $LuminanceProfile.toFittedLut(profile.value, fitType.value)
  })

  // Inverse LUT (fitted) - フラット化用
  const inverseLut = computed<LuminanceLut | null>(() => {
    if (!profile.value) return null
    return $LuminanceProfile.toFittedInverseLut(profile.value, fitType.value)
  })

  /**
   * ImageData をダウンサンプル
   */
  const downsampleImageData = (imageData: ImageData, maxWidth: number): ImageData => {
    if (imageData.width <= maxWidth) return imageData

    const scale = maxWidth / imageData.width
    const newWidth = Math.floor(imageData.width * scale)
    const newHeight = Math.floor(imageData.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = newWidth
    canvas.height = newHeight
    const ctx = canvas.getContext('2d')!

    // 元画像を一時キャンバスに描画
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = imageData.width
    tempCanvas.height = imageData.height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(imageData, 0, 0)

    // 縮小
    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight)
    return ctx.getImageData(0, 0, newWidth, newHeight)
  }

  /**
   * プロファイル抽出
   */
  const extractProfile = (currentPhoto: Photo | null) => {
    if (!currentPhoto?.imageData) {
      profile.value = null
      return
    }

    isExtracting.value = true
    const startTime = performance.now()

    try {
      // ダウンサンプル
      const smallImageData = downsampleImageData(currentPhoto.imageData, maxAnalysisWidth)

      // プロファイル抽出
      profile.value = $LuminanceProfile.extract(smallImageData, percentile, numControlPoints)
      extractionTime.value = Math.round(performance.now() - startTime)
    } catch (e) {
      console.error('LuminanceProfile extraction failed:', e)
      profile.value = null
    } finally {
      isExtracting.value = false
    }
  }

  // photo 変更時に自動抽出
  watch(
    () => photo.value,
    (newPhoto) => {
      extractProfile(newPhoto)
    },
    { immediate: true }
  )

  return {
    profile,
    lut,
    inverseLut,
    fitType,
    isExtracting,
    extractionTime,
  }
}
