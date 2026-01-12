/**
 * Move Rules - Domain layer constraints for node structure
 *
 * Provides utilities for Figma-style mask architecture.
 *
 * Rules:
 * 1. BaseLayer position is fixed at layers[0]
 * 2. BaseLayer cannot have MaskNode as a child
 * 3. Within a Group, nodes after a MaskNode are masked by it
 */

import type { SceneNode } from './LayerNode'
import { isGroup, isMaskNode, isBaseLayer, findParentNode } from './LayerNode'

// ============================================================
// Mask Scope Utilities
// ============================================================

/**
 * Get nodes that are masked by a specific MaskNode within a group
 *
 * In Figma-style masking, all siblings AFTER the mask node are masked.
 *
 * Example:
 * ```
 * <group>
 *   <layer1 />      <!-- Not masked -->
 *   <mask />        <!-- Mask node -->
 *   <layer2 />      <!-- Masked -->
 *   <layer3 />      <!-- Masked -->
 * </group>
 * ```
 */
export const getMaskedNodes = (
  groupChildren: SceneNode[],
  maskNodeId: string
): SceneNode[] => {
  const maskIndex = groupChildren.findIndex(child => child.id === maskNodeId)

  if (maskIndex === -1) {
    return []
  }

  // Return all nodes after the mask
  return groupChildren.slice(maskIndex + 1)
}

/**
 * Find the mask node that applies to a given node within a group
 *
 * Returns the closest mask node that appears BEFORE the target node,
 * or undefined if no mask applies.
 */
export const findApplicableMask = (
  groupChildren: SceneNode[],
  targetNodeId: string
): SceneNode | undefined => {
  const targetIndex = groupChildren.findIndex(child => child.id === targetNodeId)

  if (targetIndex === -1) {
    return undefined
  }

  // Search backwards for the nearest mask node
  for (let i = targetIndex - 1; i >= 0; i--) {
    const node = groupChildren[i]
    if (node && isMaskNode(node)) {
      return node
    }
  }

  return undefined
}

/**
 * Check if a node is masked within its parent group
 */
export const isNodeMasked = (
  nodes: SceneNode[],
  nodeId: string
): boolean => {
  const parent = findParentNode(nodes, nodeId)

  if (!parent || !isGroup(parent)) {
    return false
  }

  return findApplicableMask(parent.children, nodeId) !== undefined
}

// ============================================================
// BaseLayer Utilities
// ============================================================

/**
 * Ensure BaseLayer is at index 0
 * This is a recovery function that fixes incorrect layer order
 */
export const ensureBaseLayerFirst = (nodes: SceneNode[]): SceneNode[] => {
  const baseLayerIndex = nodes.findIndex(isBaseLayer)

  if (baseLayerIndex === -1 || baseLayerIndex === 0) {
    return nodes
  }

  // Move base layer to index 0
  const baseLayer = nodes[baseLayerIndex]
  if (!baseLayer) {
    return nodes
  }
  const withoutBase = nodes.filter((_, i) => i !== baseLayerIndex)
  return [baseLayer, ...withoutBase]
}

/**
 * Check if the layer structure is valid
 * Returns true if BaseLayer is at index 0
 */
export const isValidLayerStructure = (nodes: SceneNode[]): boolean => {
  if (nodes.length === 0) {
    return true
  }

  const firstNode = nodes[0]
  return firstNode ? isBaseLayer(firstNode) : true
}
