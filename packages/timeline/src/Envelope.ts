import type { Ms } from './Unit'

export type InterpolationType = 'Linear' | 'Bezier'

export interface ControlPoint {
  time: Ms
  value: number // 基本 0..1（必要なら表示レンジ拡張）
  // bezier handles optional
}

export interface Envelope {
  points: ControlPoint[]
  interpolation: InterpolationType
}
