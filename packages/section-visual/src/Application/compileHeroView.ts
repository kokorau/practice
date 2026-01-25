/**
 * compileHeroView
 *
 * Compile HeroViewConfig + PrimitivePalette to CompiledHeroView
 * All references are resolved to concrete values ready for rendering.
 *
 * Two-Pass Compilation:
 * 1. First pass: Compile all non-'auto' values, use fallback for 'auto' colors
 * 2. Render to canvas
 * 3. Second pass: Re-compile with canvasImageData to resolve 'auto' colors
 * 4. Final render with fully resolved colors
 */

import type { PrimitivePalette, PrimitiveKey, ContextName } from '@practice/semantic-color-palette/Domain'
import type {
  HeroViewConfig,
  LayerNodeConfig,
  SurfaceLayerNodeConfig,
  BaseLayerNodeConfig,
  TextLayerNodeConfig,
  ImageLayerNodeConfig,
  GroupLayerNodeConfig,
  ProcessorNodeConfig,
  ProcessorConfig,
  SingleEffectConfig,
  MaskProcessorConfig,
} from '../Domain/HeroViewConfig'
import type { ColorValue } from '../Domain/SectionVisual'
import type {
  CompiledHeroView,
  CompiledLayerNode,
  CompiledSurfaceLayerNode,
  CompiledTextLayerNode,
  CompiledImageLayerNode,
  CompiledGroupLayerNode,
  CompiledProcessorLayerNode,
  CompiledSurface,
  CompiledProcessorConfig,
  CompiledEffect,
  CompiledMaskProcessor,
} from '../Domain/CompiledHeroView'
import {
  resolveKeyToRgba,
  resolveSurfaceColorKey,
  getSurfaceKeyForContext,
} from './resolvers/resolveColors'
import {
  resolveParams,
  type IntensityProvider,
  DEFAULT_INTENSITY_PROVIDER,
} from './resolvers/resolvePropertyValue'
import {
  compileForegroundLayer,
  createDefaultColorContext,
  type ForegroundColorContext,
} from './resolvers/resolveForeground'

// ============================================================
// Types
// ============================================================

/**
 * Context for compiling HeroView
 */
export interface CompileContext {
  /**
   * Intensity provider for RangeExpr resolution
   * If not provided, all RangeExpr will use intensity=0 (min value)
   */
  intensityProvider?: IntensityProvider

  /**
   * Foreground color context for 'auto' color resolution
   * If not provided, uses fallback colors based on theme
   */
  foregroundColorContext?: ForegroundColorContext
}

// ============================================================
// Default Colors
// ============================================================

/**
 * Default color for background surface layer color1 (palette key)
 */
const DEFAULT_BACKGROUND_COLOR1: ColorValue = 'B'

/**
 * Default color for background surface layer color2 (palette key)
 */
const DEFAULT_BACKGROUND_COLOR2: ColorValue = 'auto'

/**
 * Default color for mask surface layer color1 (palette key)
 */
const DEFAULT_MASK_COLOR1: ColorValue = 'auto'

/**
 * Default color for mask surface layer color2 (palette key)
 */
const DEFAULT_MASK_COLOR2: ColorValue = 'auto'

// ============================================================
// Layer Compilation
// ============================================================

/**
 * Extract color value from resolved params
 * Color can be stored as PropertyValue (static) or already resolved
 */
function extractColorFromParams(
  resolvedParams: Record<string, unknown>,
  key: string,
  defaultColor: ColorValue
): ColorValue {
  const value = resolvedParams[key]
  if (value === undefined) {
    return defaultColor
  }
  // Value is already resolved from PropertyValue to ColorValue
  return value as ColorValue
}

/**
 * Compile surface layer node
 */
function compileSurfaceLayer(
  layer: SurfaceLayerNodeConfig | BaseLayerNodeConfig,
  palette: PrimitivePalette,
  isDark: boolean,
  intensityProvider: IntensityProvider,
  isBackground: boolean
): CompiledSurfaceLayerNode {
  const semanticContext: ContextName = 'canvas'
  const surfaceKey = getSurfaceKeyForContext(semanticContext, isDark)

  // Resolve surface params (including color1/color2)
  const resolvedParams = resolveParams(layer.surface.params, intensityProvider)

  // Extract color values from resolved params with layer-type-aware defaults
  const color1Key = extractColorFromParams(
    resolvedParams,
    'color1',
    isBackground ? DEFAULT_BACKGROUND_COLOR1 : DEFAULT_MASK_COLOR1
  )
  const color2Key = extractColorFromParams(
    resolvedParams,
    'color2',
    isBackground ? DEFAULT_BACKGROUND_COLOR2 : DEFAULT_MASK_COLOR2
  )

  // Resolve colors to RGBA
  const color1 = resolveSurfaceColorKey(
    palette,
    color1Key,
    surfaceKey,
    isDark,
    true // isPrimary
  )
  const color2 = resolveSurfaceColorKey(
    palette,
    color2Key,
    surfaceKey,
    isDark,
    false // isSecondary
  )

  // Remove color fields from params (they are handled separately as color1/color2)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { color1: _c1, color2: _c2, ...paramsWithoutColors } = resolvedParams

  const compiledSurface: CompiledSurface = {
    id: layer.surface.id,
    params: paramsWithoutColors as Record<string, number | string | boolean>,
    color1,
    color2,
  }

  return {
    type: 'surface',
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    surface: compiledSurface,
  }
}

/**
 * Compile text layer node
 */
function compileTextLayer(
  layer: TextLayerNodeConfig,
  palette: PrimitivePalette
): CompiledTextLayerNode {
  // Text color is stored as a string (CSS color or palette key)
  // Try to resolve as palette key, fallback to parsing as color
  const colorRgba = resolveKeyToRgba(palette, layer.color as PrimitiveKey)

  return {
    type: 'text',
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    text: layer.text,
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight,
    letterSpacing: layer.letterSpacing,
    lineHeight: layer.lineHeight,
    color: colorRgba,
    position: layer.position,
    rotation: layer.rotation,
  }
}

/**
 * Compile image layer node
 */
function compileImageLayer(
  layer: ImageLayerNodeConfig
): CompiledImageLayerNode {
  return {
    type: 'image',
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    imageId: layer.imageId,
    mode: layer.mode,
    position: layer.position,
  }
}

/**
 * Compile effect processor
 */
function compileEffect(
  effect: SingleEffectConfig,
  intensityProvider: IntensityProvider
): CompiledEffect {
  // Effect params don't contain ColorValue, safe to cast
  const params = resolveParams(effect.params, intensityProvider) as Record<string, number | string | boolean>
  return {
    type: 'effect',
    id: effect.id,
    params,
  }
}

/**
 * Compile mask processor
 *
 * The mask children are compiled using the same layer compilation logic.
 * The compileChildLayers function is passed in to avoid circular dependency.
 */
function compileMaskProcessor(
  mask: MaskProcessorConfig,
  compileChildLayers: (layers: LayerNodeConfig[]) => CompiledLayerNode[]
): CompiledMaskProcessor {
  // Compile children layers as mask source
  const compiledChildren = compileChildLayers(mask.children)

  return {
    type: 'mask',
    enabled: mask.enabled,
    children: compiledChildren,
    invert: mask.invert,
    feather: mask.feather,
  }
}

/**
 * Compile processor config (effect or mask)
 *
 * @param config - The processor config to compile
 * @param intensityProvider - Provider for resolving PropertyValue ranges
 * @param compileChildLayers - Function to compile mask children layers
 */
function compileProcessorConfig(
  config: ProcessorConfig,
  intensityProvider: IntensityProvider,
  compileChildLayers: (layers: LayerNodeConfig[]) => CompiledLayerNode[]
): CompiledProcessorConfig {
  if (config.type === 'effect') {
    return compileEffect(config, intensityProvider)
  }
  return compileMaskProcessor(config, compileChildLayers)
}

/**
 * Compile processor layer node
 *
 * @param layer - The processor layer to compile
 * @param intensityProvider - Provider for resolving PropertyValue ranges
 * @param compileChildLayers - Function to compile mask children layers
 */
function compileProcessorLayer(
  layer: ProcessorNodeConfig,
  intensityProvider: IntensityProvider,
  compileChildLayers: (layers: LayerNodeConfig[]) => CompiledLayerNode[]
): CompiledProcessorLayerNode {
  return {
    type: 'processor',
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    modifiers: layer.modifiers.map((mod) =>
      compileProcessorConfig(mod, intensityProvider, compileChildLayers)
    ),
  }
}

/**
 * Check if a layer is the first surface layer (background)
 */
function isFirstSurfaceInTree(
  layers: LayerNodeConfig[],
  targetId: string,
  foundFirst: { value: boolean } = { value: false }
): boolean {
  for (const layer of layers) {
    if (layer.type === 'surface' || layer.type === 'base') {
      if (!foundFirst.value) {
        foundFirst.value = true
        return layer.id === targetId
      }
      return false
    }
    if (layer.type === 'group') {
      const result = isFirstSurfaceInTree(layer.children, targetId, foundFirst)
      if (foundFirst.value) {
        return result
      }
    }
  }
  return false
}

/**
 * Compile layer nodes recursively
 */
function compileLayerNodes(
  layers: LayerNodeConfig[],
  palette: PrimitivePalette,
  isDark: boolean,
  intensityProvider: IntensityProvider,
  rootLayers: LayerNodeConfig[]
): CompiledLayerNode[] {
  // Create a closure for compiling child layers (used for mask children)
  const compileChildLayers = (childLayers: LayerNodeConfig[]): CompiledLayerNode[] => {
    return compileLayerNodes(
      childLayers,
      palette,
      isDark,
      intensityProvider,
      rootLayers
    )
  }

  return layers.map((layer) => {
    switch (layer.type) {
      case 'base':
      case 'surface': {
        const isBackground = isFirstSurfaceInTree(rootLayers, layer.id)
        return compileSurfaceLayer(
          layer as SurfaceLayerNodeConfig | BaseLayerNodeConfig,
          palette,
          isDark,
          intensityProvider,
          isBackground
        )
      }
      case 'text':
        return compileTextLayer(layer as TextLayerNodeConfig, palette)
      case 'image':
        return compileImageLayer(layer as ImageLayerNodeConfig)
      case 'group': {
        const groupLayer = layer as GroupLayerNodeConfig
        const compiledChildren = compileChildLayers(groupLayer.children)
        const compiledGroup: CompiledGroupLayerNode = {
          type: 'group',
          id: groupLayer.id,
          name: groupLayer.name,
          visible: groupLayer.visible,
          children: compiledChildren,
          blendMode: groupLayer.blendMode,
        }
        return compiledGroup
      }
      case 'processor':
        return compileProcessorLayer(layer as ProcessorNodeConfig, intensityProvider, compileChildLayers)
      default:
        // Unknown layer type - create a minimal compiled node
        return {
          type: 'surface',
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          surface: {
            id: 'solid' as const,
            params: {},
            color1: [0.5, 0.5, 0.5, 1] as [number, number, number, number],
            color2: [0.5, 0.5, 0.5, 1] as [number, number, number, number],
          },
        } as CompiledSurfaceLayerNode
    }
  })
}

// ============================================================
// Main Compile Function
// ============================================================

/**
 * Compile HeroViewConfig to CompiledHeroView
 *
 * @param config - HeroViewConfig to compile
 * @param palette - PrimitivePalette for color resolution
 * @param isDark - Whether dark theme is active
 * @param context - Optional compilation context
 * @returns Fully compiled CompiledHeroView
 */
export function compileHeroView(
  config: HeroViewConfig,
  palette: PrimitivePalette,
  isDark: boolean,
  context?: CompileContext
): CompiledHeroView {
  const intensityProvider = context?.intensityProvider ?? DEFAULT_INTENSITY_PROVIDER
  const foregroundColorContext = context?.foregroundColorContext ??
    createDefaultColorContext(palette, isDark)

  // Compile layer tree
  const compiledLayers = compileLayerNodes(
    config.layers,
    palette,
    isDark,
    intensityProvider,
    config.layers
  )

  // Compile foreground layer
  const compiledForeground = compileForegroundLayer(
    config.foreground,
    palette,
    foregroundColorContext
  )

  return {
    viewport: {
      width: config.viewport.width,
      height: config.viewport.height,
    },
    isDark,
    layers: compiledLayers,
    foreground: compiledForeground,
  }
}

// ============================================================
// Re-exports for convenience
// ============================================================

export type { IntensityProvider, ForegroundColorContext }
export { DEFAULT_INTENSITY_PROVIDER, createDefaultColorContext }
