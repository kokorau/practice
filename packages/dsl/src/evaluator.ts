/**
 * Evaluator for DSL AST
 */

import type { AstNode } from './ast'
import { parse } from './parser'

export type Context = Record<string, number>
export type BuiltinFunction = (args: number[]) => number

const CONSTANTS: Record<string, number> = {
  PI: Math.PI,
  E: Math.E,
}

const BUILTIN_FUNCTIONS: Record<string, BuiltinFunction> = {
  // Arithmetic
  add: (args) => {
    assertArity('add', args, 2)
    return args[0]! + args[1]!
  },
  sub: (args) => {
    assertArity('sub', args, 2)
    return args[0]! - args[1]!
  },
  mul: (args) => {
    assertArity('mul', args, 2)
    return args[0]! * args[1]!
  },
  div: (args) => {
    assertArity('div', args, 2)
    return args[0]! / args[1]!
  },
  neg: (args) => {
    assertArity('neg', args, 1)
    return -args[0]!
  },
  mod: (args) => {
    assertArity('mod', args, 2)
    return args[0]! % args[1]!
  },

  // Power and logarithm
  pow: (args) => {
    assertArity('pow', args, 2)
    return Math.pow(args[0]!, args[1]!)
  },
  sqrt: (args) => {
    assertArity('sqrt', args, 1)
    return Math.sqrt(args[0]!)
  },
  log: (args) => {
    assertArity('log', args, 1)
    return Math.log(args[0]!)
  },
  log10: (args) => {
    assertArity('log10', args, 1)
    return Math.log10(args[0]!)
  },
  log2: (args) => {
    assertArity('log2', args, 1)
    return Math.log2(args[0]!)
  },
  exp: (args) => {
    assertArity('exp', args, 1)
    return Math.exp(args[0]!)
  },

  // Trigonometric
  sin: (args) => {
    assertArity('sin', args, 1)
    return Math.sin(args[0]!)
  },
  cos: (args) => {
    assertArity('cos', args, 1)
    return Math.cos(args[0]!)
  },
  tan: (args) => {
    assertArity('tan', args, 1)
    return Math.tan(args[0]!)
  },
  asin: (args) => {
    assertArity('asin', args, 1)
    return Math.asin(args[0]!)
  },
  acos: (args) => {
    assertArity('acos', args, 1)
    return Math.acos(args[0]!)
  },
  atan: (args) => {
    assertArity('atan', args, 1)
    return Math.atan(args[0]!)
  },
  atan2: (args) => {
    assertArity('atan2', args, 2)
    return Math.atan2(args[0]!, args[1]!)
  },

  // Range and clamp
  range: (args) => {
    assertArity('range', args, 3)
    const t = args[0]!
    const min = args[1]!
    const max = args[2]!
    return min + (max - min) * t
  },
  clamp: (args) => {
    assertArity('clamp', args, 3)
    const value = args[0]!
    const min = args[1]!
    const max = args[2]!
    return Math.max(min, Math.min(max, value))
  },

  // Utility
  min: (args) => {
    assertArity('min', args, 2)
    return Math.min(args[0]!, args[1]!)
  },
  max: (args) => {
    assertArity('max', args, 2)
    return Math.max(args[0]!, args[1]!)
  },
  abs: (args) => {
    assertArity('abs', args, 1)
    return Math.abs(args[0]!)
  },
  floor: (args) => {
    assertArity('floor', args, 1)
    return Math.floor(args[0]!)
  },
  ceil: (args) => {
    assertArity('ceil', args, 1)
    return Math.ceil(args[0]!)
  },
  round: (args) => {
    assertArity('round', args, 1)
    return Math.round(args[0]!)
  },
  sign: (args) => {
    assertArity('sign', args, 1)
    return Math.sign(args[0]!)
  },
  lerp: (args) => {
    assertArity('lerp', args, 3)
    const a = args[0]!
    const b = args[1]!
    const t = args[2]!
    return a + (b - a) * t
  },

  // Smooth step (Hermite interpolation)
  smoothstep: (args) => {
    assertArity('smoothstep', args, 3)
    const edge0 = args[0]!
    const edge1 = args[1]!
    const x = args[2]!
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  },

  // Noise functions
  noise: (args) => {
    assertArityRange('noise', args, 1, 2)
    const x = args[0]!
    const seed = args[1] ?? 0
    // Simple deterministic noise using sine combinations (same as timeline)
    const input = x + seed
    const n1 = Math.sin(input * 1.0) * 0.5
    const n2 = Math.sin(input * 2.3 + 1.3) * 0.25
    const n3 = Math.sin(input * 4.1 + 2.7) * 0.125
    const sum = n1 + n2 + n3 // Range: [-0.875, 0.875]
    return (sum + 0.875) / 1.75
  },
  fract: (args) => {
    assertArity('fract', args, 1)
    const x = args[0]!
    return x - Math.floor(x)
  },
  step: (args) => {
    assertArity('step', args, 2)
    const edge = args[0]!
    const x = args[1]!
    return x < edge ? 0 : 1
  },

  // Wave functions
  saw: (args) => {
    assertArity('saw', args, 1)
    const t = args[0]!
    const frac = t - Math.floor(t)
    return frac < 0 ? frac + 1 : frac
  },
  pulse: (args) => {
    assertArity('pulse', args, 2)
    const t = args[0]!
    const duty = args[1]!
    const frac = t - Math.floor(t)
    const phase = frac < 0 ? frac + 1 : frac
    return phase < duty ? 1 : 0
  },
  tri: (args) => {
    assertArity('tri', args, 1)
    const t = args[0]!
    let frac = t - Math.floor(t)
    if (frac < 0) frac += 1
    return frac < 0.5 ? frac * 2 : 2 - frac * 2
  },

  // Periodic wave functions (with period and offset)
  phase: (args) => {
    assertArityRange('phase', args, 2, 3)
    const t = args[0]!
    const period = args[1]!
    const offset = args[2] ?? 0
    if (period === 0) return 0
    const p = ((t + offset) % period) / period
    return p < 0 ? p + 1 : p
  },
  osc: (args) => {
    assertArityRange('osc', args, 2, 3)
    const t = args[0]!
    const period = args[1]!
    const offset = args[2] ?? 0
    if (period === 0) return 0.5
    let p = ((t + offset) % period) / period
    if (p < 0) p += 1
    return (Math.sin(p * Math.PI * 2) + 1) / 2
  },
  oscPulse: (args) => {
    assertArityRange('oscPulse', args, 3, 4)
    const t = args[0]!
    const period = args[1]!
    // 3 args: oscPulse(t, period, duty)
    // 4 args: oscPulse(t, period, offset, duty)
    const offset = args.length === 4 ? args[2]! : 0
    const duty = args.length === 4 ? args[3]! : args[2]!
    if (period === 0) return 0
    let p = ((t + offset) % period) / period
    if (p < 0) p += 1
    return p < duty ? 1 : 0
  },
  oscStep: (args) => {
    assertArityRange('oscStep', args, 3, 4)
    const t = args[0]!
    const period = args[1]!
    // 3 args: oscStep(t, period, steps)
    // 4 args: oscStep(t, period, offset, steps)
    const offset = args.length === 4 ? args[2]! : 0
    const steps = args.length === 4 ? args[3]! : args[2]!
    if (period === 0) return 0
    let p = ((t + offset) % period) / period
    if (p < 0) p += 1
    const n = Math.max(1, steps)
    return Math.floor(p * n) / (n - 1 || 1)
  },
}

function assertArity(name: string, args: number[], expected: number): void {
  if (args.length !== expected) {
    throw new Error(`Function '${name}' expects ${expected} arguments, got ${args.length}`)
  }
}

function assertArityRange(name: string, args: number[], min: number, max: number): void {
  if (args.length < min || args.length > max) {
    throw new Error(`Function '${name}' expects ${min}-${max} arguments, got ${args.length}`)
  }
}

export class Evaluator {
  private context: Context
  private customFunctions: Record<string, BuiltinFunction>

  constructor(context: Context, customFunctions: Record<string, BuiltinFunction> = {}) {
    this.context = context
    this.customFunctions = customFunctions
  }

  evaluate(node: AstNode): number {
    switch (node.type) {
      case 'number':
        return node.value

      case 'identifier':
        // Check constants first
        if (node.name in CONSTANTS) {
          return CONSTANTS[node.name]!
        }
        // Then check context
        if (!(node.name in this.context)) {
          throw new Error(`Unknown identifier '${node.name}'`)
        }
        return this.context[node.name]!

      case 'call': {
        const fn = this.customFunctions[node.name] ?? BUILTIN_FUNCTIONS[node.name]
        if (!fn) {
          throw new Error(`Unknown function '${node.name}'`)
        }
        const args = node.args.map((arg) => this.evaluate(arg))
        return fn(args)
      }

      case 'reference': {
        // Build the context key
        const key = node.namespace ? `${node.namespace}:${node.path}` : node.path
        if (!(key in this.context)) {
          throw new Error(`Unknown reference '@${key}'`)
        }
        return this.context[key]!
      }

      case 'binary': {
        const left = this.evaluate(node.left)
        const right = this.evaluate(node.right)
        switch (node.operator) {
          case '+':
            return left + right
          case '-':
            return left - right
          case '*':
            return left * right
          case '/':
            return left / right
          case '%':
            return left % right
          case '**':
            return Math.pow(left, right)
        }
      }

      case 'unary': {
        const operand = this.evaluate(node.operand)
        switch (node.operator) {
          case '-':
            return -operand
        }
      }
    }
  }
}

export function evaluate(
  input: string | AstNode,
  context: Context,
  customFunctions?: Record<string, BuiltinFunction>
): number {
  const ast = typeof input === 'string' ? parse(input) : input
  return new Evaluator(context, customFunctions).evaluate(ast)
}
