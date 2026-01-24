/**
 * resolvePropertyValue
 *
 * PropertyValue (static/range) resolution to concrete values
 */

import type { PropertyValue } from '../../Domain/SectionVisual'
import { $PropertyValue } from '../../Domain/SectionVisual'

// ============================================================
// Types
// ============================================================

/**
 * Provider function that returns intensity (0-1) for a given track ID
 */
export type IntensityProvider = (trackId: string) => number

/**
 * Default intensity provider that returns 0 for all tracks
 */
export const DEFAULT_INTENSITY_PROVIDER: IntensityProvider = () => 0

// ============================================================
// Resolution Functions
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
export function resolvePropertyValue(
  prop: PropertyValue,
  intensityProvider: IntensityProvider = DEFAULT_INTENSITY_PROVIDER
): number | string | boolean {
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
export function resolveParams(
  params: Record<string, PropertyValue>,
  intensityProvider: IntensityProvider = DEFAULT_INTENSITY_PROVIDER
): Record<string, number | string | boolean> {
  const resolved: Record<string, number | string | boolean> = {}

  for (const [key, prop] of Object.entries(params)) {
    resolved[key] = resolvePropertyValue(prop, intensityProvider)
  }

  return resolved
}
