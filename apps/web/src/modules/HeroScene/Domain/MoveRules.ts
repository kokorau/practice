/**
 * Move Rules - Domain layer constraints for node structure
 *
 * Provides utilities for Figma-style mask architecture and modifier movement.
 *
 * Rule: Within a Group, nodes after a MaskNode are masked by it
 */

import type { SceneNode, Layer, Group } from './LayerNode'
import type { Modifier } from './Modifier'
import { isGroup, isLayer, isMaskNode, findNode, findParentNode } from './LayerNode'

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
// Modifier Movement
// ============================================================

/**
 * Helper to check if a node has modifiers (Layer or Group)
 */
const hasModifiers = (node: SceneNode): node is Layer | Group =>
  isLayer(node) || isGroup(node)

/**
 * Move a modifier within the same node's modifiers or to another node's modifiers
 *
 * @param nodes - Scene node tree
 * @param modifierId - ID or index of the modifier to move (using index as string for now)
 * @param sourceNodeId - ID of the node containing the modifier
 * @param targetNodeId - ID of the node to move the modifier to
 * @param position - Target position (index) in the target node's modifiers
 * @returns Updated scene node tree (immutable)
 *
 * @example
 * // Move modifier at index 0 from layer1 to layer2 at position 1
 * const newNodes = moveModifier(nodes, '0', 'layer1', 'layer2', 1)
 *
 * @example
 * // Reorder within same node: move index 2 to position 0
 * const newNodes = moveModifier(nodes, '2', 'layer1', 'layer1', 0)
 */
export const moveModifier = (
  nodes: SceneNode[],
  modifierId: string,
  sourceNodeId: string,
  targetNodeId: string,
  position: number
): SceneNode[] => {
  const sourceNode = findNode(nodes, sourceNodeId)
  const targetNode = findNode(nodes, targetNodeId)

  // Validate source and target nodes exist and have modifiers
  if (!sourceNode || !hasModifiers(sourceNode)) {
    return nodes
  }
  if (!targetNode || !hasModifiers(targetNode)) {
    return nodes
  }

  const modifierIndex = parseInt(modifierId, 10)

  // Validate modifier index
  if (isNaN(modifierIndex) || modifierIndex < 0 || modifierIndex >= sourceNode.modifiers.length) {
    return nodes
  }

  const modifierToMove = sourceNode.modifiers[modifierIndex]
  if (!modifierToMove) {
    return nodes
  }

  // Same node: reorder within modifiers
  if (sourceNodeId === targetNodeId) {
    return reorderModifierWithinNode(nodes, sourceNodeId, modifierIndex, position)
  }

  // Different nodes: move modifier between nodes
  return moveModifierBetweenNodes(nodes, sourceNodeId, targetNodeId, modifierIndex, position)
}

/**
 * Reorder a modifier within the same node's modifiers array
 */
const reorderModifierWithinNode = (
  nodes: SceneNode[],
  nodeId: string,
  fromIndex: number,
  toIndex: number
): SceneNode[] => {
  return nodes.map(node => {
    if (node.id === nodeId && hasModifiers(node)) {
      const modifiers = [...node.modifiers]
      const [modifier] = modifiers.splice(fromIndex, 1)
      if (!modifier) return node

      // Adjust toIndex if moving from lower to higher index
      const adjustedIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
      const clampedIndex = Math.max(0, Math.min(adjustedIndex, modifiers.length))
      modifiers.splice(clampedIndex, 0, modifier)

      return { ...node, modifiers }
    }
    if (isGroup(node)) {
      return {
        ...node,
        children: reorderModifierWithinNode(node.children, nodeId, fromIndex, toIndex),
      }
    }
    return node
  })
}

/**
 * Move a modifier from one node to another
 */
const moveModifierBetweenNodes = (
  nodes: SceneNode[],
  sourceNodeId: string,
  targetNodeId: string,
  modifierIndex: number,
  targetPosition: number
): SceneNode[] => {
  // First, find and extract the modifier from source
  let modifierToMove: Modifier | undefined

  const nodesWithRemovedModifier = nodes.map(function removeFromSource(node): SceneNode {
    if (node.id === sourceNodeId && hasModifiers(node)) {
      const newModifiers = [...node.modifiers]
      const [removed] = newModifiers.splice(modifierIndex, 1)
      modifierToMove = removed
      return { ...node, modifiers: newModifiers }
    }
    if (isGroup(node)) {
      return {
        ...node,
        children: node.children.map(removeFromSource),
      }
    }
    return node
  })

  if (!modifierToMove) {
    return nodes
  }

  // Then, insert the modifier into target
  const finalModifier = modifierToMove
  return nodesWithRemovedModifier.map(function insertIntoTarget(node): SceneNode {
    if (node.id === targetNodeId && hasModifiers(node)) {
      const newModifiers = [...node.modifiers]
      const clampedPosition = Math.max(0, Math.min(targetPosition, newModifiers.length))
      newModifiers.splice(clampedPosition, 0, finalModifier)
      return { ...node, modifiers: newModifiers }
    }
    if (isGroup(node)) {
      return {
        ...node,
        children: node.children.map(insertIntoTarget),
      }
    }
    return node
  })
}
