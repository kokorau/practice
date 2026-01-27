/**
 * useAutoLayout
 *
 * HeroViewConfig からノードグラフのレイアウトを自動生成するコンポーザブル
 *
 * Layout strategy:
 * - Column 1: Source nodes (Surfaces, Images, etc.)
 * - Column 2: Processor pipelines (contains Effects, Masks, Graymaps)
 * - Column 3: Render output
 *
 * Each Processor applies to its preceding sibling nodes.
 * Multiple Processors at root level are not yet supported.
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
  /** Original config reference */
  config?: LayerNodeConfig | ProcessorConfig | NormalizedSurfaceConfig
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
 * Extract visible source layers (surfaces, images) from a layer tree
 * Flattens groups and collects all visible source layers
 */
function extractSourceLayers(layers: LayerNodeConfig[]): LayerNodeConfig[] {
  const sources: LayerNodeConfig[] = []

  for (const layer of layers) {
    if (!layer.visible) continue

    if (isSurface(layer) || isImage(layer)) {
      sources.push(layer)
    } else if (isGroup(layer)) {
      // Recursively extract from groups
      sources.push(...extractSourceLayers(layer.children))
    }
  }

  return sources
}

/**
 * Get all processors from a layer tree (including nested in groups)
 */
function extractProcessors(layers: LayerNodeConfig[]): ProcessorNodeConfig[] {
  const processors: ProcessorNodeConfig[] = []

  for (const layer of layers) {
    if (!layer.visible) continue

    if (isProcessor(layer)) {
      processors.push(layer)
    } else if (isGroup(layer)) {
      processors.push(...extractProcessors(layer.children))
    }
  }

  return processors
}

// ============================================================
// Main Layout Logic
// ============================================================

/**
 * Generate auto-layout from HeroViewConfig
 */
export function generateAutoLayout(config: HeroViewConfig): AutoLayoutResult {
  const nodes: GraphNode[] = []
  const connections: Connection[] = []

  // Extract source layers (surfaces, images)
  const sourceLayers = extractSourceLayers(config.layers)

  // Extract processors
  const processors = extractProcessors(config.layers)

  // Column 0: Source nodes
  const sourceNodes: GraphNode[] = []
  sourceLayers.forEach((layer, index) => {
    if (isSurface(layer)) {
      const node: GraphNode = {
        id: layer.id,
        type: 'surface',
        label: getSurfaceLabel(layer.surface),
        column: 0,
        row: index,
        config: layer,
      }
      sourceNodes.push(node)
      nodes.push(node)
    } else if (isImage(layer)) {
      const node: GraphNode = {
        id: layer.id,
        type: 'image',
        label: 'Image',
        column: 0,
        row: index,
        config: layer,
      }
      sourceNodes.push(node)
      nodes.push(node)
    }
  })

  // Column 1: Processor pipelines with their internal filters
  const processorNodes: GraphNode[] = []
  const filterNodes: GraphNode[] = []
  const graymapNodes: GraphNode[] = []

  processors.forEach((processor, pIndex) => {
    // Create processor pipeline node
    const pipelineNode: GraphNode = {
      id: processor.id,
      type: 'processor',
      label: processor.name || 'Processor',
      column: 1,
      row: pIndex,
      config: processor,
    }
    processorNodes.push(pipelineNode)
    nodes.push(pipelineNode)

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
          config: modifier,
        }
        filterNodes.push(effectNode)
        nodes.push(effectNode)
        filterIndex++
      } else if (modifier.type === 'mask') {
        const maskNode: GraphNode = {
          id: `${processor.id}-mask-${mIndex}`,
          type: 'mask',
          label: 'Mask',
          column: 1,
          row: filterIndex,
          parentPipelineId: processor.id,
          config: modifier,
        }
        filterNodes.push(maskNode)
        nodes.push(maskNode)

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
            row: filterIndex, // Same row as mask, but displayed below
            parentPipelineId: processor.id,
            config: modifier.children[0]?.type === 'surface' ? (modifier.children[0] as SurfaceLayerNodeConfig).surface : undefined,
          }
          graymapNodes.push(graymapNode)
          nodes.push(graymapNode)
        }
        filterIndex++
      }
    })

    // Connections: Sources → Processor
    const numSources = sourceNodes.length
    sourceNodes.forEach((source, sIndex) => {
      const portOffset = numSources > 1
        ? 0.2 + (0.6 * sIndex) / (numSources - 1)
        : 0.5

      connections.push({
        from: { nodeId: source.id, position: 'right' },
        to: { nodeId: processor.id, position: 'left', portOffset },
      })
    })
  })

  // Column 2: Render node
  let renderNode: GraphNode | null = null
  if (processors.length > 0 || sourceNodes.length > 0) {
    renderNode = {
      id: 'render',
      type: 'render',
      label: 'Output',
      column: 2,
      row: 0,
    }
    nodes.push(renderNode)

    // Connection: Processor → Render (or Source → Render if no processor)
    if (processorNodes.length > 0) {
      processorNodes.forEach((processor) => {
        connections.push({
          from: { nodeId: processor.id, position: 'right' },
          to: { nodeId: 'render', position: 'left' },
        })
      })
    } else if (sourceNodes.length > 0) {
      // Direct source to render connection
      sourceNodes.forEach((source, sIndex) => {
        const portOffset = sourceNodes.length > 1
          ? 0.2 + (0.6 * sIndex) / (sourceNodes.length - 1)
          : 0.5

        connections.push({
          from: { nodeId: source.id, position: 'right' },
          to: { nodeId: 'render', position: 'left', portOffset },
        })
      })
    }
  }

  return {
    nodes,
    connections,
    columnCount: 3,
    sourceNodes,
    processorNodes,
    filterNodes,
    graymapNodes,
    renderNode,
  }
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
