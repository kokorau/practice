import { computed, type Ref, type ComputedRef } from 'vue'
import type { SurfaceConfig } from '../../modules/HeroScene'
import type { RGBA, TextureRenderSpec, SurfacePreset } from '@practice/texture'

type Viewport = { width: number; height: number }

/**
 * Options for creating surface patterns
 * @template P - The pattern type (TexturePattern or MidgroundSurfacePreset)
 */
export type CreateSurfacePatternsOptions<P> = {
  /** Array of patterns to map */
  patterns: P[]
  /** First color reference */
  color1: Ref<RGBA> | ComputedRef<RGBA>
  /** Second color reference */
  color2: Ref<RGBA> | ComputedRef<RGBA>
  /** Function to create the texture spec from a pattern */
  createSpec: (pattern: P, color1: RGBA, color2: RGBA, viewport: Viewport) => TextureRenderSpec | null
  /** Optional surface presets for surfaceConfig mapping */
  surfacePresets?: SurfacePreset[]
}

/**
 * Surface pattern item returned by the factory
 */
export type SurfacePatternItem = {
  label: string
  createSpec: (viewport: Viewport) => TextureRenderSpec | null
  surfaceConfig: SurfaceConfig | undefined
}

/**
 * Factory function to create surface patterns computed property.
 * Reduces duplication between backgroundPatterns and maskSurfacePatterns.
 *
 * @example
 * ```ts
 * const backgroundPatterns = createSurfacePatterns({
 *   patterns: texturePatterns,
 *   color1: textureColor1,
 *   color2: textureColor2,
 *   createSpec: (p, c1, c2, viewport) => p.createSpec(c1, c2, viewport),
 *   surfacePresets,
 * })
 * ```
 */
export function createSurfacePatterns<P extends { label: string }>(
  options: CreateSurfacePatternsOptions<P>
): ComputedRef<SurfacePatternItem[]> {
  const { patterns, color1, color2, createSpec, surfacePresets } = options

  return computed(() => {
    return patterns.map((pattern, index) => ({
      label: pattern.label,
      createSpec: (viewport: Viewport) =>
        createSpec(pattern, color1.value, color2.value, viewport),
      surfaceConfig: surfacePresets?.[index]?.params as SurfaceConfig | undefined,
    }))
  })
}
