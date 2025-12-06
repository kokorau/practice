import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { Photo } from '../../modules/Photo/Domain'
import { type ToneProfile, type Lut1D, $ToneProfile } from '../../modules/Filter/Domain'

export type UseToneProfileOptions = {
  /** 黒点/白点検出のパーセンタイル (default: 1%) */
  percentile?: number
}

export type UseToneProfileReturn = {
  /** 抽出されたプロファイル */
  profile: Ref<ToneProfile | null>
  /** プロファイルを適用するLUT */
  lut: ComputedRef<Lut1D | null>
  /** プロファイルを除去する（元に戻す）LUT */
  inverseLut: ComputedRef<Lut1D | null>
  /** 抽出中かどうか */
  isExtracting: Ref<boolean>
  /** プロファイルを抽出 */
  extract: () => Promise<void>
  /** プロファイルをリセット */
  reset: () => void
  /** プロファイルを手動設定 */
  setProfile: (profile: ToneProfile) => void
}

/**
 * 画像から ToneProfile を抽出し、LUT を生成する composable
 */
export const useToneProfile = (
  photo: Ref<Photo | null> | ComputedRef<Photo | null>,
  options: UseToneProfileOptions = {}
): UseToneProfileReturn => {
  const { percentile = 1 } = options

  const profile = ref<ToneProfile | null>(null)
  const isExtracting = ref(false)

  // プロファイルを適用するLUT
  const lut = computed<Lut1D | null>(() => {
    if (!profile.value) return null
    return $ToneProfile.toLut(profile.value)
  })

  // プロファイルを除去するLUT
  const inverseLut = computed<Lut1D | null>(() => {
    if (!profile.value) return null
    return $ToneProfile.toInverseLut(profile.value)
  })

  /** プロファイルを抽出 */
  const extract = async (): Promise<void> => {
    const currentPhoto = photo.value
    if (!currentPhoto) {
      profile.value = null
      return
    }

    if (isExtracting.value) return

    isExtracting.value = true

    try {
      // Photo から ImageData を取得
      const imageData = getImageDataFromPhoto(currentPhoto)
      if (!imageData) {
        profile.value = null
        return
      }

      // プロファイルを抽出
      profile.value = $ToneProfile.extract(imageData, percentile)
    } catch (e) {
      console.error('ToneProfile extraction failed:', e)
      profile.value = null
    } finally {
      isExtracting.value = false
    }
  }

  /** プロファイルをリセット */
  const reset = () => {
    profile.value = null
  }

  /** プロファイルを手動設定 */
  const setProfile = (newProfile: ToneProfile) => {
    profile.value = newProfile
  }

  return {
    profile,
    lut,
    inverseLut,
    isExtracting,
    extract,
    reset,
    setProfile,
  }
}

/**
 * Photo から ImageData を取得
 */
function getImageDataFromPhoto(photo: Photo): ImageData | null {
  // Photo は既に imageData を持っている
  return photo.imageData
}
