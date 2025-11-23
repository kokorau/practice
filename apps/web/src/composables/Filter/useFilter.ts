import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { type Filter, type Lut, type Preset, $Filter, $Preset } from '../../modules/Filter/Domain'

/** LUTに焼けないピクセル単位エフェクト */
export type PixelEffects = {
  vibrance: number
}

export type UseFilterReturn = {
  filter: Ref<Filter>
  lut: ComputedRef<Lut>
  /** LUTに焼けないエフェクト (vibrance等) */
  pixelEffects: ComputedRef<PixelEffects>
  /** 現在適用中のプリセットID (null = カスタム) */
  currentPresetId: Ref<string | null>
  /** プリセットを適用 */
  applyPreset: (preset: Preset) => void
  /** Exposure (-2 to +2 EV) */
  setExposure: (value: number) => void
  /** Highlights (-1 to +1) */
  setHighlights: (value: number) => void
  /** Shadows (-1 to +1) */
  setShadows: (value: number) => void
  /** Whites (-1 to +1) */
  setWhites: (value: number) => void
  /** Blacks (-1 to +1) */
  setBlacks: (value: number) => void
  /** Brightness (-1 to +1) */
  setBrightness: (value: number) => void
  /** Contrast (-1 to +1) */
  setContrast: (value: number) => void
  /** Temperature (-1 to +1) */
  setTemperature: (value: number) => void
  /** Tint (-1 to +1) */
  setTint: (value: number) => void
  /** Clarity (-1 to +1) */
  setClarity: (value: number) => void
  /** Fade (0 to +1) */
  setFade: (value: number) => void
  /** Vibrance (-1 to +1) */
  setVibrance: (value: number) => void
  /** Split Toning: Shadow Hue (0-360) */
  setSplitShadowHue: (value: number) => void
  /** Split Toning: Shadow Amount (0-1) */
  setSplitShadowAmount: (value: number) => void
  /** Split Toning: Highlight Hue (0-360) */
  setSplitHighlightHue: (value: number) => void
  /** Split Toning: Highlight Amount (0-1) */
  setSplitHighlightAmount: (value: number) => void
  /** Split Toning: Balance (-1 to +1) */
  setSplitBalance: (value: number) => void
  /** Toe (0 to +1) */
  setToe: (value: number) => void
  /** Shoulder (0 to +1) */
  setShoulder: (value: number) => void
  /** Color Balance: Lift R (-1 to +1) */
  setLiftR: (value: number) => void
  /** Color Balance: Lift G (-1 to +1) */
  setLiftG: (value: number) => void
  /** Color Balance: Lift B (-1 to +1) */
  setLiftB: (value: number) => void
  /** Color Balance: Gamma R (-1 to +1) */
  setGammaR: (value: number) => void
  /** Color Balance: Gamma G (-1 to +1) */
  setGammaG: (value: number) => void
  /** Color Balance: Gamma B (-1 to +1) */
  setGammaB: (value: number) => void
  /** Color Balance: Gain R (-1 to +1) */
  setGainR: (value: number) => void
  /** Color Balance: Gain G (-1 to +1) */
  setGainG: (value: number) => void
  /** Color Balance: Gain B (-1 to +1) */
  setGainB: (value: number) => void
  /** Master カーブの特定ポイントを更新 */
  setMasterPoint: (index: number, value: number) => void
  /** Master カーブ全体を更新 */
  setMasterPoints: (points: number[]) => void
  /** フィルターをリセット */
  reset: () => void
}

export const useFilter = (pointCount: number = 7): UseFilterReturn => {
  const filter = ref<Filter>($Filter.identity(pointCount))
  const currentPresetId = ref<string | null>(null)

  const lut = computed<Lut>(() => $Filter.toLut(filter.value))

  // LUTに焼けないエフェクト
  const pixelEffects = computed<PixelEffects>(() => ({
    vibrance: filter.value.adjustment.vibrance,
  }))

  const applyPreset = (preset: Preset) => {
    filter.value = $Preset.toFilter(preset, pointCount)
    currentPresetId.value = preset.id
  }

  // パラメータ変更時はプリセットIDをクリア
  const clearPresetId = () => {
    currentPresetId.value = null
  }

  const setExposure = (value: number) => {
    filter.value = $Filter.setExposure(filter.value, Math.max(-2, Math.min(2, value)))
    clearPresetId()
  }

  const setHighlights = (value: number) => {
    filter.value = $Filter.setHighlights(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setShadows = (value: number) => {
    filter.value = $Filter.setShadows(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setWhites = (value: number) => {
    filter.value = $Filter.setWhites(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setBlacks = (value: number) => {
    filter.value = $Filter.setBlacks(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setBrightness = (value: number) => {
    filter.value = $Filter.setBrightness(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setContrast = (value: number) => {
    filter.value = $Filter.setContrast(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setTemperature = (value: number) => {
    filter.value = $Filter.setTemperature(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setTint = (value: number) => {
    filter.value = $Filter.setTint(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setClarity = (value: number) => {
    filter.value = $Filter.setClarity(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setFade = (value: number) => {
    filter.value = $Filter.setFade(filter.value, Math.max(0, Math.min(1, value)))
    clearPresetId()
  }

  const setVibrance = (value: number) => {
    filter.value = $Filter.setVibrance(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setSplitShadowHue = (value: number) => {
    filter.value = $Filter.setSplitShadowHue(filter.value, ((value % 360) + 360) % 360)
    clearPresetId()
  }

  const setSplitShadowAmount = (value: number) => {
    filter.value = $Filter.setSplitShadowAmount(filter.value, Math.max(0, Math.min(1, value)))
    clearPresetId()
  }

  const setSplitHighlightHue = (value: number) => {
    filter.value = $Filter.setSplitHighlightHue(filter.value, ((value % 360) + 360) % 360)
    clearPresetId()
  }

  const setSplitHighlightAmount = (value: number) => {
    filter.value = $Filter.setSplitHighlightAmount(filter.value, Math.max(0, Math.min(1, value)))
    clearPresetId()
  }

  const setSplitBalance = (value: number) => {
    filter.value = $Filter.setSplitBalance(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setToe = (value: number) => {
    filter.value = $Filter.setToe(filter.value, Math.max(0, Math.min(1, value)))
    clearPresetId()
  }

  const setShoulder = (value: number) => {
    filter.value = $Filter.setShoulder(filter.value, Math.max(0, Math.min(1, value)))
    clearPresetId()
  }

  const setLiftR = (value: number) => {
    filter.value = $Filter.setLiftR(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setLiftG = (value: number) => {
    filter.value = $Filter.setLiftG(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setLiftB = (value: number) => {
    filter.value = $Filter.setLiftB(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setGammaR = (value: number) => {
    filter.value = $Filter.setGammaR(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setGammaG = (value: number) => {
    filter.value = $Filter.setGammaG(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setGammaB = (value: number) => {
    filter.value = $Filter.setGammaB(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setGainR = (value: number) => {
    filter.value = $Filter.setGainR(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setGainG = (value: number) => {
    filter.value = $Filter.setGainG(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setGainB = (value: number) => {
    filter.value = $Filter.setGainB(filter.value, Math.max(-1, Math.min(1, value)))
    clearPresetId()
  }

  const setMasterPoint = (index: number, value: number) => {
    const newPoints = [...filter.value.master.points]
    newPoints[index] = Math.max(0, Math.min(1, value))
    filter.value = $Filter.setMaster(filter.value, { points: newPoints })
    clearPresetId()
  }

  const setMasterPoints = (points: number[]) => {
    filter.value = $Filter.setMaster(filter.value, { points })
    clearPresetId()
  }

  const reset = () => {
    filter.value = $Filter.identity(pointCount)
    currentPresetId.value = null
  }

  return {
    filter,
    lut,
    pixelEffects,
    currentPresetId,
    applyPreset,
    setExposure,
    setHighlights,
    setShadows,
    setWhites,
    setBlacks,
    setBrightness,
    setContrast,
    setTemperature,
    setTint,
    setClarity,
    setFade,
    setVibrance,
    setSplitShadowHue,
    setSplitShadowAmount,
    setSplitHighlightHue,
    setSplitHighlightAmount,
    setSplitBalance,
    setToe,
    setShoulder,
    setLiftR,
    setLiftG,
    setLiftB,
    setGammaR,
    setGammaG,
    setGammaB,
    setGainR,
    setGainG,
    setGainB,
    setMasterPoint,
    setMasterPoints,
    reset,
  }
}
