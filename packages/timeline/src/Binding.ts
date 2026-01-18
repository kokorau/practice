// TODO: 上位パッケージ (@practice/scene等) に移動予定
// timeline と shader を繋ぐ役割のため、両方を参照する上位層が適切

import type { TrackId } from './Track'

export type ParamId = string

export interface RangeMap {
  min: number
  max: number
  clamp?: boolean
}

export interface Binding {
  targetParam: ParamId
  sourceTrack: TrackId
  map: RangeMap
  // combine: add/mul/max etc（将来）
}
