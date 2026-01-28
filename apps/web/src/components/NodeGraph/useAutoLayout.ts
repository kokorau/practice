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
  /** Grid column (0-based) */
  column: number
  /** Grid row start (0-based) */
  row: number
  /** How many rows this node spans (default: 1, use 2 for vertical centering) */
  rowSpan?: number
  /** Whether this node is inside a processor box */
  isProcessorInternal?: boolean
  /** Parent group ID (for nodes belonging to a group) */
  parentGroupId?: string
  /** Original config reference */
  config?: LayerNodeConfig | ProcessorConfig | NormalizedSurfaceConfig
}

/**
 * Represents a node in the pipeline sequence (internal)
 */
interface PipelineNode {
  node: GraphNode
  /** Relative column position within the pipeline (0 = leftmost) */
  relativeColumn: number
}

/**
 * Represents a group's pipeline structure (internal)
 */
interface GroupPipeline {
  groupId: string
  groupName: string
  /** All nodes in this pipeline with their relative positions */
  pipelineNodes: PipelineNode[]
  /** The length of this pipeline (number of columns) */
  pipelineLength: number
  /** The row index where this group starts (in 2-row units) */
  groupRowStart: number
  /** The node ID that represents this group's output */
  outputNodeId: string
}

/**
 * Exported processor group with absolute grid positions
 * Calculated from nodes with isProcessorInternal: true
 */
export interface ProcessorGroup {
  processorId: string
  /** Absolute start column */
  startColumn: number
  /** Absolute end column */
  endColumn: number
  /** Absolute start row */
  startRow: number
  /** Absolute end row (exclusive, for grid-row-end) */
  endRow: number
}

export interface AutoLayoutResult {
  /** All graph nodes */
  nodes: GraphNode[]
  /** Connections between nodes */
  connections: Connection[]
  /** Number of columns in the layout */
  columnCount: number
  /** Source nodes (surfaces, images) */
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
  /** Processor groups for visual grouping (with absolute positions) */
  processorGroups: ProcessorGroup[]
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
// Constants
// ============================================================

/** Each group uses 2 grid rows (row 0 for main nodes, row 1 for graymaps) */
const ROWS_PER_GROUP = 2

// ============================================================
// Main Layout Logic
// ============================================================

/**
 * Generate auto-layout from HeroViewConfig
 *
 * Grid-based layout with 2 rows per group:
 * - Row 0: Main pipeline nodes (sources with rowSpan:2, effects with rowSpan:2, masks)
 * - Row 1: Graymap nodes (mask input sources)
 * - Pipelines are right-aligned (shorter pipelines start further right)
 */
export function generateAutoLayout(config: HeroViewConfig): AutoLayoutResult {
  const connections: Connection[] = []
  const groupPipelines: GroupPipeline[] = []

  let currentGroupIndex = 0

  // Phase 1: Build pipeline structures for each group
  for (const layer of config.layers) {
    if (!layer.visible) continue

    if (isGroup(layer)) {
      const pipeline = buildGroupPipeline(layer, currentGroupIndex, connections)
      groupPipelines.push(pipeline)
      currentGroupIndex++
    } else if (isProcessor(layer)) {
      // Top-level processor - create pipeline for its modifiers
      const pipeline = buildProcessorPipeline(layer, currentGroupIndex, connections)
      groupPipelines.push(pipeline)
      currentGroupIndex++
    } else if (isSurface(layer) || isImage(layer)) {
      // Top-level source without group - create implicit single-node pipeline
      const sourceNode: GraphNode = {
        id: layer.id,
        type: isSurface(layer) ? 'surface' : 'image',
        label: isSurface(layer) ? getSurfaceLabel((layer as SurfaceLayerNodeConfig).surface) : 'Image',
        column: 0, // Will be adjusted in Phase 2
        row: currentGroupIndex * ROWS_PER_GROUP,
        rowSpan: ROWS_PER_GROUP,
        config: layer,
      }
      groupPipelines.push({
        groupId: `implicit-${layer.id}`,
        groupName: layer.name || 'Layer',
        pipelineNodes: [{ node: sourceNode, relativeColumn: 0 }],
        pipelineLength: 1,
        groupRowStart: currentGroupIndex * ROWS_PER_GROUP,
        outputNodeId: sourceNode.id,
      })
      currentGroupIndex++
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

  // Calculate total grid rows and center position
  const totalGridRows = currentGroupIndex * ROWS_PER_GROUP
  const centerRow = Math.floor((totalGridRows - ROWS_PER_GROUP) / 2)

  let compositeNode: GraphNode | null = null
  if (needsComposite) {
    compositeNode = {
      id: 'composite',
      type: 'composite',
      label: 'Composite',
      column: compositeColumn,
      row: centerRow,
      rowSpan: ROWS_PER_GROUP,
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
      rowSpan: ROWS_PER_GROUP,
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

  // Phase 4: Calculate processor groups from isProcessorInternal nodes
  // Note: Processor box covers only the main row (row 0 within group), not the graymap row
  const processorGroups: ProcessorGroup[] = []
  const internalNodes = nodes.filter((n) => n.isProcessorInternal)

  if (internalNodes.length > 0) {
    // Group by parentGroupId to handle multiple processors
    const groupedByParent = new Map<string | undefined, GraphNode[]>()
    for (const node of internalNodes) {
      const key = node.parentGroupId
      if (!groupedByParent.has(key)) {
        groupedByParent.set(key, [])
      }
      groupedByParent.get(key)!.push(node)
    }

    for (const [groupId, groupNodes] of groupedByParent) {
      if (groupNodes.length > 0) {
        const cols = groupNodes.map((n) => n.column)
        const rows = groupNodes.map((n) => n.row)
        // Use only startRow for processor box (don't include rowSpan which extends into graymap row)
        // Processor box covers just the main row, so endRow = startRow + 1
        const minRow = Math.min(...rows)

        processorGroups.push({
          processorId: groupId ?? 'processor',
          startColumn: Math.min(...cols),
          endColumn: Math.max(...cols),
          startRow: minRow,
          endRow: minRow + 1, // Cover only the main row, not graymap row
        })
      }
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
    processorGroups,
  }
}

/**
 * Build a GroupPipeline from a top-level processor layer
 *
 * This handles processor layers that are direct children of config.layers,
 * not inside a group layer. The processor modifiers form the pipeline.
 */
function buildProcessorPipeline(
  processor: ProcessorNodeConfig,
  groupIndex: number,
  connections: Connection[]
): GroupPipeline {
  const pipelineNodes: PipelineNode[] = []
  let relativeColumn = 0

  // Calculate base row for this group (each group uses ROWS_PER_GROUP rows)
  const groupBaseRow = groupIndex * ROWS_PER_GROUP

  let prevModifierNodeId: string | null = null
  let outputNodeId: string = processor.id

  for (let mIndex = 0; mIndex < processor.modifiers.length; mIndex++) {
    const modifier = processor.modifiers[mIndex]

    if (modifier.type === 'effect') {
      const effectNode: GraphNode = {
        id: `${processor.id}-effect-${mIndex}`,
        type: 'effect',
        label: getEffectLabel(modifier),
        column: 0, // Will be adjusted later
        row: groupBaseRow,
        rowSpan: 1, // Same row as masks
        isProcessorInternal: true, // Inside processor box
        parentGroupId: processor.id,
        config: modifier,
      }
      pipelineNodes.push({ node: effectNode, relativeColumn })

      // Connect from previous modifier if any
      if (prevModifierNodeId !== null) {
        connections.push({
          from: { nodeId: prevModifierNodeId, position: 'right' },
          to: { nodeId: effectNode.id, position: 'left' },
        })
      }

      prevModifierNodeId = effectNode.id
      outputNodeId = effectNode.id
      relativeColumn++
    } else if (modifier.type === 'mask') {
      // Check if mask has graymap children
      const hasGraymap = modifier.children && modifier.children.length > 0

      const maskNode: GraphNode = {
        id: `${processor.id}-mask-${mIndex}`,
        type: 'mask',
        label: 'Mask',
        column: 0, // Will be adjusted later
        row: groupBaseRow,
        rowSpan: hasGraymap ? 1 : ROWS_PER_GROUP, // Top only if has graymap, else centered
        isProcessorInternal: true, // Inside processor box
        parentGroupId: processor.id,
        config: modifier,
      }
      pipelineNodes.push({ node: maskNode, relativeColumn })

      // Connect from previous modifier (main input)
      if (prevModifierNodeId !== null) {
        connections.push({
          from: { nodeId: prevModifierNodeId, position: 'right' },
          to: { nodeId: maskNode.id, position: 'left', portOffset: hasGraymap ? 0.3 : 0.5 },
        })
      }

      // Create graymap if mask has children
      if (hasGraymap) {
        let graymapLabel = 'Graymap'
        const firstChild = modifier.children![0]
        if (firstChild && isSurface(firstChild)) {
          graymapLabel = getSurfaceLabel(firstChild.surface)
        }

        const graymapNode: GraphNode = {
          id: `${processor.id}-graymap-${mIndex}`,
          type: 'graymap',
          label: graymapLabel,
          column: 0, // Will be adjusted later
          row: groupBaseRow + 1, // Bottom row
          rowSpan: 1,
          isProcessorInternal: false, // Outside processor box
          parentGroupId: processor.id,
          config: firstChild?.type === 'surface' ? (firstChild as SurfaceLayerNodeConfig).surface : undefined,
        }
        // Place graymap at the same column as the mask (for top-level processors)
        pipelineNodes.push({ node: graymapNode, relativeColumn })

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

  return {
    groupId: processor.id,
    groupName: processor.name || 'Processor',
    pipelineNodes,
    pipelineLength: relativeColumn,
    groupRowStart: groupBaseRow,
    outputNodeId,
  }
}

/**
 * Build a GroupPipeline from a group layer
 *
 * Grid-based layout:
 * - Sources: row 0, rowSpan 2 (vertically centered)
 * - Effects: row 0, rowSpan 2, isProcessorInternal (vertically centered, in processor box)
 * - Masks: row 0, rowSpan 1, isProcessorInternal (top only, in processor box)
 * - Graymaps: row 1, rowSpan 1 (bottom only, outside processor box)
 */
function buildGroupPipeline(
  group: GroupLayerNodeConfig,
  groupIndex: number,
  connections: Connection[]
): GroupPipeline {
  const pipelineNodes: PipelineNode[] = []
  let relativeColumn = 0

  // Calculate base row for this group (each group uses ROWS_PER_GROUP rows)
  const groupBaseRow = groupIndex * ROWS_PER_GROUP

  // Track nodes for connections
  const sourceNodeIds: string[] = []
  let outputNodeId: string = group.id

  // Step 1: Extract sources from group children
  for (const child of group.children) {
    if (!child.visible) continue

    if (isSurface(child) || isImage(child)) {
      const sourceNode: GraphNode = {
        id: child.id,
        type: isSurface(child) ? 'surface' : 'image',
        label: isSurface(child) ? getSurfaceLabel((child as SurfaceLayerNodeConfig).surface) : 'Image',
        column: 0, // Will be adjusted later
        row: groupBaseRow,
        rowSpan: ROWS_PER_GROUP, // Vertically centered
        parentGroupId: group.id,
        config: child,
      }
      pipelineNodes.push({ node: sourceNode, relativeColumn })
      sourceNodeIds.push(sourceNode.id)
      outputNodeId = sourceNode.id
    }
  }

  // Move to next column if we have sources
  if (sourceNodeIds.length > 0) {
    relativeColumn++
  }

  // Step 2: Extract processor and its modifiers
  for (const child of group.children) {
    if (!child.visible) continue

    if (isProcessor(child)) {
      let prevModifierNodeId: string | null = null

      for (let mIndex = 0; mIndex < child.modifiers.length; mIndex++) {
        const modifier = child.modifiers[mIndex]

        if (modifier.type === 'effect') {
          const effectNode: GraphNode = {
            id: `${child.id}-effect-${mIndex}`,
            type: 'effect',
            label: getEffectLabel(modifier),
            column: 0, // Will be adjusted later
            row: groupBaseRow,
            rowSpan: 1, // Same row as masks
            isProcessorInternal: true, // Inside processor box
            parentGroupId: group.id,
            config: modifier,
          }
          pipelineNodes.push({ node: effectNode, relativeColumn })

          // Connect from sources or previous modifier
          if (prevModifierNodeId === null) {
            for (const sourceId of sourceNodeIds) {
              connections.push({
                from: { nodeId: sourceId, position: 'right' },
                to: { nodeId: effectNode.id, position: 'left' },
              })
            }
          } else {
            connections.push({
              from: { nodeId: prevModifierNodeId, position: 'right' },
              to: { nodeId: effectNode.id, position: 'left' },
            })
          }

          prevModifierNodeId = effectNode.id
          outputNodeId = effectNode.id
          relativeColumn++
        } else if (modifier.type === 'mask') {
          // Check if mask has graymap children
          const hasGraymap = modifier.children && modifier.children.length > 0

          const maskNode: GraphNode = {
            id: `${child.id}-mask-${mIndex}`,
            type: 'mask',
            label: 'Mask',
            column: 0, // Will be adjusted later
            row: groupBaseRow,
            rowSpan: hasGraymap ? 1 : ROWS_PER_GROUP, // Top only if has graymap, else centered
            isProcessorInternal: true, // Inside processor box
            parentGroupId: group.id,
            config: modifier,
          }
          pipelineNodes.push({ node: maskNode, relativeColumn })

          // Connect from sources or previous modifier (main input)
          if (prevModifierNodeId === null) {
            for (const sourceId of sourceNodeIds) {
              connections.push({
                from: { nodeId: sourceId, position: 'right' },
                to: { nodeId: maskNode.id, position: 'left', portOffset: hasGraymap ? 0.3 : 0.5 },
              })
            }
          } else {
            connections.push({
              from: { nodeId: prevModifierNodeId, position: 'right' },
              to: { nodeId: maskNode.id, position: 'left', portOffset: hasGraymap ? 0.3 : 0.5 },
            })
          }

          // Create graymap if mask has children
          if (hasGraymap) {
            let graymapLabel = 'Graymap'
            const firstChild = modifier.children![0]
            if (firstChild && isSurface(firstChild)) {
              graymapLabel = getSurfaceLabel(firstChild.surface)
            }

            const graymapNode: GraphNode = {
              id: `${child.id}-graymap-${mIndex}`,
              type: 'graymap',
              label: graymapLabel,
              column: 0, // Will be adjusted later
              row: groupBaseRow + 1, // Bottom row
              rowSpan: 1,
              isProcessorInternal: false, // Outside processor box
              parentGroupId: group.id,
              config: firstChild?.type === 'surface' ? (firstChild as SurfaceLayerNodeConfig).surface : undefined,
            }
            // Place graymap one column left of the mask
            const graymapRelativeColumn = Math.max(0, relativeColumn - 1)
            pipelineNodes.push({ node: graymapNode, relativeColumn: graymapRelativeColumn })

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
    groupRowStart: groupBaseRow,
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
