import type { Space } from '../../../Lighting/Domain/ValueObject/Space'
import type { FilterPreset } from './FilterPreset'
import type { LayoutHtml } from './LayoutHtml'
import type { LightSource } from './LightSource'
import type { SemanticPalette } from './SemanticPalette'

/**
 * PreviewSceneConfig holds the configuration needed to generate a preview scene.
 * This is the input data before 3D scene generation.
 */
export type PreviewSceneConfig = {
  /** The layout template to preview */
  readonly layout: LayoutHtml
  /** The semantic palette for colors */
  readonly palette: SemanticPalette
  /** Light source configuration */
  readonly lightSource: LightSource
  /** Optional filter to apply */
  readonly filter?: FilterPreset
}

/**
 * PreviewScene represents a 3D scene for previewing the site design.
 * It wraps Lighting module's Space with SiteSimulator context.
 */
export type PreviewScene = {
  /** The underlying 3D space from Lighting module */
  readonly space: Space
  /** Original config used to generate this scene */
  readonly config: PreviewSceneConfig
  /** Viewport dimensions */
  readonly viewport: {
    readonly width: number
    readonly height: number
  }
}

/**
 * PreviewRenderOptions controls how the preview is rendered.
 */
export type PreviewRenderOptions = {
  /** Enable shadow rendering */
  readonly shadows: boolean
  /** Shadow blur radius (0 = sharp) */
  readonly shadowBlur: number
  /** Enable ambient occlusion */
  readonly ambientOcclusion: boolean
  /** Render quality (affects ray count, etc.) */
  readonly quality: 'low' | 'medium' | 'high'
}

export const $PreviewScene = {
  createConfig: undefined as unknown as (
    layout: LayoutHtml,
    palette: SemanticPalette,
    lightSource: LightSource,
    filter?: FilterPreset
  ) => PreviewSceneConfig,

  fromConfig: undefined as unknown as (
    config: PreviewSceneConfig,
    viewport: { width: number; height: number }
  ) => PreviewScene,

  defaultRenderOptions: (): PreviewRenderOptions => ({
    shadows: true,
    shadowBlur: 8,
    ambientOcclusion: false,
    quality: 'medium',
  }),
}
