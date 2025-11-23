import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { type Filter, type Lut, $Filter } from '../../modules/Filter/Domain'

export type UseFilterReturn = {
  filter: Ref<Filter>
  lut: ComputedRef<Lut>
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
    setMasterPoint,
    setMasterPoints,
    reset,
  }
}
