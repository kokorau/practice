/**
 * createMaskPreviewConfig
 *
 * Creates a mini HeroViewConfig for mask preset thumbnail preview.
 * Uses the actual Surface and Processor from the selected Clip Group,
 * with the mask children layers for preview.
 */

import type {
  HeroViewConfig,
  SurfaceLayerNodeConfig,
  ProcessorNodeConfig,
  MaskProcessorConfig,
  SingleEffectConfig,
  NormalizedSurfaceConfig,
  LayerNodeConfig,
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
 * Staticize a layer recursively
 */
function staticizeLayer(layer: LayerNodeConfig): LayerNodeConfig {
  switch (layer.type) {
    case 'base':
    case 'surface':
      return staticizeSurface(layer as SurfaceLayerNodeConfig)
    case 'group':
      return {
        ...layer,
        children: layer.children.map(staticizeLayer),
      }
    case 'processor':
      return {
        ...layer,
        modifiers: layer.modifiers.map((m) => {
          if (m.type === 'effect') {
            return staticizeEffect(m)
          }
          // mask
          return {
            ...m,
            children: m.children.map(staticizeLayer),
          }
        }),
      }
    default:
      return layer
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

  /** The mask children layers to preview */
  previewChildren: LayerNodeConfig[]

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
 *     - The preview mask with children
 *
 * @example
 * ```ts
 * const previewConfig = createMaskPreviewConfig({
 *   surface: clipGroupSurface,
 *   processor: selectedProcessor,
 *   previewChildren: [{ type: 'surface', id: 'mask-surface', ... }],
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
    previewChildren,
    viewport = { width: 256, height: 144 },
    semanticContext = 'canvas',
  } = options

  // Extract effects that come before the mask in the original processor
  // and convert any RangeExpr to static values
  const precedingEffects = getEffectsBeforeMask(processor.modifiers).map(staticizeEffect)

  // Create the mask modifier with staticized children
  const staticizedChildren = previewChildren.map(staticizeLayer)

  const maskModifier: MaskProcessorConfig = {
    type: 'mask',
    enabled: true,
    children: staticizedChildren,
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
