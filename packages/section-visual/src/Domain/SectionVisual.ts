/**
 * SectionVisual - Canvas/WebGPU ベースのビジュアルセクション
 *
 * CSS vars を消費 + RangeExpr で timeline を参照する。
 */

// ============================================================================
// Color Types (shared with HeroViewConfig)
// ============================================================================

/**
 * PrimitiveKey type for color palette references
 * Original definition in SemanticColorPalette/Domain/ValueObject/PrimitivePalette.ts
 */
export type HeroPrimitiveKey =
  | 'BN0' | 'BN1' | 'BN2' | 'BN3' | 'BN4' | 'BN5' | 'BN6' | 'BN7' | 'BN8' | 'BN9'
  | 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9'
  | 'AN0' | 'AN1' | 'AN2' | 'AN3' | 'AN4' | 'AN5' | 'AN6' | 'AN7' | 'AN8' | 'AN9'
  | 'B' | 'Bt' | 'Bs' | 'Bf'
  | 'A' | 'At' | 'As' | 'Af'
  | 'F' | 'Ft' | 'Fs' | 'Ff'

/**
 * Custom color specified directly in HSV format
 * Used when users want to specify an exact color outside of the primitive palette
 */
export interface CustomColor {
  type: 'custom'
  /** Hue (0-360) */
  hue: number
  /** Saturation (0-100) */
  saturation: number
  /** Value/Brightness (0-100) */
  value: number
}

/**
 * Color value that can be a primitive key, 'auto', or a custom HSV color
 */
export type ColorValue = HeroPrimitiveKey | 'auto' | CustomColor

/**
 * Type guard for CustomColor
 */
export function isCustomColor(value: ColorValue): value is CustomColor {
  return typeof value === 'object' && value !== null && value.type === 'custom'
}

// ============================================================================
// PropertyValue DSL
// ============================================================================

/** 静的な値 (配列も含む - 例: gradient stops) */
export interface StaticValue {
  readonly type: 'static'
  readonly value: string | number | boolean | ColorValue | unknown[]
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
  static: (value: string | number | boolean | ColorValue | unknown[]): StaticValue => ({
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

  /**
   * Type guard to check if unknown value is a PropertyValue
   */
  isPropertyValue: (value: unknown): value is PropertyValue =>
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value.type === 'static' || value.type === 'range'),

  isStatic: (value: PropertyValue): value is StaticValue =>
    value.type === 'static',

  isRange: (value: PropertyValue): value is RangeExpr =>
    value.type === 'range',

  /**
   * Extract the static value from a property.
   * - For primitive values, return as-is.
   * - For StaticValue, return the inner value.
   * - For RangeExpr, return the 'min' value as the default static representation.
   */
  extractStatic: (prop: unknown): unknown => {
    if (prop === null || typeof prop !== 'object' || !('type' in prop)) {
      // Primitive value (number, string, etc.)
      return prop
    }
    const typed = prop as { type: string; value?: unknown; min?: number }
    if (typed.type === 'static') {
      return typed.value
    }
    if (typed.type === 'range') {
      return typed.min
    }
    // Unknown type
    return null
  },

  /**
   * Convert a record of params (which may contain PropertyValue) to static values.
   * Returns both the static values and a flag indicating if any params have DSL expressions.
   */
  toStaticParams: <T extends Record<string, unknown>>(
    params: Record<string, unknown>
  ): { staticParams: T; hasDSL: boolean } => {
    const staticParams: Record<string, unknown> = {}
    let hasDSL = false

    for (const [key, value] of Object.entries(params)) {
      if (
        value !== null &&
        typeof value === 'object' &&
        'type' in value &&
        (value as { type: string }).type === 'range'
      ) {
        hasDSL = true
      }
      staticParams[key] = $PropertyValue.extractStatic(value)
    }

    return { staticParams: staticParams as T, hasDSL }
  },
} as const
