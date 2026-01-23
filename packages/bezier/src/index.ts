/**
 * @practice/bezier
 *
 * Cubic Bezier curve path library for custom easing
 */

// Types
export type { BezierPath, BezierAnchor, BezierHandle, HandleMode } from './types'

// Evaluation
export { evaluate, cubicBezier, cubicBezierDerivative, findTForX } from './evaluate'

// LUT
export { toLut, toLutClamped, evaluateLut } from './lut'

// Operations
export {
  identity,
  easeInOut,
  addAnchor,
  removeAnchor,
  updateAnchor,
  updateHandle,
  setHandleMode,
  recalculateAutoHandles,
} from './operations'

// Constraints
export { isValid, getXConstraints } from './constraints'

// SVG (for rendering)
export { toSvgPath } from './svg'

// DSL (parse/serialize)
export { parse, tryParse, serialize, tokenize } from './dsl'
export type { ParseResult, SerializeOptions, Token, TokenType } from './dsl'
