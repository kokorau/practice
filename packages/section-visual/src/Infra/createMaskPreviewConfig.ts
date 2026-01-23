/**
 * createMaskPreviewConfig
 *
 * Creates a mini HeroViewConfig for mask preset thumbnail preview.
 * Uses the actual Surface and Processor from the selected Clip Group,
 * with the mask shape replaced for each preset preview.
 */

import type {
  HeroViewConfig,
  SurfaceLayerNodeConfig,
  ProcessorNodeConfig,
  MaskProcessorConfig,
  SingleEffectConfig,
  NormalizedMaskConfig,
  NormalizedSurfaceConfig,
} from '../Domain/HeroViewConfig'
import { getEffectsBeforeMask } from '../Domain/HeroViewConfig'
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
 * Options for creating mask preview config
 */
export interface CreateMaskPreviewConfigOptions {
  /** The Surface layer from the selected Clip Group */
  surface: SurfaceLayerNodeConfig

  /** The Processor node (to extract preceding effects) */
  processor: ProcessorNodeConfig

  /** The mask shape config to preview */
  previewMask: NormalizedMaskConfig

  /** Viewport dimensions for the thumbnail */
  viewport?: { width: number; height: number }

  /** Semantic context for color resolution */
  semanticContext?: 'canvas' | 'sectionNeutral' | 'sectionTint' | 'sectionContrast'
}

/**
 * Creates a mini HeroViewConfig for mask preset thumbnail preview.
 *
 * The generated config contains:
 * - A group with:
 *   - The actual Surface from the Clip Group (with its colors)
 *   - A Processor with:
 *     - Preceding effects (effects before the mask in the original Processor)
 *     - The preview mask shape
 *
 * @example
 * ```ts
 * const previewConfig = createMaskPreviewConfig({
 *   surface: clipGroupSurface,
 *   processor: selectedProcessor,
 *   previewMask: { id: 'circle', params: { centerX: 0.5, centerY: 0.5, radius: 0.3 } },
 * })
 *
 * await renderWithPipeline(previewConfig, renderer, palette, { scale: 0.3 })
 * ```
 */
export function createMaskPreviewConfig(
  options: CreateMaskPreviewConfigOptions
): HeroViewConfig {
  const {
    surface,
    processor,
    previewMask,
    viewport = { width: 256, height: 144 },
    semanticContext = 'canvas',
  } = options

  // Extract effects that come before the mask in the original processor
  // and convert any RangeExpr to static values
  const precedingEffects = getEffectsBeforeMask(processor.modifiers).map(staticizeEffect)

  // Create the mask modifier with the preview shape
  // Staticize mask params to convert any RangeExpr to static values
  const staticizedMask: NormalizedMaskConfig = {
    id: previewMask.id,
    params: staticizeParams(previewMask.params),
  }

  const maskModifier: MaskProcessorConfig = {
    type: 'mask',
    enabled: true,
    shape: staticizedMask,
    invert: false,
    feather: 0,
  }

  // Build modifiers array: preceding effects + preview mask
  const modifiers: (SingleEffectConfig | MaskProcessorConfig)[] = [
    ...precedingEffects,
    maskModifier,
  ]

  // Create the processor node for preview
  const previewProcessor: ProcessorNodeConfig = {
    type: 'processor',
    id: 'preview-processor',
    name: 'Preview Processor',
    visible: true,
    modifiers,
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
