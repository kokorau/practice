/**
 * createEffectPreviewConfig
 *
 * Creates a mini HeroViewConfig for effect preset thumbnail preview.
 * Uses the actual Surface from the selected Clip Group with the preview effect applied.
 * Does not include mask (shows effect preview on full surface).
 */

import type {
  HeroViewConfig,
  SurfaceLayerNodeConfig,
  ProcessorNodeConfig,
  SingleEffectConfig,
  NormalizedSurfaceConfig,
} from '../Domain/HeroViewConfig'
import type { PropertyValue } from '../Domain/SectionVisual'
import { $PropertyValue } from '../Domain/SectionVisual'

/**
 * Convert PropertyValue to static value (using min for RangeExpr)
 */
function staticizePropertyValue(prop: PropertyValue): PropertyValue {
  if ($PropertyValue.isStatic(prop)) {
    return prop
  }
  // For RangeExpr, use min value (base value when intensity=0)
  return $PropertyValue.static(prop.min)
}

/**
 * Convert all PropertyValue params to static values
 */
function staticizeParams(params: Record<string, PropertyValue>): Record<string, PropertyValue> {
  const result: Record<string, PropertyValue> = {}
  for (const [key, value] of Object.entries(params)) {
    result[key] = staticizePropertyValue(value)
  }
  return result
}

/**
 * Convert SurfaceLayerNodeConfig to use only static values
 */
function staticizeSurface(surface: SurfaceLayerNodeConfig): SurfaceLayerNodeConfig {
  const staticSurface: NormalizedSurfaceConfig = {
    id: surface.surface.id,
    params: staticizeParams(surface.surface.params),
  }
  return {
    ...surface,
    surface: staticSurface,
  }
}

/**
 * Convert SingleEffectConfig to use only static values
 */
function staticizeEffect(effect: SingleEffectConfig): SingleEffectConfig {
  return {
    ...effect,
    params: staticizeParams(effect.params as Record<string, PropertyValue>),
  }
}

/**
 * Options for creating effect preview config
 */
export interface CreateEffectPreviewConfigOptions {
  /** The Surface layer from the selected Clip Group */
  surface: SurfaceLayerNodeConfig

  /** The effect config to preview */
  previewEffect: SingleEffectConfig

  /** Viewport dimensions for the thumbnail */
  viewport?: { width: number; height: number }

  /** Semantic context for color resolution */
  semanticContext?: 'canvas' | 'sectionNeutral' | 'sectionTint' | 'sectionContrast'
}

/**
 * Creates a mini HeroViewConfig for effect preset thumbnail preview.
 *
 * The generated config contains:
 * - A group with:
 *   - The actual Surface from the Clip Group (with its colors)
 *   - A Processor with the preview effect (no mask)
 *
 * @example
 * ```ts
 * const previewConfig = createEffectPreviewConfig({
 *   surface: clipGroupSurface,
 *   previewEffect: { type: 'effect', id: 'blur', params: { radius: 8 } },
 * })
 *
 * await renderWithPipeline(previewConfig, renderer, palette, { scale: 0.3 })
 * ```
 */
export function createEffectPreviewConfig(
  options: CreateEffectPreviewConfigOptions
): HeroViewConfig {
  const {
    surface,
    previewEffect,
    viewport = { width: 256, height: 144 },
    semanticContext = 'canvas',
  } = options

  // Staticize the effect to convert any RangeExpr to static values
  const staticizedEffect = staticizeEffect(previewEffect)

  // Create the processor node with only the preview effect (no mask)
  const previewProcessor: ProcessorNodeConfig = {
    type: 'processor',
    id: 'preview-processor',
    name: 'Preview Processor',
    visible: true,
    modifiers: [staticizedEffect],
  }

  // Create a copy of the surface with a unique ID
  // and convert any RangeExpr to static values
  const previewSurface: SurfaceLayerNodeConfig = {
    ...staticizeSurface(surface),
    id: 'preview-surface',
    name: 'Preview Surface',
  }

  // Build the mini HeroViewConfig
  const config: HeroViewConfig = {
    viewport,
    colors: {
      semanticContext,
    },
    layers: [
      {
        type: 'group',
        id: 'preview-group',
        name: 'Preview Group',
        visible: true,
        children: [previewSurface, previewProcessor],
      },
    ],
    foreground: {
      elements: [],
    },
  }

  return config
}
