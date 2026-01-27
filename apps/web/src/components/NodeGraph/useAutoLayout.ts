/**
 * useAutoLayout
 *
 * HeroViewConfig からノードグラフのレイアウトを自動生成するコンポーザブル
 *
 * Layout strategy (right-aligned pipelines):
 * - Each group forms an independent horizontal pipeline
 * - Pipelines are right-aligned: shorter pipelines align to the right (closer to Composite)
 * - Groups are stacked vertically
 * - All pipelines connect to Composite (if multiple groups) then to Output
 *
 * Example with varying pipeline lengths:
 *   [Stripe] → [Blur] → [Mask] ───┐
 *                       [Circle]  │
 *                                 ├→ [Composite] → [Output]
 *              [GradientGrain] ───┘
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
 * Represents a node in the pipeline sequence
 */
interface PipelineNode {
  node: GraphNode
  /** Relative column position within the pipeline (0 = leftmost) */
  relativeColumn: number
  /** Row offset within the group (for graymap below mask) */
  rowOffset: number
}

/**
 * Represents a group's pipeline structure
 */
interface GroupPipeline {
  groupId: string
  groupName: string
  /** All nodes in this pipeline with their relative positions */
  pipelineNodes: PipelineNode[]
  /** The length of this pipeline (number of columns) */
  pipelineLength: number
  /** The row index where this group starts */
  groupRowStart: number
  /** The number of rows this group occupies */
  groupRowCount: number
  /** The node ID that represents this group's output */
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
  /** Processor nodes */
  processorNodes: GraphNode[]
  /** Filter nodes inside processors */
  filterNodes: GraphNode[]
  /** Graymap nodes inside processors */
  graymapNodes: GraphNode[]
  /** Composite node (if multiple groups) */
  compositeNode: GraphNode | null
  /** Render node - last column */
  renderNode: GraphNode | null
}

// ============================================================
// Helper Functions
// ============================================================

function getSurfaceLabel(surface: NormalizedSurfaceConfig): string {
  const id = surface.id
  return id.charAt(0).toUpperCase() + id.slice(1)
}

function getEffectLabel(effect: SingleEffectConfig): string {
  const id = effect.id
  return id.charAt(0).toUpperCase() + id.slice(1)
}

function isProcessor(layer: LayerNodeConfig): layer is ProcessorNodeConfig {
  return layer.type === 'processor'
}

function isSurface(layer: LayerNodeConfig): layer is SurfaceLayerNodeConfig {
  return layer.type === 'surface' || layer.type === 'base'
}

function isGroup(layer: LayerNodeConfig): layer is GroupLayerNodeConfig {
  return layer.type === 'group'
}

function isImage(layer: LayerNodeConfig): layer is ImageLayerNodeConfig {
  return layer.type === 'image'
}

// ============================================================
// Main Layout Logic
// ============================================================

/**
 * Generate auto-layout from HeroViewConfig
 *
 * Right-aligned pipeline layout:
 * - Each group forms a horizontal pipeline
 * - Pipelines are right-aligned (shorter pipelines start further right)
 * - Groups are stacked vertically
 */
export function generateAutoLayout(config: HeroViewConfig): AutoLayoutResult {
  const connections: Connection[] = []
  const groupPipelines: GroupPipeline[] = []

  let currentGroupRow = 0

  // Phase 1: Build pipeline structures for each group
  for (const layer of config.layers) {
    if (!layer.visible) continue

    if (isGroup(layer)) {
      const pipeline = buildGroupPipeline(layer, currentGroupRow, connections)
      groupPipelines.push(pipeline)
      currentGroupRow += pipeline.groupRowCount
    } else if (isSurface(layer) || isImage(layer)) {
      // Top-level source without group - create implicit single-node pipeline
      const sourceNode: GraphNode = {
        id: layer.id,
        type: isSurface(layer) ? 'surface' : 'image',
        label: isSurface(layer) ? getSurfaceLabel((layer as SurfaceLayerNodeConfig).surface) : 'Image',
        column: 0, // Will be adjusted in Phase 2
        row: currentGroupRow,
        config: layer,
      }
      groupPipelines.push({
        groupId: `implicit-${layer.id}`,
        groupName: layer.name || 'Layer',
        pipelineNodes: [{ node: sourceNode, relativeColumn: 0, rowOffset: 0 }],
        pipelineLength: 1,
        groupRowStart: currentGroupRow,
        groupRowCount: 1,
        outputNodeId: sourceNode.id,
      })
      currentGroupRow++
    }
  }

  // Phase 2: Calculate max pipeline length and right-align columns
  const maxPipelineLength = Math.max(...groupPipelines.map((p) => p.pipelineLength), 1)

  // Collect all nodes with adjusted columns
  const nodes: GraphNode[] = []
  const allSourceNodes: GraphNode[] = []
  const allProcessorNodes: GraphNode[] = []
  const allFilterNodes: GraphNode[] = []
  const allGraymapNodes: GraphNode[] = []

  for (const pipeline of groupPipelines) {
    // Right-align: offset = maxPipelineLength - pipelineLength
    const columnOffset = maxPipelineLength - pipeline.pipelineLength

    for (const pn of pipeline.pipelineNodes) {
      // Adjust column to right-align
      pn.node.column = columnOffset + pn.relativeColumn
      pn.node.row = pipeline.groupRowStart + pn.rowOffset
      nodes.push(pn.node)

      // Categorize nodes
      switch (pn.node.type) {
        case 'surface':
        case 'image':
          allSourceNodes.push(pn.node)
          break
        case 'processor':
          allProcessorNodes.push(pn.node)
          break
        case 'effect':
        case 'mask':
          allFilterNodes.push(pn.node)
          break
        case 'graymap':
          allGraymapNodes.push(pn.node)
          break
      }
    }
  }

  // Phase 3: Create Composite and Output nodes
  const needsComposite = groupPipelines.length > 1
  const compositeColumn = maxPipelineLength
  const outputColumn = maxPipelineLength + (needsComposite ? 1 : 0)
  const columnCount = outputColumn + 1

  // Calculate vertical center for Composite/Output
  const totalRows = currentGroupRow
  const centerRow = Math.floor((totalRows - 1) / 2)

  let compositeNode: GraphNode | null = null
  if (needsComposite) {
    compositeNode = {
      id: 'composite',
      type: 'composite',
      label: 'Composite',
      column: compositeColumn,
      row: centerRow,
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

  // Create Output node
  let renderNode: GraphNode | null = null
  if (groupPipelines.length > 0) {
    renderNode = {
      id: 'render',
      type: 'render',
      label: 'Output',
      column: outputColumn,
      row: centerRow,
    }
    nodes.push(renderNode)

    if (compositeNode) {
      connections.push({
        from: { nodeId: 'composite', position: 'right' },
        to: { nodeId: 'render', position: 'left' },
      })
    } else if (groupPipelines.length === 1) {
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
 * Build a GroupPipeline from a group layer
 *
 * Pipeline structure: [Sources] → [Effects] → [Masks with Graymaps]
 * Each step is a column, laid out left to right
 */
function buildGroupPipeline(
  group: GroupLayerNodeConfig,
  groupRowStart: number,
  connections: Connection[]
): GroupPipeline {
  const pipelineNodes: PipelineNode[] = []
  let relativeColumn = 0
  let maxRowOffset = 0

  // Track nodes for connections
  const sourceNodeIds: string[] = []
  let lastNodeId: string | null = null
  let outputNodeId: string = group.id

  // Step 1: Extract sources from group children
  for (const child of group.children) {
    if (!child.visible) continue

    if (isSurface(child) || isImage(child)) {
      const rowOffset = sourceNodeIds.length
      const sourceNode: GraphNode = {
        id: child.id,
        type: isSurface(child) ? 'surface' : 'image',
        label: isSurface(child) ? getSurfaceLabel((child as SurfaceLayerNodeConfig).surface) : 'Image',
        column: 0,
        row: 0,
        parentGroupId: group.id,
        config: child,
      }
      pipelineNodes.push({ node: sourceNode, relativeColumn, rowOffset })
      sourceNodeIds.push(sourceNode.id)
      maxRowOffset = Math.max(maxRowOffset, rowOffset)
      outputNodeId = sourceNode.id
    }
  }

  // Move to next column if we have sources
  if (sourceNodeIds.length > 0) {
    relativeColumn++
    lastNodeId = sourceNodeIds[sourceNodeIds.length - 1]
  }

  // Step 2: Extract processor and its modifiers
  for (const child of group.children) {
    if (!child.visible) continue

    if (isProcessor(child)) {
      // Process each modifier in the processor
      let prevModifierNodeId: string | null = null

      for (let mIndex = 0; mIndex < child.modifiers.length; mIndex++) {
        const modifier = child.modifiers[mIndex]

        if (modifier.type === 'effect') {
          const effectNode: GraphNode = {
            id: `${child.id}-effect-${mIndex}`,
            type: 'effect',
            label: getEffectLabel(modifier),
            column: 0,
            row: 0,
            parentPipelineId: child.id,
            parentGroupId: group.id,
            config: modifier,
          }
          pipelineNodes.push({ node: effectNode, relativeColumn, rowOffset: 0 })

          // Connect from sources or previous modifier
          if (prevModifierNodeId === null) {
            // First modifier - connect from all sources
            for (const sourceId of sourceNodeIds) {
              connections.push({
                from: { nodeId: sourceId, position: 'right' },
                to: { nodeId: effectNode.id, position: 'left' },
              })
            }
          } else {
            // Connect from previous modifier
            connections.push({
              from: { nodeId: prevModifierNodeId, position: 'right' },
              to: { nodeId: effectNode.id, position: 'left' },
            })
          }

          prevModifierNodeId = effectNode.id
          outputNodeId = effectNode.id
          relativeColumn++
        } else if (modifier.type === 'mask') {
          const maskNode: GraphNode = {
            id: `${child.id}-mask-${mIndex}`,
            type: 'mask',
            label: 'Mask',
            column: 0,
            row: 0,
            parentPipelineId: child.id,
            parentGroupId: group.id,
            config: modifier,
          }
          pipelineNodes.push({ node: maskNode, relativeColumn, rowOffset: 0 })

          // Connect from sources or previous modifier (main input)
          if (prevModifierNodeId === null) {
            for (const sourceId of sourceNodeIds) {
              connections.push({
                from: { nodeId: sourceId, position: 'right' },
                to: { nodeId: maskNode.id, position: 'left', portOffset: 0.3 },
              })
            }
          } else {
            connections.push({
              from: { nodeId: prevModifierNodeId, position: 'right' },
              to: { nodeId: maskNode.id, position: 'left', portOffset: 0.3 },
            })
          }

          // Create graymap if mask has children
          // Graymap is placed one column to the left of the mask
          if (modifier.children && modifier.children.length > 0) {
            let graymapLabel = 'Graymap'
            const firstChild = modifier.children[0]
            if (firstChild && isSurface(firstChild)) {
              graymapLabel = getSurfaceLabel(firstChild.surface)
            }

            const graymapNode: GraphNode = {
              id: `${child.id}-graymap-${mIndex}`,
              type: 'graymap',
              label: graymapLabel,
              column: 0,
              row: 0,
              parentPipelineId: child.id,
              parentGroupId: group.id,
              config: firstChild?.type === 'surface' ? (firstChild as SurfaceLayerNodeConfig).surface : undefined,
            }
            // Place graymap one column left of the mask (same column as previous modifier or source)
            const graymapColumn = Math.max(0, relativeColumn - 1)
            pipelineNodes.push({ node: graymapNode, relativeColumn: graymapColumn, rowOffset: 1 })
            maxRowOffset = Math.max(maxRowOffset, 1)

            // Connect graymap to mask
            connections.push({
              from: { nodeId: graymapNode.id, position: 'right' },
              to: { nodeId: maskNode.id, position: 'left', portOffset: 0.7 },
            })
          }

          prevModifierNodeId = maskNode.id
          outputNodeId = maskNode.id
          relativeColumn++
        }
      }
      break // Only process first processor
    }
  }

  return {
    groupId: group.id,
    groupName: group.name || 'Group',
    pipelineNodes,
    pipelineLength: relativeColumn,
    groupRowStart,
    groupRowCount: maxRowOffset + 1,
    outputNodeId,
  }
}

// ============================================================
// Composable
// ============================================================

/**
 * useAutoLayout composable
 *
 * Reactively generates auto-layout from HeroViewConfig
 */
export function useAutoLayout(config: Ref<HeroViewConfig>) {
  return computed(() => generateAutoLayout(config.value))
}

export default useAutoLayout
