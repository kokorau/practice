import { computed, type Ref, type ComputedRef } from 'vue'
import type { AnySurfaceConfig } from '@practice/section-visual'
import type { RGBA, TextureRenderSpec, GenericSurfaceParams } from '@practice/texture'

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
}

/**
 * Surface pattern item returned by the factory
 */
export type SurfacePatternItem = {
  label: string
  createSpec: (viewport: Viewport) => TextureRenderSpec | null
  surfaceConfig: AnySurfaceConfig | undefined
}

/**
 * Factory function to create surface patterns computed property.
 * Reduces duplication between backgroundPatterns and maskSurfacePatterns.
 *
 * Pattern objects must include a `params` field containing SurfacePresetParams,
 * which is used directly for surfaceConfig mapping (no index-based lookup needed).
 *
 * @example
 * ```ts
 * const backgroundPatterns = createSurfacePatterns({
 *   patterns: texturePatterns,
 *   color1: textureColor1,
 *   color2: textureColor2,
 *   createSpec: (p, c1, c2, viewport) => p.createSpec(c1, c2, viewport),
 * })
 * ```
 */
export function createSurfacePatterns<P extends { label: string; params?: GenericSurfaceParams }>(
  options: CreateSurfacePatternsOptions<P>
): ComputedRef<SurfacePatternItem[]> {
  const { patterns, color1, color2, createSpec } = options

  return computed(() => {
    return patterns.map((pattern) => ({
      label: pattern.label,
      createSpec: (viewport: Viewport) =>
        createSpec(pattern, color1.value, color2.value, viewport),
      surfaceConfig: pattern.params as AnySurfaceConfig | undefined,
    }))
  })
}
