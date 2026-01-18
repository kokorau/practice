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
  SingleEffectConfig,
} from '../../Domain/HeroViewConfig'
import {
  getProcessorMask,
  DEFAULT_LAYER_BACKGROUND_COLORS,
  DEFAULT_LAYER_MASK_COLORS,
  getProcessorTargetPairsFromConfig,
  isSingleEffectConfig,
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
  createTextRenderNode,
  type EffectConfig,
} from './index'
import { createImageRenderNode } from './nodes/ImageRenderNode'
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
 * Note: Returns null if the base layer is not visible
 */
function findBaseLayer(layers: LayerNodeConfig[]): BaseLayerNodeConfig | SurfaceLayerNodeConfig | null {
  // First, check for background-group
  const bgGroup = layers.find(
    (l): l is GroupLayerNodeConfig => l.type === 'group' && l.id === 'background-group' && l.visible
  )
  if (bgGroup) {
    const bgSurface = bgGroup.children.find(
      (c): c is SurfaceLayerNodeConfig => c.type === 'surface' && c.id === 'background' && c.visible
    )
    if (bgSurface) return bgSurface
  }

  // Fallback: legacy base layer
  for (const layer of layers) {
    if (layer.type === 'base' && layer.visible) return layer
  }
  return null
}

/**
 * Find all non-background groups at the specified level
 * Note: Does not recurse into nested groups (they are handled by buildGroupNode)
 */
function findNonBackgroundGroups(layers: LayerNodeConfig[]): GroupLayerNodeConfig[] {
  return layers.filter(
    (l): l is GroupLayerNodeConfig =>
      l.type === 'group' && l.id !== 'background-group' && l.visible
  )
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
  const effectConfigs = processor.modifiers.filter(
    (m): m is SingleEffectConfig => isSingleEffectConfig(m)
  )
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
// Group Node Builder (Sequential Processing)
// ============================================================

/**
 * Build a group node by sequentially processing children.
 *
 * Processor semantics:
 * - A Processor applies to all preceding siblings (accumulated so far)
 * - Multiple Processors apply cumulatively
 *
 * Example:
 *   <group>
 *     <surface/>        [0]
 *     <text/>           [1]
 *     <processor mask/> → applies to [0]+[1]
 *     <text/>           [3]
 *     <processor fx/>   → applies to masked([0]+[1]) + [3]
 *   </group>
 */
function buildGroupNode(
  group: GroupLayerNodeConfig,
  ctx: BuildContext,
  nodes: Array<RenderNode | CompositorNode | OutputNode>
): TextureProducingNode | null {
  const groupId = group.id || 'group'
  let accumulatedNodes: TextureProducingNode[] = []

  for (let i = 0; i < group.children.length; i++) {
    const child = group.children[i]!
    if (!child.visible) continue

    const childId = child.id || `${groupId}-child-${i}`

    if (child.type === 'surface') {
      const surfaceNode = buildSurfaceNode(childId, child, ctx)
      nodes.push(surfaceNode)
      accumulatedNodes.push(surfaceNode)
    } else if (child.type === 'text') {
      const textNode = createTextRenderNode(childId, child)
      nodes.push(textNode)
      accumulatedNodes.push(textNode)
    } else if (child.type === 'image' && child.imageId) {
      const imageNode = createImageRenderNode(
        childId,
        child.imageId,
        child.mode,
        child.position
      )
      nodes.push(imageNode)
      accumulatedNodes.push(imageNode)
    } else if (child.type === 'processor') {
      // Processor applies to accumulated nodes so far
      if (accumulatedNodes.length === 0) continue

      // Combine accumulated nodes
      let accumulated: TextureProducingNode
      if (accumulatedNodes.length === 1) {
        accumulated = accumulatedNodes[0]!
      } else {
        accumulated = createOverlayCompositorNode(
          `${groupId}-pre-processor-${i}`,
          accumulatedNodes
        )
        nodes.push(accumulated)
      }

      // Apply processor (mask and/or effects)
      const processed = buildProcessorNode(childId, accumulated, child, nodes)

      // Reset accumulation with processed result
      accumulatedNodes = [processed]
    } else if (child.type === 'group') {
      // Recursively process nested groups
      const nestedNode = buildGroupNode(child, ctx, nodes)
      if (nestedNode) {
        accumulatedNodes.push(nestedNode)
      }
    }
  }

  // Combine remaining accumulated nodes
  if (accumulatedNodes.length === 0) return null
  if (accumulatedNodes.length === 1) return accumulatedNodes[0]!

  const finalNode = createOverlayCompositorNode(`${groupId}-final`, accumulatedNodes)
  nodes.push(finalNode)
  return finalNode
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

  // 1. Build background layer node (from background-group)
  const baseLayer = findBaseLayer(config.layers)
  if (baseLayer) {
    const bgSurfaceNode = buildSurfaceNode('bg-surface', baseLayer, ctx)
    nodes.push(bgSurfaceNode)
    layerNodes.push(bgSurfaceNode)
  }

  // 2. Build non-background groups using sequential processing
  const groups = findNonBackgroundGroups(config.layers)
  for (const group of groups) {
    const groupNode = buildGroupNode(group, ctx, nodes)
    if (groupNode) {
      layerNodes.push(groupNode)
    }
  }

  // 3. Build root-level layers (not in groups)
  for (let i = 0; i < config.layers.length; i++) {
    const layer = config.layers[i]!
    if (!layer.visible) continue
    if (layer.type === 'group') continue // Already processed above

    const layerId = layer.id || `root-layer-${i}`

    if (layer.type === 'surface' && layer.id !== 'background') {
      const surfaceNode = buildSurfaceNode(layerId, layer, ctx)
      nodes.push(surfaceNode)
      layerNodes.push(surfaceNode)
    } else if (layer.type === 'text') {
      const textNode = createTextRenderNode(layerId, layer)
      nodes.push(textNode)
      layerNodes.push(textNode)
    } else if (layer.type === 'image' && layer.imageId) {
      const imageNode = createImageRenderNode(
        layerId,
        layer.imageId,
        layer.mode,
        layer.position
      )
      nodes.push(imageNode)
      layerNodes.push(imageNode)
    }
    // Note: root-level processors are handled in step 5
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
