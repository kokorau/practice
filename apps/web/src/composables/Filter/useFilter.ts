import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { type Filter, type Lut, $Filter } from '../../modules/Filter/Domain'

export type UseFilterReturn = {
  filter: Ref<Filter>
  lut: ComputedRef<Lut>
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
    setMasterPoint,
    setMasterPoints,
    reset,
  }
}
