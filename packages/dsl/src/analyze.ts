/**
 * AST analysis utilities for DSL
 */

import type { AstNode } from './ast'
import { parse } from './parser'
import { evaluate } from './evaluator'

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
  switch (ast.type) {
    case 'call':
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
      return undefined

    case 'binary': {
      const leftPeriod = extractPeriod(ast.left)
      if (leftPeriod !== undefined) return leftPeriod
      return extractPeriod(ast.right)
    }

    case 'unary':
      return extractPeriod(ast.operand)

    case 'number':
    case 'identifier':
    case 'reference':
      return undefined
  }
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
    switch (node.type) {
      case 'call':
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
        break

      case 'binary':
        traverse(node.left)
        traverse(node.right)
        break

      case 'unary':
        traverse(node.operand)
        break

      case 'number':
      case 'identifier':
      case 'reference':
        // No periods in these nodes
        break
    }
  }

  traverse(ast)
  return periods
}

/**
 * Calculate the greatest common divisor (GCD) of two numbers.
 */
function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const temp = b
    b = a % b
    a = temp
  }
  return a
}

/**
 * Calculate the least common multiple (LCM) of two numbers.
 */
function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return Math.abs(a * b) / gcd(a, b)
}

/**
 * Calculate the least common multiple (LCM) of an array of numbers.
 */
function lcmArray(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return numbers.reduce((acc, num) => lcm(acc, num), numbers[0]!)
}

/**
 * Amplitude analysis result for a DSL expression.
 */
export interface AmplitudeInfo {
  /** Minimum value of the expression */
  min: number
  /** Maximum value of the expression */
  max: number
  /** Amplitude: (max - min) / 2 */
  amplitude: number
  /** Center value: (max + min) / 2 */
  center: number
  /** Period used for sampling (LCM of all periods, or default) */
  period: number
}

/**
 * Analyze the amplitude of a DSL expression by sampling.
 *
 * Uses period detection to optimize sampling range. For expressions with
 * periodic functions (osc, phase, oscPulse, oscStep), samples one full
 * period to determine min/max values.
 *
 * @param expression - DSL expression string or AST node
 * @param sampleCount - Number of samples to take (default: 100)
 * @returns AmplitudeInfo with min, max, amplitude, center, and period
 *
 * @example
 * analyzeAmplitude('osc(t, 2000)')
 * // → { min: 0, max: 1, amplitude: 0.5, center: 0.5, period: 2000 }
 *
 * @example
 * analyzeAmplitude('range(osc(t, 12000), 22, 30)')
 * // → { min: 22, max: 30, amplitude: 4, center: 26, period: 12000 }
 */
export function analyzeAmplitude(
  expression: string | AstNode,
  sampleCount = 100
): AmplitudeInfo {
  const ast = typeof expression === 'string' ? parse(expression) : expression

  // Extract all periods and compute LCM
  const periods = extractAllPeriods(ast)
  const period = periods.length > 0 ? lcmArray(periods) : 1000

  let min = Infinity
  let max = -Infinity

  for (let i = 0; i <= sampleCount; i++) {
    const t = (i / sampleCount) * period
    const value = evaluate(ast, { t })
    min = Math.min(min, value)
    max = Math.max(max, value)
  }

  return {
    min,
    max,
    amplitude: (max - min) / 2,
    center: (max + min) / 2,
    period,
  }
}
