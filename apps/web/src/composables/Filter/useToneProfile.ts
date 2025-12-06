import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'
import { type ToneProfile, type ToneProfileDetailed, type Lut1D, $ToneProfile } from '../../modules/Filter/Domain'

export type UseToneProfileOptions = {
  /** 黒点/白点検出のパーセンタイル (default: 1%) */
  percentile?: number
  /** コントロールポイント数 (default: 7) */
  numControlPoints?: number
}

export type UseToneProfileReturn = {
  /** 簡易プロファイル */
  profile: ComputedRef<ToneProfile | null>
  /** 詳細プロファイル（CDF + コントロールポイント） */
  detailedProfile: Ref<ToneProfileDetailed | null>
  /** プロファイルを適用するLUT（詳細版、CDFベース） */
  lut: ComputedRef<Lut1D | null>
  /** プロファイルを除去する（元に戻す）LUT（詳細版） */
  inverseLut: ComputedRef<Lut1D | null>
  /** 抽出中かどうか */
  isExtracting: Ref<boolean>
  /** プロファイルを抽出 */
  extract: () => Promise<void>
  /** プロファイルをリセット */
  reset: () => void
}

/**
 * 画像から ToneProfile を抽出し、LUT を生成する composable
 * 詳細モード: CDFベースの正確なトーンカーブとコントロールポイントを取得
 */
export const useToneProfile = (
  photo: Ref<Photo | null> | ComputedRef<Photo | null>,
  options: UseToneProfileOptions = {}
): UseToneProfileReturn => {
  const { percentile = 1, numControlPoints = 7 } = options

  const detailedProfile = ref<ToneProfileDetailed | null>(null)
  const isExtracting = ref(false)

  // 簡易プロファイル（詳細から変換）
  const profile = computed<ToneProfile | null>(() => {
    if (!detailedProfile.value) return null
    return $ToneProfile.toSimple(detailedProfile.value)
  })

  // プロファイルを適用するLUT（CDFベース）
  const lut = computed<Lut1D | null>(() => {
    if (!detailedProfile.value) return null
    return $ToneProfile.detailedToLut(detailedProfile.value)
  })

  // プロファイルを除去するLUT（CDF逆関数）
  const inverseLut = computed<Lut1D | null>(() => {
    if (!detailedProfile.value) return null
    return $ToneProfile.detailedToInverseLut(detailedProfile.value)
  })

  /** プロファイルを抽出 */
  const extract = async (): Promise<void> => {
    const currentPhoto = photo.value
    if (!currentPhoto) {
      detailedProfile.value = null
      return
    }

    if (isExtracting.value) return

    isExtracting.value = true

    try {
      // Photo から ImageData を取得
      const imageData = getImageDataFromPhoto(currentPhoto)
      if (!imageData) {
        detailedProfile.value = null
        return
      }

      // 詳細プロファイルを抽出
      detailedProfile.value = $ToneProfile.extractDetailed(imageData, percentile, numControlPoints)
    } catch (e) {
      console.error('ToneProfile extraction failed:', e)
      detailedProfile.value = null
    } finally {
      isExtracting.value = false
    }
  }

  /** プロファイルをリセット */
  const reset = () => {
    detailedProfile.value = null
  }

  return {
    profile,
    detailedProfile,
    lut,
    inverseLut,
    isExtracting,
    extract,
    reset,
  }
}

/**
 * Photo から ImageData を取得
 */
function getImageDataFromPhoto(photo: Photo): ImageData | null {
  return photo.imageData
}
