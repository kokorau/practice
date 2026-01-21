/**
 * AST analysis utilities for DSL
 */

import type { AstNode } from './ast'

/** Functions that have a period parameter as their second argument */
const PERIODIC_FUNCTIONS = ['osc', 'phase', 'oscPulse', 'oscStep']

/**
 * Extract period from periodic functions in DSL AST.
 *
 * Searches the AST for known periodic functions (osc, phase, oscPulse, oscStep)
 * and returns the period value from the second argument.
 *
 * @param ast - The AST node to analyze
 * @returns The period in milliseconds, or undefined if no periodic function found
 *
 * @example
 * const ast = parse('range(osc(t, 2000), 0, 100)')
 * extractPeriod(ast) // → 2000
 *
 * @example
 * const ast = parse('add(phase(t, 3000), noise(t))')
 * extractPeriod(ast) // → 3000
 */
export function extractPeriod(ast: AstNode): number | undefined {
  if (ast.type === 'call') {
    // Check if this is a periodic function
    if (PERIODIC_FUNCTIONS.includes(ast.name)) {
      const periodArg = ast.args[1]
      if (periodArg?.type === 'number') {
        return periodArg.value
      }
    }

    // Recursively search in arguments
    for (const arg of ast.args) {
      const period = extractPeriod(arg)
      if (period !== undefined) {
        return period
      }
    }
  }

  return undefined
}

/**
 * Extract all periods from periodic functions in DSL AST.
 *
 * Unlike extractPeriod, this returns all periods found in the expression.
 * Useful for expressions with multiple periodic components.
 *
 * @param ast - The AST node to analyze
 * @returns Array of periods in milliseconds (may be empty)
 *
 * @example
 * const ast = parse('add(osc(t, 2000), osc(t, 500))')
 * extractAllPeriods(ast) // → [2000, 500]
 */
export function extractAllPeriods(ast: AstNode): number[] {
  const periods: number[] = []

  function traverse(node: AstNode): void {
    if (node.type === 'call') {
      // Check if this is a periodic function
      if (PERIODIC_FUNCTIONS.includes(node.name)) {
        const periodArg = node.args[1]
        if (periodArg?.type === 'number') {
          periods.push(periodArg.value)
        }
      }

      // Continue traversing arguments
      for (const arg of node.args) {
        traverse(arg)
      }
    }
  }

  traverse(ast)
  return periods
}
