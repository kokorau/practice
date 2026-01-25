/**
 * buildPipeline
 *
 * Converts HeroViewConfig to a Compositor Node Graph.
 * This enables decoupled rendering with clear node responsibilities.
 */

import type {
  HeroViewConfig,
  LayerNodeConfig,
  GroupLayerNodeConfig,
  GroupTransformParams,
  SurfaceLayerNodeConfig,
  ProcessorNodeConfig,
  BaseLayerNodeConfig,
  SingleEffectConfig,
  AnyMaskConfig,
} from '../../Domain/HeroViewConfig'
import type { IntensityProvider } from '../../Application/resolvers/resolvePropertyValue'
import { resolvePropertyValueToNumber, DEFAULT_INTENSITY_PROVIDER } from '../../Application/resolvers/resolvePropertyValue'
import type { CompiledLayerNode, CompiledSurfaceLayerNode } from '../../Domain/CompiledHeroView'
import { isCompiledSurfaceLayerNode, isCompiledGroupLayerNode } from '../../Domain/CompiledHeroView'
import {
  getProcessorTargetPairsFromConfig,
  isSingleEffectConfig,
  isMaskProcessorConfig,
} from '../../Domain/HeroViewConfig'
import type { PropertyValue } from '../../Domain/SectionVisual'
import { $PropertyValue } from '../../Domain/SectionVisual'
import type {
  RenderNode,
  CompositorNode,
  OutputNode,
  TextureProducingNode,
} from '../../Domain/Compositor'
import {
  createSurfaceRenderNodeFromCompiled,
  createMaskCompositorNode,
  createMaskChildrenRenderNode,
  createMaskRenderNode,
  createEffectChainCompositorNode,
  createOverlayCompositorNode,
  createGroupCompositorNode,
  createCanvasOutputNode,
  createTextRenderNode,
  type EffectConfig,
  type GroupTransform,
} from './index'
import type { CompiledProcessorLayerNode } from '../../Domain/CompiledHeroView'
import { isCompiledProcessorLayerNode, isCompiledMaskProcessor } from '../../Domain/CompiledHeroView'
import { createImageRenderNode } from './nodes/ImageRenderNode'
import { getMaskSurfaceKey } from '../../Domain/ColorHelpers'

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

  /** Whether dark theme is active */
  isDark: boolean

  /** Mask surface key based on semantic context */
  maskSurfaceKey: string

  /** Intensity provider for RangeExpr resolution */
  intensityProvider: IntensityProvider

  /**
   * Pre-compiled layers with resolved colors (from CompiledHeroView).
   * Required for color resolution - no fallback to palette.
   */
  compiledLayers: CompiledLayerNode[]
}

// ============================================================
// Layer Finding Helpers
// ============================================================

/**
 * Find legacy base layer (background) from layers array
 * Note: Only handles legacy 'base' type layers.
 * Modern configs use background-group which is processed as a regular group.
 */
function findLegacyBaseLayer(layers: LayerNodeConfig[]): BaseLayerNodeConfig | null {
  for (const layer of layers) {
    if (layer.type === 'base' && layer.visible) return layer
  }
  return null
}

/**
 * Find all groups at the specified level
 * Note: Does not recurse into nested groups (they are handled by buildGroupNode)
 */
function findGroups(layers: LayerNodeConfig[]): GroupLayerNodeConfig[] {
  return layers.filter(
    (l): l is GroupLayerNodeConfig => l.type === 'group' && l.visible
  )
}

// ============================================================
// Effect Params Helpers
// ============================================================

/**
 * Check if a value is a PropertyValue object
 */
function isPropertyValue(value: unknown): value is PropertyValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value.type === 'static' || value.type === 'binding')
  )
}

/**
 * Extract raw value from a potential PropertyValue
 * Handles: PropertyValue objects, raw values (number, string, boolean)
 * Uses intensityProvider to resolve RangeExpr bindings
 */
function extractRawValue(value: unknown, intensityProvider: IntensityProvider): unknown {
  if (isPropertyValue(value)) {
    if ($PropertyValue.isStatic(value)) {
      return value.value
    }
    // RangeExpr - resolve using intensityProvider
    if ($PropertyValue.isRange(value)) {
      return resolvePropertyValueToNumber(value, intensityProvider)
    }
    return 0
  }
  // Already a raw value
  return value
}

/**
 * Extract raw values from effect params
 * Converts PropertyValue objects to their underlying values
 */
function extractEffectParams(
  params: Record<string, unknown>,
  intensityProvider: IntensityProvider
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    result[key] = extractRawValue(value, intensityProvider)
  }
  return result
}

/**
 * Resolve GroupTransformParams to GroupTransform.
 * Handles both PropertyValue objects and raw numbers from UI.
 */
function resolveGroupTransform(
  params: GroupTransformParams | undefined,
  intensityProvider: IntensityProvider
): GroupTransform | undefined {
  if (!params) return undefined

  const hasOpacity = params.opacity !== undefined
  const hasOffsetX = params.offsetX !== undefined
  const hasOffsetY = params.offsetY !== undefined
  const hasRotation = params.rotation !== undefined

  // Return undefined if no params are set (use defaults)
  if (!hasOpacity && !hasOffsetX && !hasOffsetY && !hasRotation) {
    return undefined
  }

  // Resolve each param using extractRawValue (handles both PropertyValue and raw values)
  return {
    opacity: hasOpacity ? Number(extractRawValue(params.opacity, intensityProvider)) : 1,
    offsetX: hasOffsetX ? Number(extractRawValue(params.offsetX, intensityProvider)) : 0,
    offsetY: hasOffsetY ? Number(extractRawValue(params.offsetY, intensityProvider)) : 0,
    rotation: hasRotation ? Number(extractRawValue(params.rotation, intensityProvider)) : 0,
  }
}

// ============================================================
// Node Building Functions
// ============================================================

/**
 * Find a compiled surface layer by ID in the compiled layer tree.
 * Recursively searches through groups.
 */
function findCompiledSurfaceLayer(
  layers: CompiledLayerNode[] | undefined,
  targetId: string
): CompiledSurfaceLayerNode | null {
  if (!layers) return null

  for (const layer of layers) {
    if (layer.id === targetId && isCompiledSurfaceLayerNode(layer)) {
      return layer
    }
    if (isCompiledGroupLayerNode(layer)) {
      const found = findCompiledSurfaceLayer(layer.children, targetId)
      if (found) return found
    }
  }
  return null
}

/**
 * Build a surface render node from layer config
 *
 * Requires compiled layer data from CompiledHeroView.
 * Color resolution is handled at compile time, not at build time.
 */
function buildSurfaceNode(
  id: string,
  layer: BaseLayerNodeConfig | SurfaceLayerNodeConfig,
  ctx: BuildContext
): RenderNode {
  // Get pre-compiled data for this layer (required)
  const compiled = findCompiledSurfaceLayer(ctx.compiledLayers, layer.id)
  if (!compiled) {
    throw new Error(`[buildSurfaceNode] Compiled layer not found: ${layer.id}`)
  }

  // Use pre-resolved colors from CompiledHeroView
  return createSurfaceRenderNodeFromCompiled(id, compiled.surface)
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
 * Find the compiled processor node by ID from compiled layers.
 */
function findCompiledProcessor(
  compiledLayers: CompiledLayerNode[],
  processorId: string
): CompiledProcessorLayerNode | null {
  for (const layer of compiledLayers) {
    if (isCompiledProcessorLayerNode(layer) && layer.id === processorId) {
      return layer
    }
    if (isCompiledGroupLayerNode(layer)) {
      const found = findCompiledProcessor(layer.children, processorId)
      if (found) return found
    }
  }
  return null
}

/**
 * Build render nodes from compiled mask children.
 * Returns an array of render/compositor nodes for the mask source.
 */
function buildMaskChildrenNodes(
  maskId: string,
  compiledChildren: CompiledLayerNode[],
  allNodes: Array<RenderNode | CompositorNode | OutputNode>
): Array<RenderNode | CompositorNode> {
  const childNodes: Array<RenderNode | CompositorNode> = []

  for (let i = 0; i < compiledChildren.length; i++) {
    const child = compiledChildren[i]
    if (!child || !child.visible) continue

    const childId = `${maskId}-child-${i}`

    if (isCompiledSurfaceLayerNode(child)) {
      const surfaceNode = createSurfaceRenderNodeFromCompiled(childId, child.surface)
      allNodes.push(surfaceNode)
      childNodes.push(surfaceNode)
    }
    // Note: Could extend to support text, image, and group children in mask
    // For now, only surface layers are supported as mask children
  }

  return childNodes
}

/**
 * Build processor compositor node that applies to the final composite
 * Returns the new final node after applying processor effects
 *
 * Modifiers are processed in array order:
 * - Consecutive effects are grouped and processed together via EffectChainCompositorNode
 * - When a mask is encountered, pending effects are flushed first, then mask is applied
 */
function buildProcessorNode(
  id: string,
  inputNode: TextureProducingNode,
  processor: ProcessorNodeConfig,
  nodes: Array<RenderNode | CompositorNode | OutputNode>,
  intensityProvider: IntensityProvider,
  ctx: BuildContext
): TextureProducingNode {
  let currentNode: TextureProducingNode = inputNode
  let pendingEffects: SingleEffectConfig[] = []
  let effectGroupCounter = 0
  let maskCounter = 0

  // Helper: flush pending effects as a single EffectChainCompositorNode
  const flushEffects = () => {
    if (pendingEffects.length === 0) return

    const effects: EffectConfig[] = pendingEffects.map((e) => ({
      id: e.id,
      params: extractEffectParams(e.params as Record<string, unknown>, intensityProvider),
    }))
    const effectsNode = createEffectChainCompositorNode(
      `${id}-effects-${effectGroupCounter++}`,
      currentNode,
      effects
    )
    nodes.push(effectsNode)
    currentNode = effectsNode
    pendingEffects = []
  }

  // Helper: apply a mask modifier
  const applyMask = (maskIndex: number) => {
    const compiledProcessor = findCompiledProcessor(ctx.compiledLayers, processor.id)
    if (!compiledProcessor) return

    // Find the mask at the corresponding index in compiled modifiers
    const compiledMasks = compiledProcessor.modifiers.filter(isCompiledMaskProcessor)
    const compiledMask = compiledMasks[maskIndex]
    if (!compiledMask) return

    const maskId = `${id}-mask-${maskCounter++}`

    // Priority: shape (legacy) > children (new)
    // This ensures backwards compatibility with existing presets
    if (compiledMask.shape) {
      // Use legacy shape-based mask (MaskRenderNode)
      const maskConfig = {
        type: compiledMask.shape.id,
        ...compiledMask.shape.params,
      } as AnyMaskConfig

      const maskRenderNode = createMaskRenderNode(`${maskId}-render`, maskConfig)
      nodes.push(maskRenderNode)

      const maskedNode = createMaskCompositorNode(`${maskId}`, currentNode, maskRenderNode)
      nodes.push(maskedNode)
      currentNode = maskedNode
    } else if (compiledMask.children.length > 0) {
      // Use new children-based mask (MaskChildrenRenderNode)
      const maskChildNodes = buildMaskChildrenNodes(`${maskId}`, compiledMask.children, nodes)

      if (maskChildNodes.length > 0) {
        const maskChildrenRenderNode = createMaskChildrenRenderNode(
          `${maskId}-render`,
          maskChildNodes,
          compiledMask.invert
        )
        nodes.push(maskChildrenRenderNode)

        const maskedNode = createMaskCompositorNode(`${maskId}`, currentNode, maskChildrenRenderNode)
        nodes.push(maskedNode)
        currentNode = maskedNode
      }
    }
    // If neither shape nor children, mask is not applied
  }

  // Process modifiers in array order
  let maskIndex = 0
  for (const modifier of processor.modifiers) {
    if (isSingleEffectConfig(modifier)) {
      // Accumulate effects for batch processing
      pendingEffects.push(modifier)
    } else if (isMaskProcessorConfig(modifier) && modifier.enabled) {
      // Flush pending effects before applying mask
      flushEffects()
      // Apply this mask
      applyMask(maskIndex)
      maskIndex++
    } else if (isMaskProcessorConfig(modifier)) {
      // Disabled mask - still increment index to keep sync with compiled
      maskIndex++
    }
  }

  // Flush any remaining effects
  flushEffects()

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
 * Returns a GroupCompositorNode that:
 * - Contains processed child nodes
 * - Applies group-level blendMode, opacity, and transform
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
      const processed = buildProcessorNode(childId, accumulated, child, nodes, ctx.intensityProvider, ctx)

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

  // No children to render
  if (accumulatedNodes.length === 0) return null

  // Resolve group transform params
  const transform = resolveGroupTransform(group.params, ctx.intensityProvider)

  // Always wrap in GroupCompositorNode (even single child)
  // This ensures group-level blendMode and transform are applied
  const groupNode = createGroupCompositorNode(
    groupId,
    accumulatedNodes,
    {
      blendMode: group.blendMode,
      transform,
    }
  )
  nodes.push(groupNode)
  return groupNode
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
 * Options for pipeline building
 */
export interface BuildPipelineOptions {
  /**
   * Whether dark theme is active.
   * Used for resolving 'auto' color keys to appropriate surface colors.
   */
  isDark: boolean

  /**
   * Intensity provider for RangeExpr resolution (animation support)
   * If not provided, all RangeExpr will use intensity=0 (min value)
   */
  intensityProvider?: IntensityProvider

  /**
   * Pre-compiled layers with resolved colors (from CompiledHeroView).
   * Required for all surface rendering - color resolution happens at compile time.
   */
  compiledLayers: CompiledLayerNode[]
}

/**
 * Build a compositor pipeline from HeroViewConfig
 *
 * Requires pre-compiled layers from compileHeroView for color resolution.
 * All color keys are resolved at compile time, not at build time.
 *
 * @param config - HeroViewConfig to convert
 * @param options - Build options including required compiledLayers
 * @returns Pipeline result with output node
 */
export function buildPipeline(
  config: HeroViewConfig,
  options: BuildPipelineOptions
): PipelineResult {
  const { isDark, compiledLayers } = options
  const semanticContext = config.colors.semanticContext ?? 'canvas'
  const maskSurfaceKey = getMaskSurfaceKey(semanticContext, isDark)
  const intensityProvider = options.intensityProvider ?? DEFAULT_INTENSITY_PROVIDER

  const ctx: BuildContext = {
    config,
    isDark,
    maskSurfaceKey,
    intensityProvider,
    compiledLayers,
  }

  const nodes: Array<RenderNode | CompositorNode | OutputNode> = []
  const layerNodes: TextureProducingNode[] = []

  // 1. Build legacy base layer (if present)
  const legacyBaseLayer = findLegacyBaseLayer(config.layers)
  if (legacyBaseLayer) {
    const bgSurfaceNode = buildSurfaceNode('bg-surface', legacyBaseLayer, ctx)
    nodes.push(bgSurfaceNode)
    layerNodes.push(bgSurfaceNode)
  }

  // 2. Build all groups (including background-group) as GroupCompositorNodes
  const groups = findGroups(config.layers)
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

    if (layer.type === 'surface') {
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
    finalNode = buildProcessorNode(processorId, finalNode, processor, nodes, ctx.intensityProvider, ctx)
  }

  // 6. Build canvas output node
  const outputNode = createCanvasOutputNode('output', finalNode)
  nodes.push(outputNode)

  return {
    outputNode,
    nodes,
  }
}
