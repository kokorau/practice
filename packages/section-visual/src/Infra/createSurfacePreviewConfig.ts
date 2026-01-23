/**
 * createSurfacePreviewConfig
 *
 * Creates a mini HeroViewConfig for surface preset thumbnail preview.
 * Uses the Surface with optional preceding effects (no mask).
 * Used for PatternThumbnail component in pipeline mode.
 */

import type {
  HeroViewConfig,
  SurfaceLayerNodeConfig,
  ProcessorNodeConfig,
  SingleEffectConfig,
  NormalizedSurfaceConfig,
  SurfaceColorsConfig,
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
 * Convert SingleEffectConfig to use only static values
 */
function staticizeEffect(effect: SingleEffectConfig): SingleEffectConfig {
  return {
    ...effect,
    params: staticizeParams(effect.params as Record<string, PropertyValue>),
  }
}

/**
 * Options for creating surface preview config
 */
export interface CreateSurfacePreviewConfigOptions {
  /** The Surface to preview */
  previewSurface: NormalizedSurfaceConfig

  /** The Processor node (to extract preceding effects, optional) */
  processor?: ProcessorNodeConfig

  /** Per-surface color configuration */
  colors?: SurfaceColorsConfig

  /** Viewport dimensions for the thumbnail */
  viewport?: { width: number; height: number }

  /** Semantic context for color resolution */
  semanticContext?: 'canvas' | 'sectionNeutral' | 'sectionTint' | 'sectionContrast'
}

/**
 * Creates a mini HeroViewConfig for surface preset thumbnail preview.
 *
 * The generated config contains:
 * - A group with:
 *   - The preview Surface (with its colors)
 *   - A Processor with preceding effects (if processor is provided)
 *
 * Note: No mask is included - this is for Surface pattern preview only.
 *
 * @example
 * ```ts
 * const previewConfig = createSurfacePreviewConfig({
 *   previewSurface: { id: 'stripe', params: { width1: 20, width2: 20, angle: 45 } },
 *   processor: selectedProcessor,  // optional
 *   colors: { primary: 'B', secondary: 'auto' },
 * })
 *
 * await renderWithPipeline(previewConfig, renderer, palette, { scale: 0.3 })
 * ```
 */
export function createSurfacePreviewConfig(
  options: CreateSurfacePreviewConfigOptions
): HeroViewConfig {
  const {
    previewSurface,
    processor,
    colors,
    viewport = { width: 256, height: 144 },
    semanticContext = 'canvas',
  } = options

  // Create a copy of the surface with a unique ID
  // and convert any RangeExpr to static values
  const staticSurface: NormalizedSurfaceConfig = {
    id: previewSurface.id,
    params: staticizeParams(previewSurface.params),
  }

  const previewSurfaceLayer: SurfaceLayerNodeConfig = {
    type: 'surface',
    id: 'preview-surface',
    name: 'Preview Surface',
    visible: true,
    surface: staticSurface,
    colors,
  }

  // Build children array
  const children: (SurfaceLayerNodeConfig | ProcessorNodeConfig)[] = [previewSurfaceLayer]

  // If processor is provided, extract preceding effects and add as processor
  if (processor) {
    const precedingEffects = getEffectsBeforeMask(processor.modifiers).map(staticizeEffect)

    if (precedingEffects.length > 0) {
      const previewProcessor: ProcessorNodeConfig = {
        type: 'processor',
        id: 'preview-processor',
        name: 'Preview Processor',
        visible: true,
        modifiers: precedingEffects,
      }
      children.push(previewProcessor)
    }
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
        children,
      },
    ],
    foreground: {
      elements: [],
    },
  }

  return config
}
