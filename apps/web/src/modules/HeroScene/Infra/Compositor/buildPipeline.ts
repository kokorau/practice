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
  TextLayerNodeConfig,
} from '../../Domain/HeroViewConfig'
import {
  getProcessorMask,
  DEFAULT_LAYER_BACKGROUND_COLORS,
  DEFAULT_LAYER_MASK_COLORS,
  getEffectConfigsFromModifiers,
  getProcessorTargetPairsFromConfig,
  isLegacyEffectFilterConfig,
  type EffectFilterConfig,
} from '../../Domain/HeroViewConfig'
import { migrateLegacyEffectConfig } from '../../Domain/HeroViewConfig'
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
  createTextRenderNode,
  type EffectConfig,
} from './index'
import {
  isDarkTheme,
  getMaskSurfaceKey,
} from '../../Domain/ColorHelpers'

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

/**
 * Find all text layers (including nested in groups)
 */
function findAllTextLayers(layers: LayerNodeConfig[]): TextLayerNodeConfig[] {
  const results: TextLayerNodeConfig[] = []

  for (const layer of layers) {
    if (layer.type === 'text' && layer.visible) {
      results.push(layer)
    } else if (layer.type === 'group') {
      // Recursively search in groups
      results.push(...findAllTextLayers(layer.children))
    }
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
// Effect Extraction from Filters
// ============================================================

/**
 * Get effect configs from surface layer filters
 * Handles both new SingleEffectConfig and legacy EffectFilterConfig formats
 */
function getEffectConfigsFromFilters(
  filters: EffectFilterConfig[] | undefined
): EffectConfig[] {
  if (!filters || filters.length === 0) return []

  const effects: EffectConfig[] = []

  for (const filter of filters) {
    if (!filter.enabled) continue

    if (isLegacyEffectFilterConfig(filter)) {
      // Migrate legacy format to SingleEffectConfig
      const migrated = migrateLegacyEffectConfig(filter)
      for (const single of migrated) {
        effects.push({ id: single.id, params: single.params })
      }
    }
  }

  return effects
}

/**
 * Build effect chain node from filters
 */
function buildEffectChainFromFilters(
  id: string,
  inputNode: RenderNode | CompositorNode,
  filters: EffectFilterConfig[] | undefined
): CompositorNode | null {
  const effects = getEffectConfigsFromFilters(filters)

  if (effects.length === 0) return null

  return createEffectChainCompositorNode(id, inputNode, effects)
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
  surfaceNode: RenderNode | CompositorNode,
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

/**
 * Find root-level processor nodes with valid targets
 */
function findRootProcessors(layers: LayerNodeConfig[]): ProcessorNodeConfig[] {
  const pairs = getProcessorTargetPairsFromConfig(layers, true)
  // Filter to only include processors with targets
  return pairs
    .filter(({ targets }) => targets.length > 0)
    .map(({ processor }) => processor)
}

/**
 * Build processor compositor node that applies to the final composite
 * Returns the new final node after applying processor effects
 */
function buildProcessorNode(
  id: string,
  inputNode: TextureProducingNode,
  processor: ProcessorNodeConfig,
  nodes: Array<RenderNode | CompositorNode | OutputNode>
): TextureProducingNode {
  let currentNode: TextureProducingNode = inputNode

  // 1. Apply mask if present
  const maskProcessor = getProcessorMask(processor)
  if (maskProcessor?.enabled && maskProcessor.shape) {
    const maskNode = createMaskRenderNode(`${id}-mask`, maskProcessor.shape)
    nodes.push(maskNode)

    const maskedNode = createMaskCompositorNode(
      `${id}-masked`,
      currentNode,
      maskNode
    )
    nodes.push(maskedNode)
    currentNode = maskedNode
  }

  // 2. Apply effects if present
  const effectConfigs = getEffectConfigsFromModifiers(processor.modifiers)
  if (effectConfigs.length > 0) {
    const effects: EffectConfig[] = effectConfigs.map((e) => ({
      id: e.id,
      params: e.params,
    }))
    const effectsNode = createEffectChainCompositorNode(`${id}-effects`, currentNode, effects)
    nodes.push(effectsNode)
    currentNode = effectsNode
  }

  return currentNode
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

    // Apply effects from filters if present
    let bgLayerNode: TextureProducingNode = bgSurfaceNode
    const bgEffectsNode = buildEffectChainFromFilters('bg-effects', bgSurfaceNode, baseLayer.filters)
    if (bgEffectsNode) {
      nodes.push(bgEffectsNode)
      bgLayerNode = bgEffectsNode
    }

    layerNodes.push(bgLayerNode)
  }

  // 2. Build clip-group layer nodes
  const clipGroups = findAllClipGroups(config.layers)
  for (let i = 0; i < clipGroups.length; i++) {
    const { group, surface, processor } = clipGroups[i]!
    const groupId = group.id || `clip-${i}`

    // Build surface node
    const surfaceNode = buildSurfaceNode(`${groupId}-surface`, surface, ctx)
    nodes.push(surfaceNode)

    // First, apply surface layer filters if present
    let currentNode: TextureProducingNode = surfaceNode
    const surfaceEffectsNode = buildEffectChainFromFilters(
      `${groupId}-surface-effects`,
      surfaceNode,
      surface.filters
    )
    if (surfaceEffectsNode) {
      nodes.push(surfaceEffectsNode)
      currentNode = surfaceEffectsNode
    }

    // Build mask node if processor has mask
    let layerNode: TextureProducingNode = currentNode

    if (processor) {
      const maskNode = buildMaskNode(`${groupId}-mask`, processor)

      if (maskNode) {
        nodes.push(maskNode)

        // Build masked layer with processor effects
        const maskedLayerNode = buildMaskedLayerNode(
          groupId,
          currentNode as RenderNode | CompositorNode,
          maskNode,
          processor
        )
        nodes.push(maskedLayerNode)
        layerNode = maskedLayerNode
      } else {
        // No mask, but may have processor effects
        const effectsNode = buildEffectChainNode(
          `${groupId}-effects`,
          currentNode as RenderNode | CompositorNode,
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

  // 3. Build text layer nodes
  const textLayers = findAllTextLayers(config.layers)
  for (let i = 0; i < textLayers.length; i++) {
    const textLayer = textLayers[i]!
    const textId = textLayer.id || `text-${i}`

    const textNode = createTextRenderNode(textId, textLayer)
    nodes.push(textNode)
    layerNodes.push(textNode)
  }

  // 4. Build overlay compositor (combines all layers)
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

  // 5. Apply root-level processor nodes (global masks/effects)
  const rootProcessors = findRootProcessors(config.layers)
  for (let i = 0; i < rootProcessors.length; i++) {
    const processor = rootProcessors[i]!
    const processorId = processor.id || `root-processor-${i}`
    finalNode = buildProcessorNode(processorId, finalNode, processor, nodes)
  }

  // 6. Build canvas output node
  const outputNode = createCanvasOutputNode('output', finalNode)
  nodes.push(outputNode)

  return {
    outputNode,
    nodes,
  }
}
