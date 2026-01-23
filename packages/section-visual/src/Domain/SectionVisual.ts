/**
 * SectionVisual - Canvas/WebGPU ベースのビジュアルセクション
 *
 * CSS vars を消費 + RangeExpr で timeline を参照する。
 */

// ============================================================================
// PropertyValue DSL
// ============================================================================

/** 静的な値 */
export interface StaticValue {
  readonly type: 'static'
  readonly value: string | number | boolean
}

/**
 * RangeExpr - Timeline トラックの intensity (0-1) を任意の範囲にマッピングする式
 *
 * 例: { type: 'range', trackId: 'track-mask-radius', min: 0.1, max: 0.45 }
 * → intensity 0 → 0.1, intensity 1 → 0.45
 */
export interface RangeExpr {
  readonly type: 'range'
  /** Timeline トラックID */
  readonly trackId: string
  /** intensity=0 のときの値 */
  readonly min: number
  /** intensity=1 のときの値 */
  readonly max: number
  /** min/max の範囲外の値をクランプするか (default: false) */
  readonly clamp?: boolean
}

export type PropertyValue = StaticValue | RangeExpr

// ============================================================================
// Visual Properties
// ============================================================================

export interface VisualProperties {
  readonly [key: string]: PropertyValue
}

// ============================================================================
// Config Reference Types
// ============================================================================

/**
 * Reference to a HeroViewConfig stored in Site.configs.hero
 */
export interface HeroConfigRef {
  readonly type: 'hero'
  readonly id: string
}

/**
 * Config reference union type (extensible for future config types)
 */
export type ConfigRef = HeroConfigRef

// ============================================================================
// SectionVisual
// ============================================================================

export interface SectionVisual {
  readonly kind: 'visual'
  readonly id: string
  /** 設定データへの参照（データ本体は Site.configs に格納） */
  readonly configRef?: ConfigRef
  /** プロパティ (RangeExpr を含む) - configRef使用時は通常不要 */
  readonly properties?: VisualProperties
}

// ============================================================================
// Helpers
// ============================================================================

export const $PropertyValue = {
  static: (value: string | number | boolean): StaticValue => ({
    type: 'static',
    value,
  }),

  /**
   * Create a RangeExpr that maps timeline track intensity (0-1) to a value range
   */
  range: (trackId: string, min: number, max: number, clamp?: boolean): RangeExpr => ({
    type: 'range',
    trackId,
    min,
    max,
    ...(clamp !== undefined ? { clamp } : {}),
  }),

  isStatic: (value: PropertyValue): value is StaticValue =>
    value.type === 'static',

  isRange: (value: PropertyValue): value is RangeExpr =>
    value.type === 'range',
} as const
