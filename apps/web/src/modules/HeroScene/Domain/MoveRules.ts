/**
 * Move Rules - Domain layer constraints for node structure
 *
 * Provides utilities for Figma-style mask architecture.
 *
 * Rule: Within a Group, nodes after a MaskNode are masked by it
 */

import type { SceneNode } from './LayerNode'
import { isGroup, isMaskNode, findParentNode } from './LayerNode'

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
