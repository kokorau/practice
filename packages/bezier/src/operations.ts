/**
 * Bezier path operations: create, add, remove, update anchors
 */

import type { BezierPath, BezierAnchor, BezierHandle, HandleMode } from './types'
import { cubicBezier, findTForX } from './evaluate'
import { getXConstraints } from './constraints'

/** Minimum gap between adjacent anchor X values */
const MIN_X_GAP = 0.001

/** Tension factor for auto handle calculation */
const AUTO_HANDLE_TENSION = 0.25

/**
 * Calculate auto handles for smooth curve through points
 */
const calculateAutoHandles = (
  prev: BezierAnchor | null,
  current: BezierAnchor,
  next: BezierAnchor | null
): { handleIn: BezierHandle; handleOut: BezierHandle } => {
  let handleIn: BezierHandle = { dx: 0, dy: 0 }
  let handleOut: BezierHandle = { dx: 0, dy: 0 }

  if (prev && next) {
    // Interior point: smooth handles aligned with prev-next direction
    const dx = next.x - prev.x
    const dy = next.y - prev.y

    handleIn = {
      dx: -dx * AUTO_HANDLE_TENSION,
      dy: -dy * AUTO_HANDLE_TENSION,
    }
    handleOut = {
      dx: dx * AUTO_HANDLE_TENSION,
      dy: dy * AUTO_HANDLE_TENSION,
    }
  } else if (prev) {
    // Last point: handle points toward previous
    const dx = current.x - prev.x
    const dy = current.y - prev.y

    handleIn = {
      dx: -dx * AUTO_HANDLE_TENSION,
      dy: -dy * AUTO_HANDLE_TENSION,
    }
  } else if (next) {
    // First point: handle points toward next
    const dx = next.x - current.x
    const dy = next.y - current.y

    handleOut = {
      dx: dx * AUTO_HANDLE_TENSION,
      dy: dy * AUTO_HANDLE_TENSION,
    }
  }

  return { handleIn, handleOut }
}

/**
 * Apply smooth constraint: handleOut = -handleIn (same length, opposite direction)
 */
const applySmoothConstraint = (anchor: BezierAnchor, changedHandle: 'in' | 'out'): BezierAnchor => {
  if (anchor.handleMode !== 'smooth') {
    return anchor
  }

  if (changedHandle === 'in') {
    return {
      ...anchor,
      handleOut: {
        dx: -anchor.handleIn.dx,
        dy: -anchor.handleIn.dy,
      },
    }
  } else {
    return {
      ...anchor,
      handleIn: {
        dx: -anchor.handleOut.dx,
        dy: -anchor.handleOut.dy,
      },
    }
  }
}

/**
 * Create a linear path (identity: 0,0 -> 1,1)
 */
export const identity = (): BezierPath => ({
  anchors: [
    {
      x: 0,
      y: 0,
      handleMode: 'auto',
      handleIn: { dx: 0, dy: 0 },
      handleOut: { dx: 0.25, dy: 0.25 },
    },
    {
      x: 1,
      y: 1,
      handleMode: 'auto',
      handleIn: { dx: -0.25, dy: -0.25 },
      handleOut: { dx: 0, dy: 0 },
    },
  ],
})

/**
 * Create an ease-in-out path (typical S-curve)
 */
export const easeInOut = (): BezierPath => ({
  anchors: [
    {
      x: 0,
      y: 0,
      handleMode: 'smooth',
      handleIn: { dx: 0, dy: 0 },
      handleOut: { dx: 0.42, dy: 0 },
    },
    {
      x: 1,
      y: 1,
      handleMode: 'smooth',
      handleIn: { dx: -0.42, dy: 0 },
      handleOut: { dx: 0, dy: 0 },
    },
  ],
})

/**
 * Add an anchor at a given X position on the curve
 */
export const addAnchor = (path: BezierPath, targetX: number): BezierPath => {
  const { anchors } = path

  // Clamp to valid range
  targetX = Math.max(MIN_X_GAP, Math.min(1 - MIN_X_GAP, targetX))

  // Find the segment containing targetX
  let segmentIndex = 0
  for (let i = 0; i < anchors.length - 1; i++) {
    if (targetX >= anchors[i]!.x && targetX <= anchors[i + 1]!.x) {
      segmentIndex = i
      break
    }
  }

  const p0 = anchors[segmentIndex]!
  const p1 = anchors[segmentIndex + 1]!

  // Calculate control points
  const x0 = p0.x
  const y0 = p0.y
  const x1 = p0.x + p0.handleOut.dx
  const y1 = p0.y + p0.handleOut.dy
  const x2 = p1.x + p1.handleIn.dx
  const y2 = p1.y + p1.handleIn.dy
  const x3 = p1.x
  const y3 = p1.y

  // Find t for targetX
  const t = findTForX(x0, x1, x2, x3, targetX)

  // Calculate Y at this t
  const targetY = cubicBezier(y0, y1, y2, y3, t)

  // De Casteljau split to get new handles
  // First level interpolation
  const ax = x0 + t * (x1 - x0)
  const ay = y0 + t * (y1 - y0)
  const bx = x1 + t * (x2 - x1)
  const by = y1 + t * (y2 - y1)
  const cx = x2 + t * (x3 - x2)
  const cy = y2 + t * (y3 - y2)

  // Second level
  const dx = ax + t * (bx - ax)
  const dy = ay + t * (by - ay)
  const ex = bx + t * (cx - bx)
  const ey = by + t * (cy - by)

  // The new point (third level, which equals targetX, targetY)
  // New handles from the split
  const newAnchor: BezierAnchor = {
    x: targetX,
    y: targetY,
    handleMode: 'smooth',
    handleIn: { dx: dx - targetX, dy: dy - targetY },
    handleOut: { dx: ex - targetX, dy: ey - targetY },
  }

  // Update surrounding anchors' handles
  const newP0: BezierAnchor = {
    ...p0,
    handleOut: { dx: ax - p0.x, dy: ay - p0.y },
  }

  const newP1: BezierAnchor = {
    ...p1,
    handleIn: { dx: cx - p1.x, dy: cy - p1.y },
  }

  // Create new anchors array
  const newAnchors = [...anchors]
  newAnchors[segmentIndex] = newP0
  newAnchors[segmentIndex + 1] = newP1
  newAnchors.splice(segmentIndex + 1, 0, newAnchor)

  return { anchors: newAnchors }
}

/**
 * Recalculate handles for anchors in auto mode
 */
export const recalculateAutoHandles = (path: BezierPath): BezierPath => {
  const { anchors } = path
  const newAnchors = anchors.map((anchor, i) => {
    if (anchor.handleMode !== 'auto') {
      return anchor
    }

    const prev = i > 0 ? anchors[i - 1] : null
    const next = i < anchors.length - 1 ? anchors[i + 1] : null
    const handles = calculateAutoHandles(prev ?? null, anchor, next ?? null)

    return {
      ...anchor,
      ...handles,
    }
  })

  return { anchors: newAnchors }
}

/**
 * Remove an anchor (minimum 2 anchors required)
 */
export const removeAnchor = (path: BezierPath, index: number): BezierPath => {
  const { anchors } = path

  // Can't remove if only 2 anchors left
  if (anchors.length <= 2) {
    return path
  }

  // Can't remove first or last anchor
  if (index === 0 || index === anchors.length - 1) {
    return path
  }

  const newAnchors = anchors.filter((_, i) => i !== index)

  // Recalculate handles for adjacent anchors if in auto mode
  return recalculateAutoHandles({ anchors: newAnchors })
}

/**
 * Update an anchor's position (enforces X constraints)
 */
export const updateAnchor = (
  path: BezierPath,
  index: number,
  updates: Partial<Pick<BezierAnchor, 'x' | 'y' | 'handleMode'>>
): BezierPath => {
  const { anchors } = path
  const current = anchors[index]
  if (!current) return path

  const newAnchor = { ...current }

  // Apply X constraint
  if (updates.x !== undefined) {
    const constraints = getXConstraints(path, index)
    newAnchor.x = Math.max(constraints.min, Math.min(constraints.max, updates.x))
  }

  // Y is free
  if (updates.y !== undefined) {
    newAnchor.y = updates.y
  }

  // Handle mode
  if (updates.handleMode !== undefined) {
    newAnchor.handleMode = updates.handleMode
  }

  const newAnchors = [...anchors]
  newAnchors[index] = newAnchor

  // If auto mode, recalculate handles
  if (newAnchor.handleMode === 'auto') {
    return recalculateAutoHandles({ anchors: newAnchors })
  }

  return { anchors: newAnchors }
}

/**
 * Update a handle's position
 */
export const updateHandle = (
  path: BezierPath,
  anchorIndex: number,
  handleType: 'in' | 'out',
  delta: BezierHandle
): BezierPath => {
  const { anchors } = path
  const current = anchors[anchorIndex]
  if (!current) return path

  let newAnchor = { ...current }

  if (handleType === 'in') {
    newAnchor.handleIn = delta
  } else {
    newAnchor.handleOut = delta
  }

  // Apply smooth constraint if in smooth mode
  newAnchor = applySmoothConstraint(newAnchor, handleType)

  // Switching to corner mode breaks smooth constraint
  if (current.handleMode === 'auto') {
    newAnchor.handleMode = 'smooth'
  }

  const newAnchors = [...anchors]
  newAnchors[anchorIndex] = newAnchor

  return { anchors: newAnchors }
}

/**
 * Set handle mode for an anchor
 */
export const setHandleMode = (path: BezierPath, index: number, mode: HandleMode): BezierPath => {
  const { anchors } = path
  const current = anchors[index]
  if (!current) return path

  const newAnchor = { ...current, handleMode: mode }
  const newAnchors = [...anchors]
  newAnchors[index] = newAnchor

  if (mode === 'auto') {
    return recalculateAutoHandles({ anchors: newAnchors })
  }

  return { anchors: newAnchors }
}
