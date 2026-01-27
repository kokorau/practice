/**
 * useAutoLayout
 *
 * HeroViewConfig からノードグラフのレイアウトを自動生成するコンポーザブル
 *
 * Layout strategy:
 * - Column 0: Source nodes (Surfaces, Images, etc.)
 * - Column 1: Processor pipelines (contains Effects, Masks, Graymaps)
 * - Column 2: Composite node (if multiple groups)
 * - Column 3: Render output
 *
 * Each group forms an independent pipeline:
 * - Sources within a group connect only to processors within the same group
 * - Multiple groups are combined via a Composite node before Output
 */

import { computed, type Ref } from 'vue'
import type { Connection } from './types'
import type {
  HeroViewConfig,
  LayerNodeConfig,
  ProcessorNodeConfig,
  SurfaceLayerNodeConfig,
  GroupLayerNodeConfig,
  ImageLayerNodeConfig,
  ProcessorConfig,
  SingleEffectConfig,
  NormalizedSurfaceConfig,
} from '@practice/section-visual'

// ============================================================
// Graph Node Types (internal representation)
// ============================================================

export type GraphNodeType =
  | 'surface'
  | 'image'
  | 'processor'
  | 'effect'
  | 'mask'
  | 'graymap'
  | 'composite'
  | 'render'

export interface GraphNode {
  id: string
  type: GraphNodeType
  label: string
  /** Column index (0-based) */
  column: number
  /** Row index within the column (0-based) */
  row: number
  /** Parent processor ID (for effects, masks, graymaps inside a pipeline) */
  parentPipelineId?: string
  /** Parent group ID (for nodes belonging to a group) */
  parentGroupId?: string
  /** Original config reference */
  config?: LayerNodeConfig | ProcessorConfig | NormalizedSurfaceConfig
}

/**
 * Represents a group's pipeline structure
 */
interface GroupPipeline {
  groupId: string
  groupName: string
  sources: GraphNode[]
  processor: GraphNode | null
  filterNodes: GraphNode[]
  graymapNodes: GraphNode[]
  /** The node ID that represents this group's output (processor if exists, otherwise last source) */
  outputNodeId: string
}

export interface AutoLayoutResult {
  /** All graph nodes */
  nodes: GraphNode[]
  /** Connections between nodes */
  connections: Connection[]
  /** Number of columns in the layout */
  columnCount: number
  /** Source nodes (surfaces, images) - column 0 */
  sourceNodes: GraphNode[]
  /** Processor pipelines - column 1 */
  processorNodes: GraphNode[]
  /** Filter nodes inside processors */
  filterNodes: GraphNode[]
  /** Graymap nodes inside processors */
  graymapNodes: GraphNode[]
  /** Composite node (if multiple groups) - column 2 */
  compositeNode: GraphNode | null
  /** Render node - last column */
  renderNode: GraphNode | null
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the surface label from a NormalizedSurfaceConfig
 */
function getSurfaceLabel(surface: NormalizedSurfaceConfig): string {
  // Capitalize first letter of surface id
  const id = surface.id
  return id.charAt(0).toUpperCase() + id.slice(1)
}

/**
 * Get the effect label from a SingleEffectConfig
 */
function getEffectLabel(effect: SingleEffectConfig): string {
  const id = effect.id
  return id.charAt(0).toUpperCase() + id.slice(1)
}

/**
 * Check if a layer config is a processor
 */
function isProcessor(layer: LayerNodeConfig): layer is ProcessorNodeConfig {
  return layer.type === 'processor'
}

/**
 * Check if a layer config is a surface
 */
function isSurface(layer: LayerNodeConfig): layer is SurfaceLayerNodeConfig {
  return layer.type === 'surface' || layer.type === 'base'
}

/**
 * Check if a layer config is a group
 */
function isGroup(layer: LayerNodeConfig): layer is GroupLayerNodeConfig {
  return layer.type === 'group'
}

/**
 * Check if a layer config is an image
 */
function isImage(layer: LayerNodeConfig): layer is ImageLayerNodeConfig {
  return layer.type === 'image'
}

/**
 * Extract immediate source layers (surfaces, images) from children - NOT recursive
 */
function extractImmediateSources(children: LayerNodeConfig[]): LayerNodeConfig[] {
  const sources: LayerNodeConfig[] = []
  for (const layer of children) {
    if (!layer.visible) continue
    if (isSurface(layer) || isImage(layer)) {
      sources.push(layer)
    }
  }
  return sources
}

/**
 * Extract immediate processor from children - NOT recursive
 */
function extractImmediateProcessor(children: LayerNodeConfig[]): ProcessorNodeConfig | null {
  for (const layer of children) {
    if (!layer.visible) continue
    if (isProcessor(layer)) {
      return layer
    }
  }
  return null
}

// ============================================================
// Main Layout Logic
// ============================================================

/**
 * Generate auto-layout from HeroViewConfig
 *
 * New semantic-aware layout:
 * - Each top-level group forms an independent pipeline
 * - Sources within a group connect only to processors within the same group
 * - Multiple groups are combined via a Composite node
 */
export function generateAutoLayout(config: HeroViewConfig): AutoLayoutResult {
  const nodes: GraphNode[] = []
  const connections: Connection[] = []
  const allSourceNodes: GraphNode[] = []
  const allProcessorNodes: GraphNode[] = []
  const allFilterNodes: GraphNode[] = []
  const allGraymapNodes: GraphNode[] = []
  const groupPipelines: GroupPipeline[] = []

  let sourceRowIndex = 0
  let processorRowIndex = 0

  // Process each top-level layer
  for (const layer of config.layers) {
    if (!layer.visible) continue

    if (isGroup(layer)) {
      // Process group as a pipeline
      const pipeline = processGroup(
        layer,
        sourceRowIndex,
        processorRowIndex,
        nodes,
        connections,
        allSourceNodes,
        allProcessorNodes,
        allFilterNodes,
        allGraymapNodes
      )
      groupPipelines.push(pipeline)
      sourceRowIndex += pipeline.sources.length
      if (pipeline.processor) processorRowIndex++
    } else if (isSurface(layer) || isImage(layer)) {
      // Top-level source without group - create implicit pipeline
      const sourceNode = createSourceNode(layer, sourceRowIndex, undefined)
      nodes.push(sourceNode)
      allSourceNodes.push(sourceNode)
      groupPipelines.push({
        groupId: `implicit-${layer.id}`,
        groupName: layer.name || 'Layer',
        sources: [sourceNode],
        processor: null,
        filterNodes: [],
        graymapNodes: [],
        outputNodeId: sourceNode.id,
      })
      sourceRowIndex++
    } else if (isProcessor(layer)) {
      // Top-level processor without group - applies to all preceding sources
      // This is a fallback for legacy configs
      const processorResult = createProcessorNodes(
        layer,
        processorRowIndex,
        undefined,
        nodes,
        connections,
        allFilterNodes,
        allGraymapNodes
      )
      allProcessorNodes.push(processorResult.processorNode)

      // Connect all existing sources to this processor
      for (const source of allSourceNodes) {
        connections.push({
          from: { nodeId: source.id, position: 'right' },
          to: { nodeId: processorResult.processorNode.id, position: 'left' },
        })
      }

      // Update all pipelines to output through this processor
      for (const pipeline of groupPipelines) {
        pipeline.outputNodeId = processorResult.processorNode.id
      }
      processorRowIndex++
    }
  }

  // Determine if we need a Composite node
  const needsComposite = groupPipelines.length > 1
  const hasProcessors = allProcessorNodes.length > 0

  // Calculate column count based on structure
  // Col 0: Sources, Col 1: Processors (if any), Col 2: Composite (if needed), Col 3: Output
  let columnCount = 2 // At minimum: sources + output
  if (hasProcessors) columnCount++
  if (needsComposite) columnCount++

  // Create Composite node if needed
  let compositeNode: GraphNode | null = null
  if (needsComposite) {
    const compositeColumn = hasProcessors ? 2 : 1
    compositeNode = {
      id: 'composite',
      type: 'composite',
      label: 'Composite',
      column: compositeColumn,
      row: 0,
    }
    nodes.push(compositeNode)

    // Connect each pipeline's output to Composite
    for (const pipeline of groupPipelines) {
      connections.push({
        from: { nodeId: pipeline.outputNodeId, position: 'right' },
        to: { nodeId: 'composite', position: 'left' },
      })
    }
  }

  // Create Render node
  let renderNode: GraphNode | null = null
  if (groupPipelines.length > 0 || allSourceNodes.length > 0) {
    const renderColumn = columnCount - 1
    renderNode = {
      id: 'render',
      type: 'render',
      label: 'Output',
      column: renderColumn,
      row: 0,
    }
    nodes.push(renderNode)

    // Connect to Render
    if (compositeNode) {
      // Composite → Render
      connections.push({
        from: { nodeId: 'composite', position: 'right' },
        to: { nodeId: 'render', position: 'left' },
      })
    } else if (groupPipelines.length === 1) {
      // Single pipeline → Render
      connections.push({
        from: { nodeId: groupPipelines[0].outputNodeId, position: 'right' },
        to: { nodeId: 'render', position: 'left' },
      })
    }
  }

  return {
    nodes,
    connections,
    columnCount,
    sourceNodes: allSourceNodes,
    processorNodes: allProcessorNodes,
    filterNodes: allFilterNodes,
    graymapNodes: allGraymapNodes,
    compositeNode,
    renderNode,
  }
}

/**
 * Process a group layer and create its pipeline
 */
function processGroup(
  group: GroupLayerNodeConfig,
  startSourceRow: number,
  startProcessorRow: number,
  nodes: GraphNode[],
  connections: Connection[],
  allSourceNodes: GraphNode[],
  allProcessorNodes: GraphNode[],
  allFilterNodes: GraphNode[],
  allGraymapNodes: GraphNode[]
): GroupPipeline {
  const groupSources: GraphNode[] = []
  const groupFilterNodes: GraphNode[] = []
  const groupGraymapNodes: GraphNode[] = []
  let groupProcessor: GraphNode | null = null

  // Extract immediate sources from group children
  const sources = extractImmediateSources(group.children)
  sources.forEach((layer, index) => {
    const sourceNode = createSourceNode(layer, startSourceRow + index, group.id)
    nodes.push(sourceNode)
    allSourceNodes.push(sourceNode)
    groupSources.push(sourceNode)
  })

  // Extract immediate processor from group children
  const processor = extractImmediateProcessor(group.children)
  if (processor) {
    const processorResult = createProcessorNodes(
      processor,
      startProcessorRow,
      group.id,
      nodes,
      connections,
      allFilterNodes,
      allGraymapNodes
    )
    allProcessorNodes.push(processorResult.processorNode)
    groupProcessor = processorResult.processorNode
    groupFilterNodes.push(...processorResult.filterNodes)
    groupGraymapNodes.push(...processorResult.graymapNodes)

    // Connect group sources to processor
    for (const source of groupSources) {
      connections.push({
        from: { nodeId: source.id, position: 'right' },
        to: { nodeId: processor.id, position: 'left' },
      })
    }
  }

  // Determine output node ID
  const outputNodeId = groupProcessor
    ? groupProcessor.id
    : groupSources.length > 0
      ? groupSources[groupSources.length - 1].id
      : group.id

  return {
    groupId: group.id,
    groupName: group.name || 'Group',
    sources: groupSources,
    processor: groupProcessor,
    filterNodes: groupFilterNodes,
    graymapNodes: groupGraymapNodes,
    outputNodeId,
  }
}

/**
 * Create a source node (surface or image)
 */
function createSourceNode(
  layer: LayerNodeConfig,
  rowIndex: number,
  parentGroupId: string | undefined
): GraphNode {
  if (isSurface(layer)) {
    return {
      id: layer.id,
      type: 'surface',
      label: getSurfaceLabel(layer.surface),
      column: 0,
      row: rowIndex,
      parentGroupId,
      config: layer,
    }
  } else if (isImage(layer)) {
    return {
      id: layer.id,
      type: 'image',
      label: 'Image',
      column: 0,
      row: rowIndex,
      parentGroupId,
      config: layer,
    }
  }
  // Fallback (should not happen)
  return {
    id: layer.id,
    type: 'surface',
    label: 'Unknown',
    column: 0,
    row: rowIndex,
    parentGroupId,
    config: layer,
  }
}

/**
 * Create processor node and its internal filter/graymap nodes
 */
function createProcessorNodes(
  processor: ProcessorNodeConfig,
  rowIndex: number,
  parentGroupId: string | undefined,
  nodes: GraphNode[],
  connections: Connection[],
  allFilterNodes: GraphNode[],
  allGraymapNodes: GraphNode[]
): {
  processorNode: GraphNode
  filterNodes: GraphNode[]
  graymapNodes: GraphNode[]
} {
  const filterNodes: GraphNode[] = []
  const graymapNodes: GraphNode[] = []

  // Create processor pipeline node
  const processorNode: GraphNode = {
    id: processor.id,
    type: 'processor',
    label: processor.name || 'Processor',
    column: 1,
    row: rowIndex,
    parentGroupId,
    config: processor,
  }
  nodes.push(processorNode)

  // Track internal nodes for connection generation
  interface InternalNode {
    id: string
    type: 'effect' | 'mask'
    graymapId?: string
  }
  const internalNodes: InternalNode[] = []

  // Create filter nodes inside the processor
  let filterIndex = 0
  processor.modifiers.forEach((modifier, mIndex) => {
    if (modifier.type === 'effect') {
      const effectNode: GraphNode = {
        id: `${processor.id}-effect-${mIndex}`,
        type: 'effect',
        label: getEffectLabel(modifier),
        column: 1,
        row: filterIndex,
        parentPipelineId: processor.id,
        parentGroupId,
        config: modifier,
      }
      filterNodes.push(effectNode)
      allFilterNodes.push(effectNode)
      nodes.push(effectNode)
      internalNodes.push({ id: effectNode.id, type: 'effect' })
      filterIndex++
    } else if (modifier.type === 'mask') {
      const maskNode: GraphNode = {
        id: `${processor.id}-mask-${mIndex}`,
        type: 'mask',
        label: 'Mask',
        column: 1,
        row: filterIndex,
        parentPipelineId: processor.id,
        parentGroupId,
        config: modifier,
      }
      filterNodes.push(maskNode)
      allFilterNodes.push(maskNode)
      nodes.push(maskNode)

      let graymapId: string | undefined

      // Create graymap node if mask has children
      if (modifier.children && modifier.children.length > 0) {
        // Get label from first child if it's a surface
        let graymapLabel = 'Graymap'
        const firstChild = modifier.children[0]
        if (firstChild && isSurface(firstChild)) {
          graymapLabel = getSurfaceLabel(firstChild.surface)
        }

        const graymapNode: GraphNode = {
          id: `${processor.id}-graymap-${mIndex}`,
          type: 'graymap',
          label: graymapLabel,
          column: 1,
          row: filterIndex,
          parentPipelineId: processor.id,
          parentGroupId,
          config: firstChild?.type === 'surface' ? (firstChild as SurfaceLayerNodeConfig).surface : undefined,
        }
        graymapNodes.push(graymapNode)
        allGraymapNodes.push(graymapNode)
        nodes.push(graymapNode)
        graymapId = graymapNode.id
      }

      internalNodes.push({ id: maskNode.id, type: 'mask', graymapId })
      filterIndex++
    }
  })

  // Generate internal connections within the pipeline
  internalNodes.forEach((node, index) => {
    const isFirst = index === 0
    const isLast = index === internalNodes.length - 1
    const prevNode = isFirst ? null : internalNodes[index - 1]

    if (node.type === 'effect') {
      // Input connection
      if (isFirst) {
        connections.push({
          from: { nodeId: processor.id, position: 'left' },
          to: { nodeId: node.id, position: 'left' },
        })
      } else if (prevNode) {
        connections.push({
          from: { nodeId: prevNode.id, position: 'right' },
          to: { nodeId: node.id, position: 'left' },
        })
      }

      // Output connection (if last)
      if (isLast) {
        connections.push({
          from: { nodeId: node.id, position: 'right' },
          to: { nodeId: processor.id, position: 'right' },
        })
      }
    } else if (node.type === 'mask') {
      // Main input connection
      if (isFirst) {
        connections.push({
          from: { nodeId: processor.id, position: 'left' },
          to: { nodeId: node.id, position: 'left', portOffset: 0.3 },
        })
      } else if (prevNode) {
        connections.push({
          from: { nodeId: prevNode.id, position: 'right' },
          to: { nodeId: node.id, position: 'left', portOffset: 0.3 },
        })
      }

      // Graymap input connection
      if (node.graymapId) {
        connections.push({
          from: { nodeId: node.graymapId, position: 'right' },
          to: { nodeId: node.id, position: 'left', portOffset: 0.7 },
        })
      }

      // Output connection (if last)
      if (isLast) {
        connections.push({
          from: { nodeId: node.id, position: 'right' },
          to: { nodeId: processor.id, position: 'right' },
        })
      }
    }
  })

  return { processorNode, filterNodes, graymapNodes }
}

// ============================================================
// Composable
// ============================================================

/**
 * useAutoLayout composable
 *
 * Reactively generates auto-layout from HeroViewConfig
 *
 * @param config - Reactive HeroViewConfig reference
 * @returns Computed AutoLayoutResult
 *
 * @example
 * ```typescript
 * const config = ref<HeroViewConfig>(...)
 * const layout = useAutoLayout(config)
 *
 * // Use in template
 * <NodeGraph :connections="layout.connections" :columns="layout.columnCount">
 *   <template #default="{ setNodeRef }">
 *     <div v-for="source in layout.sourceNodes" :ref="el => setNodeRef(source.id, el)">
 *       <SurfaceNode :surface="source.config.surface" />
 *     </div>
 *     ...
 *   </template>
 * </NodeGraph>
 * ```
 */
export function useAutoLayout(config: Ref<HeroViewConfig>) {
  return computed(() => generateAutoLayout(config.value))
}

export default useAutoLayout
