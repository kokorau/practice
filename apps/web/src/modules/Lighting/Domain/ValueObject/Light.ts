import type { Point } from './Point'

/**
 * 光源を表す値オブジェクト
 */
export type Light = {
  readonly id: string
  readonly position: Point
  readonly intensity: number // 0-1
  readonly color: string // CSS color
}

export const Light = {
  create(
    id: string,
    position: Point,
    options?: { intensity?: number; color?: string }
  ): Light {
    return {
      id,
      position,
      intensity: options?.intensity ?? 1,
      color: options?.color ?? '#fde047', // yellow-300
    }
  },

  moveTo(light: Light, position: Point): Light {
    return { ...light, position }
  },

  setIntensity(light: Light, intensity: number): Light {
    return { ...light, intensity: Math.max(0, Math.min(1, intensity)) }
  },

  setColor(light: Light, color: string): Light {
    return { ...light, color }
  },
}
