/**
 * extractSubgraph
 *
 * 特定のノードIDを指定すると、そのノードに至るまでのフロー（上流ノードと接続）だけを抽出する
 *
 * Algorithm:
 * 1. Connectionから依存関係マップを構築（to → from[] の逆引き）
 * 2. targetNodeIdから上流ノードを再帰的に収集
 * 3. 必要なノードとコネクションをフィルタリング
 * 4. AutoLayoutResult形式で返却
 *
 * Special cases:
 * - Pipeline内ノード（effect/mask）→ 親processorも含める
 * - Mask → Graymapも自動で含まれる（コネクション経由）
 * - Processor指定 → 内部ノード全てを含める
 */

import { computed, type Ref, unref, type MaybeRef } from 'vue'
import type { Connection } from './types'
import type { AutoLayoutResult, GraphNode } from './useAutoLayout'

/**
 * Build dependency map from connections (to.nodeId → from.nodeId[])
 * Excludes internal output connections (child → parent processor) to avoid
 * treating downstream nodes as dependencies.
 */
function buildDependencyMap(
  connections: Connection[],
  nodes: GraphNode[]
): Map<string, string[]> {
  const map = new Map<string, string[]>()

  // Build a lookup for node parentPipelineId
  const parentMap = new Map<string, string | undefined>()
  for (const node of nodes) {
    parentMap.set(node.id, node.parentPipelineId)
  }

  for (const conn of connections) {
    const toId = conn.to.nodeId
    const fromId = conn.from.nodeId

    // Skip internal output connections (child → parent processor)
    // These represent "output to" not "depends on"
    const fromParent = parentMap.get(fromId)
    if (fromParent && fromParent === toId) {
      continue
    }

    const existing = map.get(toId) ?? []
    if (!existing.includes(fromId)) {
      existing.push(fromId)
    }
    map.set(toId, existing)
  }

  return map
}

/**
 * Recursively collect upstream node IDs from target
 */
function collectUpstreamNodes(
  targetId: string,
  dependencyMap: Map<string, string[]>,
  collected: Set<string>
): void {
  if (collected.has(targetId)) return
  collected.add(targetId)

  const upstreams = dependencyMap.get(targetId) ?? []
  for (const upstreamId of upstreams) {
    collectUpstreamNodes(upstreamId, dependencyMap, collected)
  }
}

/**
 * Extract a subgraph containing only nodes upstream of (and including) the target node
 *
 * @param layout - Full AutoLayoutResult from useAutoLayout
 * @param targetNodeId - Target node ID to extract subgraph for
 * @returns Filtered AutoLayoutResult containing only upstream nodes and connections
 *
 * @example
 * ```typescript
 * const fullLayout = generateAutoLayout(config)
 * // Extract subgraph up to a specific effect
 * const subgraph = extractSubgraph(fullLayout, 'processor-1-effect-0')
 * ```
 */
export function extractSubgraph(
  layout: AutoLayoutResult,
  targetNodeId: string
): AutoLayoutResult {
  const { nodes, connections } = layout

  // Check if target exists
  const targetNode = nodes.find((n) => n.id === targetNodeId)
  if (!targetNode) {
    // Return empty result if target not found
    return {
      nodes: [],
      connections: [],
      columnCount: layout.columnCount,
      sourceNodes: [],
      processorNodes: [],
      filterNodes: [],
      graymapNodes: [],
      renderNode: null,
    }
  }

  // Build dependency map (excludes internal output connections)
  const dependencyMap = buildDependencyMap(connections, nodes)

  // Collect upstream nodes
  const collectedIds = new Set<string>()
  collectUpstreamNodes(targetNodeId, dependencyMap, collectedIds)

  // Special case: If target is inside a pipeline, include parent processor
  if (targetNode.parentPipelineId) {
    collectedIds.add(targetNode.parentPipelineId)
  }

  // Special case: For each processor in the collected set, include all internal nodes
  // UNLESS the target is inside that processor (in which case upstream traversal handles it)
  for (const nodeId of Array.from(collectedIds)) {
    const node = nodes.find((n) => n.id === nodeId)
    if (node?.type === 'processor') {
      // If target is not inside this processor, include all internal nodes
      if (targetNode.parentPipelineId !== nodeId) {
        const internalNodes = nodes.filter((n) => n.parentPipelineId === nodeId)
        for (const internal of internalNodes) {
          collectedIds.add(internal.id)
        }
      }
    }
  }

  // Filter nodes
  const filteredNodes = nodes.filter((n) => collectedIds.has(n.id))

  // Filter connections (both from and to must be in the collected set)
  const filteredConnections = connections.filter(
    (c) => collectedIds.has(c.from.nodeId) && collectedIds.has(c.to.nodeId)
  )

  // Rebuild categorized node lists
  const sourceNodes = filteredNodes.filter(
    (n) => n.type === 'surface' || n.type === 'image'
  )
  const processorNodes = filteredNodes.filter((n) => n.type === 'processor')
  const filterNodes = filteredNodes.filter(
    (n) => n.type === 'effect' || n.type === 'mask'
  )
  const graymapNodes = filteredNodes.filter((n) => n.type === 'graymap')
  const renderNode = filteredNodes.find((n) => n.type === 'render') ?? null

  return {
    nodes: filteredNodes,
    connections: filteredConnections,
    columnCount: layout.columnCount,
    sourceNodes,
    processorNodes,
    filterNodes,
    graymapNodes,
    renderNode,
  }
}

/**
 * useSubgraph composable
 *
 * Reactively extracts a subgraph for a target node
 *
 * @param layout - Reactive AutoLayoutResult reference
 * @param targetNodeId - Target node ID (can be reactive)
 * @returns Computed subgraph AutoLayoutResult
 *
 * @example
 * ```typescript
 * const layout = useAutoLayout(config)
 * const targetId = ref('processor-1-effect-0')
 * const subgraph = useSubgraph(layout, targetId)
 *
 * // subgraph updates when layout or targetId changes
 * ```
 */
export function useSubgraph(
  layout: Ref<AutoLayoutResult>,
  targetNodeId: MaybeRef<string>
) {
  return computed(() => extractSubgraph(layout.value, unref(targetNodeId)))
}
