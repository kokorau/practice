import type { IntensityProvider as TimelineIntensityProvider } from '@practice/timeline'
import type { PropertyValue, RangeExpr, ColorValue } from './SectionVisual'
import { $PropertyValue } from './SectionVisual'

// Type alias for resolved values (includes ColorValue for color fields)
export type ResolvedValue = number | string | boolean | ColorValue
import type {
  HeroViewConfig,
  LayerNodeConfig,
  NormalizedSurfaceConfig,
  NormalizedMaskConfig,
  SingleEffectConfig,
  ProcessorConfig,
  AnySurfaceConfig,
  AnyMaskConfig,
} from './HeroViewConfig'
import {
  isNormalizedSurfaceConfig,
  normalizeSurfaceConfig,
  isNormalizedMaskConfig,
  normalizeMaskConfig,
} from './HeroViewConfig'

// ============================================================
// Simple IntensityProvider (function-based)
// ============================================================

/**
 * Provider function that returns intensity (0-1) for a given track ID
 * Simpler alternative to Timeline's IntensityProvider for standalone use
 */
export type IntensityProvider = (trackId: string) => number

/**
 * Default intensity provider that returns 0 for all tracks
 */
export const DEFAULT_INTENSITY_PROVIDER: IntensityProvider = () => 0

// ============================================================
// Standalone Resolution Functions
// ============================================================

/**
 * Resolve a PropertyValue to a concrete number
 *
 * For StaticValue: Returns the value directly
 * For RangeExpr: Interpolates between min and max based on intensity
 *
 * @param prop - PropertyValue to resolve
 * @param intensityProvider - Function that provides intensity for track IDs
 * @returns Resolved numeric value
 */
export function resolvePropertyValueToNumber(
  prop: PropertyValue,
  intensityProvider: IntensityProvider = DEFAULT_INTENSITY_PROVIDER
): number {
  if ($PropertyValue.isStatic(prop)) {
    if (typeof prop.value === 'number') {
      return prop.value
    }
    // Try to parse string as number
    if (typeof prop.value === 'string') {
      const parsed = parseFloat(prop.value)
      if (!isNaN(parsed)) {
        return parsed
      }
    }
    // Boolean or unparseable string
    return 0
  }

  // RangeExpr: interpolate between min and max
  const intensity = intensityProvider(prop.trackId)
  const clampedIntensity = prop.clamp
    ? Math.max(0, Math.min(1, intensity))
    : intensity
  return prop.min + (prop.max - prop.min) * clampedIntensity
}

/**
 * Resolve a PropertyValue to a concrete string
 *
 * For StaticValue: Returns the value as string
 * For RangeExpr: Interpolates and returns as string
 *
 * @param prop - PropertyValue to resolve
 * @param intensityProvider - Function that provides intensity for track IDs
 * @returns Resolved string value
 */
export function resolvePropertyValueToString(
  prop: PropertyValue,
  intensityProvider: IntensityProvider = DEFAULT_INTENSITY_PROVIDER
): string {
  if ($PropertyValue.isStatic(prop)) {
    return String(prop.value)
  }

  // RangeExpr: interpolate and convert to string
  const resolved = resolvePropertyValueToNumber(prop, intensityProvider)
  return String(resolved)
}

/**
 * Resolve a PropertyValue to a concrete boolean
 *
 * For StaticValue: Returns the value as boolean
 * For RangeExpr: Returns true if resolved value > 0.5
 *
 * @param prop - PropertyValue to resolve
 * @param intensityProvider - Function that provides intensity for track IDs
 * @returns Resolved boolean value
 */
export function resolvePropertyValueToBoolean(
  prop: PropertyValue,
  intensityProvider: IntensityProvider = DEFAULT_INTENSITY_PROVIDER
): boolean {
  if ($PropertyValue.isStatic(prop)) {
    if (typeof prop.value === 'boolean') {
      return prop.value
    }
    if (typeof prop.value === 'number') {
      return prop.value > 0.5
    }
    // String: truthy check
    return prop.value === 'true' || prop.value === '1'
  }

  // RangeExpr: threshold at 0.5
  const resolved = resolvePropertyValueToNumber(prop, intensityProvider)
  return resolved > 0.5
}

/**
 * Resolve a PropertyValue to its appropriate type
 *
 * Infers the type based on the value content:
 * - StaticValue boolean → boolean
 * - StaticValue string (non-numeric) → string
 * - Otherwise → number
 *
 * @param prop - PropertyValue to resolve
 * @param intensityProvider - Function that provides intensity for track IDs
 * @returns Resolved value (number, string, or boolean)
 */
export function resolvePropertyValueSimple(
  prop: PropertyValue,
  intensityProvider: IntensityProvider = DEFAULT_INTENSITY_PROVIDER
): ResolvedValue {
  if ($PropertyValue.isStatic(prop)) {
    return prop.value
  }

  // RangeExpr always resolves to number
  return resolvePropertyValueToNumber(prop, intensityProvider)
}

/**
 * Resolve all parameters in a Record to concrete values
 *
 * @param params - Record of PropertyValue parameters
 * @param intensityProvider - Function that provides intensity for track IDs
 * @returns Record with all PropertyValues resolved
 */
export function resolveParamsSimple(
  params: Record<string, PropertyValue>,
  intensityProvider: IntensityProvider = DEFAULT_INTENSITY_PROVIDER
): Record<string, ResolvedValue> {
  const resolved: Record<string, ResolvedValue> = {}

  for (const [key, prop] of Object.entries(params)) {
    resolved[key] = resolvePropertyValueSimple(prop, intensityProvider)
  }

  return resolved
}

// ============================================================
// PropertyResolver Factory (uses Timeline's IntensityProvider)
// ============================================================

/**
 * PropertyResolver - PropertyValue を実際の値に解決する
 *
 * IntensityProvider から取得した intensity (0-1) を使用して
 * PropertyValue を実際の値に変換する。
 */
export interface PropertyResolver {
  /** PropertyValue を実際の値に解決 */
  resolve(prop: PropertyValue): ResolvedValue

  /** params 一括解決 */
  resolveAll(params: Record<string, PropertyValue>): Record<string, ResolvedValue>

  /** この params が依存する trackId 一覧 */
  getDependencies(params: Record<string, PropertyValue>): Set<string>
}

/**
 * Resolve a RangeExpr using Timeline's IntensityProvider
 */
function resolveRangeExprWithTimeline(expr: RangeExpr, intensityProvider: TimelineIntensityProvider): number {
  const intensity = intensityProvider.get(expr.trackId) ?? 0
  let value = expr.min + intensity * (expr.max - expr.min)

  if (expr.clamp) {
    value = Math.max(expr.min, Math.min(expr.max, value))
  }

  return value
}

/**
 * PropertyResolver を作成
 *
 * IntensityProvider から intensity (0-1) を取得し、
 * RangeExpr を解決する。
 *
 * @param intensityProvider - IntensityProvider from @practice/timeline
 */
export function createPropertyResolver(intensityProvider: TimelineIntensityProvider): PropertyResolver {
  return {
    resolve(prop: PropertyValue): ResolvedValue {
      if ($PropertyValue.isStatic(prop)) {
        return prop.value
      }

      // RangeExpr: IntensityProvider から intensity を取得してマッピング
      if ($PropertyValue.isRange(prop)) {
        return resolveRangeExprWithTimeline(prop, intensityProvider)
      }

      return 0
    },

    resolveAll(params: Record<string, PropertyValue>): Record<string, ResolvedValue> {
      const result: Record<string, ResolvedValue> = {}
      for (const [key, prop] of Object.entries(params)) {
        result[key] = this.resolve(prop)
      }
      return result
    },

    getDependencies(params: Record<string, PropertyValue>): Set<string> {
      const deps = new Set<string>()
      for (const prop of Object.values(params)) {
        if ($PropertyValue.isRange(prop)) {
          deps.add(prop.trackId)
        }
      }
      return deps
    },
  }
}

// ============================================================
// HeroViewConfig Resolution
// ============================================================

/**
 * Check if a value is a PropertyValue (has 'type' property)
 */
function isPropertyValue(value: unknown): value is PropertyValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value.type === 'static' || value.type === 'range')
  )
}

/**
 * Normalize a param value to PropertyValue
 * If already a PropertyValue, return as-is
 * If raw value (number, string, boolean), wrap in StaticValue
 */
function normalizeToPropertyValue(value: unknown): PropertyValue {
  if (isPropertyValue(value)) {
    return value
  }
  // Raw value - wrap in StaticValue
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return $PropertyValue.static(value)
  }
  // Fallback for unexpected types
  return $PropertyValue.static(0)
}

/**
 * Resolve all PropertyValue in params to static values
 * Handles both raw values and PropertyValue objects
 */
function resolveParams(
  params: Record<string, PropertyValue | unknown>,
  resolver: PropertyResolver
): Record<string, PropertyValue> {
  const result: Record<string, PropertyValue> = {}
  for (const [key, rawProp] of Object.entries(params)) {
    // Normalize raw values to PropertyValue first
    const prop = normalizeToPropertyValue(rawProp)
    result[key] = $PropertyValue.static(resolver.resolve(prop))
  }
  return result
}

/**
 * Resolve surface config params (handles both legacy and normalized formats)
 */
function resolveSurfaceConfig(
  config: AnySurfaceConfig,
  resolver: PropertyResolver
): NormalizedSurfaceConfig {
  // Normalize first if legacy format
  const normalized = isNormalizedSurfaceConfig(config) ? config : normalizeSurfaceConfig(config)
  return {
    id: normalized.id,
    params: resolveParams(normalized.params, resolver),
  }
}

/**
 * Resolve mask config params (handles both legacy and normalized formats)
 */
function resolveMaskConfig(
  config: AnyMaskConfig,
  resolver: PropertyResolver
): NormalizedMaskConfig {
  // Normalize first if legacy format
  const normalized = isNormalizedMaskConfig(config) ? config : normalizeMaskConfig(config)
  return {
    id: normalized.id,
    params: resolveParams(normalized.params, resolver),
  }
}

/**
 * Resolve SingleEffectConfig params
 */
function resolveEffectConfig(
  config: SingleEffectConfig,
  resolver: PropertyResolver
): SingleEffectConfig {
  return {
    type: 'effect',
    id: config.id,
    params: resolveParams(config.params, resolver),
  }
}

/**
 * Resolve ProcessorConfig (effect or mask)
 */
function resolveProcessorConfig(
  config: ProcessorConfig,
  resolver: PropertyResolver
): ProcessorConfig {
  if (config.type === 'effect') {
    return resolveEffectConfig(config, resolver)
  }
  // Mask processor
  return {
    ...config,
    shape: resolveMaskConfig(config.shape, resolver),
  }
}

/**
 * Resolve all PropertyValue in a LayerNodeConfig tree
 */
function resolveLayerConfig(
  layer: LayerNodeConfig,
  resolver: PropertyResolver
): LayerNodeConfig {
  switch (layer.type) {
    case 'base':
    case 'surface':
      return {
        ...layer,
        surface: resolveSurfaceConfig(layer.surface, resolver),
      }
    case 'processor':
      return {
        ...layer,
        modifiers: layer.modifiers.map((m) => resolveProcessorConfig(m, resolver)),
      }
    case 'group':
      return {
        ...layer,
        children: layer.children.map((c) => resolveLayerConfig(c, resolver)),
      }
    default:
      return layer
  }
}

/**
 * Resolve all PropertyValue in HeroViewConfig to static values
 *
 * Use this before rendering to convert dynamic bindings to concrete values.
 *
 * @param config - HeroViewConfig with PropertyValue params
 * @param resolver - PropertyResolver instance
 * @returns HeroViewConfig with all params as StaticValue
 */
export function resolveHeroViewConfig(
  config: HeroViewConfig,
  resolver: PropertyResolver
): HeroViewConfig {
  return {
    ...config,
    layers: config.layers.map((layer) => resolveLayerConfig(layer, resolver)),
  }
}
