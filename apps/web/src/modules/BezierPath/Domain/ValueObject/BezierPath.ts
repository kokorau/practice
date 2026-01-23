/**
 * BezierPath - Re-exports from @practice/bezier with $BezierPath API wrapper
 */

// Re-export types
export type { BezierPath, BezierAnchor, BezierHandle, HandleMode } from '@practice/bezier'

// Import functions for $BezierPath wrapper
import {
  identity,
  easeInOut,
  isValid,
  getXConstraints,
  addAnchor,
  removeAnchor,
  updateAnchor,
  updateHandle,
  setHandleMode,
  recalculateAutoHandles,
  evaluate,
  toSvgPath,
  toLut,
  toLutClamped,
} from '@practice/bezier'

/**
 * $BezierPath - API object for backward compatibility
 * Wraps @practice/bezier functions
 */
export const $BezierPath = {
  identity,
  easeInOut,
  isValid,
  getXConstraints,
  addAnchor,
  removeAnchor,
  updateAnchor,
  updateHandle,
  setHandleMode,
  recalculateAutoHandles,
  evaluate,
  toSvgPath,
  toLut,
  toLutClamped,
}
