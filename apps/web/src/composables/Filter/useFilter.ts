import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { type Filter, type Lut, $Filter } from '../../modules/Filter/Domain'

/** LUTに焼けないピクセル単位エフェクト */
export type PixelEffects = {
  vibrance: number
}

export type UseFilterReturn = {
  filter: Ref<Filter>
  lut: ComputedRef<Lut>
  /** LUTに焼けないエフェクト (vibrance等) */
  pixelEffects: ComputedRef<PixelEffects>
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

  const lut = computed<Lut>(() => $Filter.toLut(filter.value))

  // LUTに焼けないエフェクト
  const pixelEffects = computed<PixelEffects>(() => ({
    vibrance: filter.value.adjustment.vibrance,
  }))

  const setExposure = (value: number) => {
    filter.value = $Filter.setExposure(filter.value, Math.max(-2, Math.min(2, value)))
  }

  const setHighlights = (value: number) => {
    filter.value = $Filter.setHighlights(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setShadows = (value: number) => {
    filter.value = $Filter.setShadows(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setWhites = (value: number) => {
    filter.value = $Filter.setWhites(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setBlacks = (value: number) => {
    filter.value = $Filter.setBlacks(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setBrightness = (value: number) => {
    filter.value = $Filter.setBrightness(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setContrast = (value: number) => {
    filter.value = $Filter.setContrast(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setTemperature = (value: number) => {
    filter.value = $Filter.setTemperature(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setTint = (value: number) => {
    filter.value = $Filter.setTint(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setClarity = (value: number) => {
    filter.value = $Filter.setClarity(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setFade = (value: number) => {
    filter.value = $Filter.setFade(filter.value, Math.max(0, Math.min(1, value)))
  }

  const setVibrance = (value: number) => {
    filter.value = $Filter.setVibrance(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setSplitShadowHue = (value: number) => {
    filter.value = $Filter.setSplitShadowHue(filter.value, ((value % 360) + 360) % 360)
  }

  const setSplitShadowAmount = (value: number) => {
    filter.value = $Filter.setSplitShadowAmount(filter.value, Math.max(0, Math.min(1, value)))
  }

  const setSplitHighlightHue = (value: number) => {
    filter.value = $Filter.setSplitHighlightHue(filter.value, ((value % 360) + 360) % 360)
  }

  const setSplitHighlightAmount = (value: number) => {
    filter.value = $Filter.setSplitHighlightAmount(filter.value, Math.max(0, Math.min(1, value)))
  }

  const setSplitBalance = (value: number) => {
    filter.value = $Filter.setSplitBalance(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setToe = (value: number) => {
    filter.value = $Filter.setToe(filter.value, Math.max(0, Math.min(1, value)))
  }

  const setShoulder = (value: number) => {
    filter.value = $Filter.setShoulder(filter.value, Math.max(0, Math.min(1, value)))
  }

  const setLiftR = (value: number) => {
    filter.value = $Filter.setLiftR(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setLiftG = (value: number) => {
    filter.value = $Filter.setLiftG(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setLiftB = (value: number) => {
    filter.value = $Filter.setLiftB(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setGammaR = (value: number) => {
    filter.value = $Filter.setGammaR(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setGammaG = (value: number) => {
    filter.value = $Filter.setGammaG(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setGammaB = (value: number) => {
    filter.value = $Filter.setGammaB(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setGainR = (value: number) => {
    filter.value = $Filter.setGainR(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setGainG = (value: number) => {
    filter.value = $Filter.setGainG(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setGainB = (value: number) => {
    filter.value = $Filter.setGainB(filter.value, Math.max(-1, Math.min(1, value)))
  }

  const setMasterPoint = (index: number, value: number) => {
    const newPoints = [...filter.value.master.points]
    newPoints[index] = Math.max(0, Math.min(1, value))
    filter.value = $Filter.setMaster(filter.value, { points: newPoints })
  }

  const setMasterPoints = (points: number[]) => {
    filter.value = $Filter.setMaster(filter.value, { points })
  }

  const reset = () => {
    filter.value = $Filter.identity(pointCount)
  }

  return {
    filter,
    lut,
    pixelEffects,
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
