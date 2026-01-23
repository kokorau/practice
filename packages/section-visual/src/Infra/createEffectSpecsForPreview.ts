/**
 * createEffectSpecsForPreview
 *
 * Utility to convert SingleEffectConfig[] to EffectShaderSpec[] for thumbnail preview.
 * Used by MaskPatternThumbnail to apply preceding effects before mask overlay.
 */

import type { SingleEffectConfig } from '../Domain/HeroViewConfig'
import type { EffectShaderSpec, EffectType } from '../Domain/EffectRegistry'
import { EFFECT_REGISTRY, isValidEffectType } from '../Domain/EffectRegistry'
import type { Viewport } from '@practice/texture'
import { $PropertyValue } from '../Domain/SectionVisual'

/**
 * Extract raw values from PropertyValue-wrapped params
 */
function extractRawParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    if ($PropertyValue.isPropertyValue(value)) {
      if ($PropertyValue.isStatic(value)) {
        result[key] = value.value
      } else if ($PropertyValue.isRange(value)) {
        // Use min value for preview (base state)
        result[key] = value.min
      }
    } else {
      // Already a raw value
      result[key] = value
    }
  }
  return result
}

/**
 * Create EffectShaderSpec array from SingleEffectConfig array for preview rendering.
 *
 * @param effects - Array of SingleEffectConfig to convert
 * @param viewport - Viewport dimensions for shader uniforms
 * @param scale - Scale factor for effect parameters (default: 1)
 * @returns Array of EffectShaderSpec ready for TextureRenderer.applyPostEffect
 *
 * @example
 * ```typescript
 * const effectSpecs = createEffectSpecsForPreview(
 *   precedingEffects,
 *   { width: 256, height: 144 },
 *   1
 * )
 * // Use with TextureRenderer to apply effects
 * ```
 */
export function createEffectSpecsForPreview(
  effects: SingleEffectConfig[],
  viewport: Viewport,
  scale: number = 1
): EffectShaderSpec[] {
  const specs: EffectShaderSpec[] = []

  for (const effect of effects) {
    // Skip invalid effect types
    if (!isValidEffectType(effect.id)) {
      console.warn(`[createEffectSpecsForPreview] Unknown effect type "${effect.id}", skipping`)
      continue
    }

    const effectType = effect.id as EffectType
    const definition = EFFECT_REGISTRY[effectType]

    // Extract raw values from PropertyValue
    const rawParams = extractRawParams(effect.params as Record<string, unknown>)

    // Create shader spec
    const spec = definition.createShaderSpec(rawParams as never, viewport, scale)
    if (spec) {
      specs.push(spec)
    }
  }

  return specs
}
