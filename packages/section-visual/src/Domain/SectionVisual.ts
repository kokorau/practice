/**
 * SectionVisual - Canvas/WebGPU ベースのビジュアルセクション
 *
 * CSS vars を消費 + binding 式で timeline を参照する。
 */

// ============================================================================
// PropertyValue DSL
// ============================================================================

/** 静的な値 */
export interface StaticValue {
  readonly type: 'static'
  readonly value: string | number | boolean
}

/** ParamResolver の解決済み値への参照 */
export interface BindingValue {
  readonly type: 'binding'
  /** ParamResolver のパラメータID */
  readonly paramId: string
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
  static: (value: string | number | boolean): StaticValue => ({
    type: 'static',
    value,
  }),

  binding: (paramId: string): BindingValue => ({
    type: 'binding',
    paramId,
  }),

  isBinding: (value: PropertyValue): value is BindingValue =>
    value.type === 'binding',

  isStatic: (value: PropertyValue): value is StaticValue =>
    value.type === 'static',
} as const
