/**
 * buildPipeline
 *
 * Converts HeroViewConfig to a Compositor Node Graph.
 * This enables decoupled rendering with clear node responsibilities.
 */

import type { PrimitivePalette } from '../../../SemanticColorPalette/Domain'
import type {
  HeroViewConfig,
  LayerNodeConfig,
  GroupLayerNodeConfig,
  SurfaceLayerNodeConfig,
  ProcessorNodeConfig,
  BaseLayerNodeConfig,
  HeroPrimitiveKey,
} from '../../Domain/HeroViewConfig'
import {
  getProcessorMask,
  DEFAULT_LAYER_BACKGROUND_COLORS,
  DEFAULT_LAYER_MASK_COLORS,
  getEffectConfigsFromModifiers,
} from '../../Domain/HeroViewConfig'
import type {
  RenderNode,
  CompositorNode,
  OutputNode,
  TextureProducingNode,
} from '../../Domain/Compositor'
import {
  createSurfaceRenderNode,
  createMaskRenderNode,
  createMaskCompositorNode,
  createEffectChainCompositorNode,
  createOverlayCompositorNode,
  createCanvasOutputNode,
  type EffectConfig,
} from './index'

// ============================================================
// Pipeline Build Context
// ============================================================

/**
 * Context for building the pipeline.
 * Contains shared state and helpers.
 */
interface BuildContext {
  /** HeroViewConfig being processed */
  config: HeroViewConfig

  /** Primitive palette for color resolution */
  palette: PrimitivePalette

  /** Whether dark theme is active */
  isDark: boolean

  /** Mask surface key based on semantic context */
  maskSurfaceKey: string
}

// ============================================================
// Color Helpers (duplicated from renderHeroConfig to avoid coupling)
// ============================================================

/**
 * Get Oklch from palette by key
 */
function getOklchFromPalette(palette: PrimitivePalette, key: string): { L: number; C: number; H: number } {
  const oklch = (palette as Record<string, { L: number; C: number; H: number }>)[key]
  return oklch ?? { L: 0.5, C: 0, H: 0 }
}

/**
 * Determine if palette represents dark theme
 */
function isDarkTheme(palette: PrimitivePalette): boolean {
  const f0 = getOklchFromPalette(palette, 'F0')
  return f0.L < 0.5
}

type ContextName = 'canvas' | 'sectionNeutral' | 'sectionTint' | 'sectionContrast'

/**
 * Semantic context to primitive surface key mapping
 */
const CONTEXT_SURFACE_KEYS: Record<'light' | 'dark', Record<ContextName, string>> = {
  light: {
    canvas: 'F1',
    sectionNeutral: 'F2',
    sectionTint: 'Bt',
    sectionContrast: 'Bf',
  },
  dark: {
    canvas: 'F8',
    sectionNeutral: 'F7',
    sectionTint: 'Bs',
    sectionContrast: 'Bf',
  },
}

/**
 * Get mask surface key based on semantic context and theme
 */
function getMaskSurfaceKey(semanticContext: string, isDark: boolean): string {
  const mode = isDark ? 'dark' : 'light'
  const context = (semanticContext as ContextName) || 'canvas'
  return CONTEXT_SURFACE_KEYS[mode][context] ?? CONTEXT_SURFACE_KEYS[mode].canvas
}

// ============================================================
// Layer Finding Helpers
// ============================================================

/**
 * Find base layer (background) from layers array
 */
function findBaseLayer(layers: LayerNodeConfig[]): BaseLayerNodeConfig | SurfaceLayerNodeConfig | null {
  // First, check for background-group
  const bgGroup = layers.find(
    (l): l is GroupLayerNodeConfig => l.type === 'group' && l.id === 'background-group'
  )
  if (bgGroup) {
    const bgSurface = bgGroup.children.find(
      (c): c is SurfaceLayerNodeConfig => c.type === 'surface' && c.id === 'background'
    )
    if (bgSurface) return bgSurface
  }

  // Fallback: legacy base layer
  for (const layer of layers) {
    if (layer.type === 'base') return layer
  }
  return null
}

/**
 * Find all clip-groups (groups with surface layers, excluding background-group)
 */
function findAllClipGroups(layers: LayerNodeConfig[]): Array<{
  group: GroupLayerNodeConfig
  surface: SurfaceLayerNodeConfig
  processor: ProcessorNodeConfig | null
}> {
  const results: Array<{
    group: GroupLayerNodeConfig
    surface: SurfaceLayerNodeConfig
    processor: ProcessorNodeConfig | null
  }> = []

  for (const layer of layers) {
    if (layer.type !== 'group') continue
    if (layer.id === 'background-group') continue

    const group = layer as GroupLayerNodeConfig

    const surface = group.children.find(
      (c): c is SurfaceLayerNodeConfig => c.type === 'surface'
    )
    if (!surface) continue

    const processor = group.children.find(
      (c): c is ProcessorNodeConfig => c.type === 'processor'
    ) ?? null

    results.push({ group, surface, processor })
  }

  return results
}

// ============================================================
// Color Resolution Helpers
// ============================================================

/**
 * Get background colors from surface layer
 */
function getBackgroundColors(
  layer: BaseLayerNodeConfig | SurfaceLayerNodeConfig | null
): { primary: HeroPrimitiveKey; secondary: HeroPrimitiveKey | 'auto' } {
  const defaultPrimary = DEFAULT_LAYER_BACKGROUND_COLORS.primary as HeroPrimitiveKey
  const defaultSecondary = DEFAULT_LAYER_BACKGROUND_COLORS.secondary

  if (layer?.colors) {
    const primary = layer.colors.primary
    const secondary = layer.colors.secondary

    return {
      primary: (primary == null || primary === 'auto') ? defaultPrimary : primary,
      secondary: secondary ?? defaultSecondary,
    }
  }
  return {
    primary: defaultPrimary,
    secondary: defaultSecondary,
  }
}

/**
 * Get mask colors from surface layer
 */
function getMaskColors(
  layer: SurfaceLayerNodeConfig | null
): { primary: HeroPrimitiveKey | 'auto'; secondary: HeroPrimitiveKey | 'auto' } {
  const defaultPrimary = DEFAULT_LAYER_MASK_COLORS.primary
  const defaultSecondary = DEFAULT_LAYER_MASK_COLORS.secondary

  if (layer?.colors) {
    return {
      primary: layer.colors.primary ?? defaultPrimary,
      secondary: layer.colors.secondary ?? defaultSecondary,
    }
  }
  return {
    primary: defaultPrimary,
    secondary: defaultSecondary,
  }
}

/**
 * Resolve 'auto' color key to actual key based on theme and mask surface
 */
function resolveAutoColor(
  key: HeroPrimitiveKey | 'auto',
  maskSurfaceKey: string
): HeroPrimitiveKey {
  if (key === 'auto') {
    return maskSurfaceKey as HeroPrimitiveKey
  }
  return key
}

// ============================================================
// Node Building Functions
// ============================================================

/**
 * Build a surface render node from layer config
 */
function buildSurfaceNode(
  id: string,
  layer: BaseLayerNodeConfig | SurfaceLayerNodeConfig,
  ctx: BuildContext
): RenderNode {
  const colors = layer.type === 'base'
    ? getBackgroundColors(layer)
    : getMaskColors(layer)

  // For background, resolve auto to canvas surface key
  const canvasSurfaceKey = ctx.isDark ? 'F8' : 'F1'
  const primary = colors.primary === 'auto'
    ? canvasSurfaceKey as HeroPrimitiveKey
    : colors.primary
  const secondary = resolveAutoColor(colors.secondary, ctx.maskSurfaceKey)

  return createSurfaceRenderNode(
    id,
    layer.surface,
    { primary, secondary }
  )
}

/**
 * Build a mask render node from processor config
 */
function buildMaskNode(
  id: string,
  processor: ProcessorNodeConfig
): RenderNode | null {
  const maskProcessor = getProcessorMask(processor)
  if (!maskProcessor?.enabled || !maskProcessor.shape) {
    return null
  }

  return createMaskRenderNode(id, maskProcessor.shape)
}

/**
 * Build effect chain compositor node from effect configs
 */
function buildEffectChainNode(
  id: string,
  inputNode: RenderNode | CompositorNode,
  processor: ProcessorNodeConfig
): CompositorNode | null {
  const effectConfigs = getEffectConfigsFromModifiers(processor.modifiers)

  if (effectConfigs.length === 0) {
    return null
  }

  // Convert SingleEffectConfig to EffectConfig
  const effects: EffectConfig[] = effectConfigs.map((e) => ({
    id: e.id,
    params: e.params,
  }))

  return createEffectChainCompositorNode(id, inputNode, effects)
}

/**
 * Build a masked layer compositor node
 */
function buildMaskedLayerNode(
  id: string,
  surfaceNode: RenderNode,
  maskNode: RenderNode,
  processor: ProcessorNodeConfig | null
): CompositorNode {
  // First, combine surface and mask
  const maskedNode = createMaskCompositorNode(
    `${id}-masked`,
    surfaceNode,
    maskNode
  )

  // Then apply effects if any
  if (processor) {
    const effectsNode = buildEffectChainNode(
      `${id}-effects`,
      maskedNode,
      processor
    )
    if (effectsNode) {
      return effectsNode
    }
  }

  return maskedNode
}

// ============================================================
// Main Pipeline Builder
// ============================================================

/**
 * Pipeline build result
 */
export interface PipelineResult {
  /** Root output node */
  outputNode: OutputNode

  /** All nodes in the graph (for debugging/inspection) */
  nodes: Array<RenderNode | CompositorNode | OutputNode>
}

/**
 * Build a compositor pipeline from HeroViewConfig
 *
 * @param config - HeroViewConfig to convert
 * @param palette - PrimitivePalette for color resolution
 * @returns Pipeline result with output node
 */
export function buildPipeline(
  config: HeroViewConfig,
  palette: PrimitivePalette
): PipelineResult {
  const isDark = isDarkTheme(palette)
  const semanticContext = config.colors.semanticContext ?? 'canvas'
  const maskSurfaceKey = getMaskSurfaceKey(semanticContext, isDark)

  const ctx: BuildContext = {
    config,
    palette,
    isDark,
    maskSurfaceKey,
  }

  const nodes: Array<RenderNode | CompositorNode | OutputNode> = []
  const layerNodes: TextureProducingNode[] = []

  // 1. Build background layer node
  const baseLayer = findBaseLayer(config.layers)
  if (baseLayer) {
    const bgSurfaceNode = buildSurfaceNode('bg-surface', baseLayer, ctx)
    nodes.push(bgSurfaceNode)
    layerNodes.push(bgSurfaceNode)
  }

  // 2. Build clip-group layer nodes
  const clipGroups = findAllClipGroups(config.layers)
  for (let i = 0; i < clipGroups.length; i++) {
    const { group, surface, processor } = clipGroups[i]!
    const groupId = group.id || `clip-${i}`

    // Build surface node
    const surfaceNode = buildSurfaceNode(`${groupId}-surface`, surface, ctx)
    nodes.push(surfaceNode)

    // Build mask node if processor has mask
    let layerNode: TextureProducingNode = surfaceNode

    if (processor) {
      const maskNode = buildMaskNode(`${groupId}-mask`, processor)

      if (maskNode) {
        nodes.push(maskNode)

        // Build masked layer with effects
        const maskedLayerNode = buildMaskedLayerNode(
          groupId,
          surfaceNode,
          maskNode,
          processor
        )
        nodes.push(maskedLayerNode)
        layerNode = maskedLayerNode
      } else {
        // No mask, but may have effects
        const effectsNode = buildEffectChainNode(
          `${groupId}-effects`,
          surfaceNode,
          processor
        )
        if (effectsNode) {
          nodes.push(effectsNode)
          layerNode = effectsNode
        }
      }
    }

    layerNodes.push(layerNode)
  }

  // 3. Build overlay compositor (combines all layers)
  let finalNode: TextureProducingNode

  if (layerNodes.length === 0) {
    throw new Error('[buildPipeline] No layers to render')
  } else if (layerNodes.length === 1) {
    finalNode = layerNodes[0]!
  } else {
    const overlayNode = createOverlayCompositorNode('scene', layerNodes)
    nodes.push(overlayNode)
    finalNode = overlayNode
  }

  // 4. Build canvas output node
  const outputNode = createCanvasOutputNode('output', finalNode)
  nodes.push(outputNode)

  return {
    outputNode,
    nodes,
  }
}
