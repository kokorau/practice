/**
 * Move Rules - Domain layer constraints for node movement
 *
 * Defines the rules for drag-and-drop operations in the layer tree.
 * Following Figma-style architecture for masks.
 *
 * Rules:
 * 1. BaseLayer position is fixed at layers[0]
 * 2. BaseLayer cannot have MaskNode as a child
 * 3. Within a Group, nodes after a MaskNode are masked by it
 */

import type { SceneNode, DropPosition } from './LayerNode'
import { isGroup, isMaskNode, isBaseLayer, findNode, findParentNode } from './LayerNode'

// ============================================================
// Move Validation Result
// ============================================================

export interface MoveValidationResult {
  valid: boolean
  reason?: string
}

// ============================================================
// Move Rules
// ============================================================

/**
 * Rule 1: BaseLayer must remain at layers[0]
 * BaseLayer cannot be moved from its position
 */
export const canMoveBaseLayer = (node: SceneNode): MoveValidationResult => {
  if (isBaseLayer(node)) {
    return {
      valid: false,
      reason: 'BaseLayer must remain at index 0 and cannot be moved',
    }
  }
  return { valid: true }
}

/**
 * Rule 2: Cannot drop nodes before BaseLayer
 * Nothing can be placed before BaseLayer (it must stay at index 0)
 */
export const canDropBeforeBaseLayer = (
  nodes: SceneNode[],
  targetId: string,
  position: DropPosition
): MoveValidationResult => {
  if (position === 'before') {
    const targetNode = findNode(nodes, targetId)
    if (targetNode && isBaseLayer(targetNode)) {
      return {
        valid: false,
        reason: 'Cannot place nodes before BaseLayer',
      }
    }
  }
  return { valid: true }
}

/**
 * Rule 3: Cannot place MaskNode inside BaseLayer
 * BaseLayer cannot contain mask nodes (as it's the background)
 */
export const canPlaceMaskInBaseLayer = (
  nodes: SceneNode[],
  sourceNode: SceneNode,
  targetId: string,
  position: DropPosition
): MoveValidationResult => {
  if (!isMaskNode(sourceNode)) {
    return { valid: true }
  }

  // Check if trying to drop 'into' a base layer (if it were a group)
  // or next to a child of base layer
  const targetNode = findNode(nodes, targetId)
  if (!targetNode) {
    return { valid: true }
  }

  // If dropping into base layer directly (base layer is a Layer, not a Group, so 'into' would fail anyway)
  // This check is for explicit error messaging
  if (position === 'into' && isBaseLayer(targetNode)) {
    return {
      valid: false,
      reason: 'Cannot place MaskNode inside BaseLayer',
    }
  }

  return { valid: true }
}

/**
 * Rule 4: Cannot drop anything 'into' a non-group node
 */
export const canDropIntoNonGroup = (
  nodes: SceneNode[],
  targetId: string,
  position: DropPosition
): MoveValidationResult => {
  if (position !== 'into') {
    return { valid: true }
  }

  const targetNode = findNode(nodes, targetId)
  if (!targetNode) {
    return { valid: true }
  }

  if (!isGroup(targetNode)) {
    return {
      valid: false,
      reason: 'Can only drop into Group nodes',
    }
  }

  return { valid: true }
}

// ============================================================
// Composite Validation
// ============================================================

/**
 * Validate if a move operation is allowed
 * Combines all move rules
 */
export const validateMove = (
  nodes: SceneNode[],
  sourceId: string,
  targetId: string,
  position: DropPosition
): MoveValidationResult => {
  const sourceNode = findNode(nodes, sourceId)
  if (!sourceNode) {
    return {
      valid: false,
      reason: 'Source node not found',
    }
  }

  // Check all rules in order
  const rules: MoveValidationResult[] = [
    canMoveBaseLayer(sourceNode),
    canDropBeforeBaseLayer(nodes, targetId, position),
    canPlaceMaskInBaseLayer(nodes, sourceNode, targetId, position),
    canDropIntoNonGroup(nodes, targetId, position),
  ]

  for (const result of rules) {
    if (!result.valid) {
      return result
    }
  }

  return { valid: true }
}

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
