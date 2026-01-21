/**
 * DSL for intensity functions and transformations
 *
 * @example
 * // Basic usage
 * evaluate('add(t, 3)', { t: 2 }) // => 5
 *
 * // Range mapping
 * evaluate('range(t, 0, 100)', { t: 0.5 }) // => 50
 *
 * // Complex expressions
 * evaluate('mul(sin(t), range(t, 0, 10))', { t: 0.5 })
 */

export type { AstNode, NumberNode, IdentifierNode, CallNode } from './ast'
export { $Ast } from './ast'
export { parse } from './parser'
export { evaluate, Evaluator, type Context, type BuiltinFunction } from './evaluator'
export { extractPeriod, extractAllPeriods } from './analyze'
