/**
 * SectionVisual - Canvas/WebGPU ベースのビジュアルセクション
 *
 * CSS vars を消費 + binding 式で timeline を参照する。
 */

// ============================================================================
// Binding DSL
// ============================================================================

/** 静的な値 */
export interface StaticValue {
  readonly type: 'static'
  readonly value: string | number
}

/** timeline track への binding */
export interface BindingValue {
  readonly type: 'binding'
  /** timeline.tracks[trackUuid] を参照 */
  readonly track: string
  /** progress を range にマッピング [min, max] */
  readonly range: readonly [number, number]
}

export type PropertyValue = StaticValue | BindingValue

// ============================================================================
// Visual Properties
// ============================================================================

export interface VisualProperties {
  readonly [key: string]: PropertyValue
}

// ============================================================================
// SectionVisual
// ============================================================================

export interface SectionVisual {
  readonly kind: 'visual'
  readonly id: string
  /** プロパティ (binding 式を含む) */
  readonly properties: VisualProperties
}

// ============================================================================
// Helpers
// ============================================================================

export const $PropertyValue = {
  static: (value: string | number): StaticValue => ({
    type: 'static',
    value,
  }),

  binding: (track: string, range: [number, number]): BindingValue => ({
    type: 'binding',
    track,
    range,
  }),

  isBinding: (value: PropertyValue): value is BindingValue =>
    value.type === 'binding',

  isStatic: (value: PropertyValue): value is StaticValue =>
    value.type === 'static',
} as const
