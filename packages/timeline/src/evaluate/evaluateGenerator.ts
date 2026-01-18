import type { Generator } from '../Generator'
import type { Ms } from '../Unit'

/**
 * Evaluate generator value at given time
 * Returns value in range [0, 1]
 */
export function evaluateGenerator(generator: Generator, time: Ms): number {
  const { type, period, offset } = generator

  if (period === 0) {
    return 0
  }

  // Apply offset and normalize to phase [0, 1)
  const phase = ((time + offset) % period) / period
  // Handle negative modulo
  const normalizedPhase = phase < 0 ? phase + 1 : phase

  switch (type) {
    case 'Sin':
      return evaluateSin(normalizedPhase)
    case 'Saw':
      return evaluateSaw(normalizedPhase)
    case 'Pulse':
      return evaluatePulse(normalizedPhase, generator.params)
    case 'Step':
      return evaluateStep(normalizedPhase, generator.params)
    case 'Perlin':
      return evaluatePerlin(time, generator.params)
    default:
      return 0
  }
}

/**
 * Sine wave: smooth oscillation between 0 and 1
 */
function evaluateSin(phase: number): number {
  return (Math.sin(phase * Math.PI * 2) + 1) / 2
}

/**
 * Sawtooth wave: linear ramp from 0 to 1
 */
function evaluateSaw(phase: number): number {
  return phase
}

/**
 * Pulse wave: square wave with configurable duty cycle
 */
function evaluatePulse(phase: number, params: Record<string, unknown>): number {
  const duty = typeof params.duty === 'number' ? params.duty : 0.5
  return phase < duty ? 1 : 0
}

/**
 * Step wave: quantized steps
 */
function evaluateStep(phase: number, params: Record<string, unknown>): number {
  const steps = typeof params.steps === 'number' ? Math.max(1, params.steps) : 4
  return Math.floor(phase * steps) / (steps - 1 || 1)
}

/**
 * Perlin-like noise (simplified pseudo-random)
 * Note: This is a simplified implementation, not true Perlin noise
 */
function evaluatePerlin(time: Ms, params: Record<string, unknown>): number {
  const seed = typeof params.seed === 'number' ? params.seed : 0
  const scale = typeof params.scale === 'number' ? params.scale : 0.001

  // Simple noise function using sine
  const x = time * scale + seed
  const n1 = Math.sin(x * 1.0) * 0.5
  const n2 = Math.sin(x * 2.3 + 1.3) * 0.25
  const n3 = Math.sin(x * 4.1 + 2.7) * 0.125

  // Sum and normalize to [0, 1]
  const sum = n1 + n2 + n3 // Range: [-0.875, 0.875]
  return (sum + 0.875) / 1.75
}
