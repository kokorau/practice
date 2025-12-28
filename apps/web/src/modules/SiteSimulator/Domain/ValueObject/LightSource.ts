/**
 * LightSource represents an illuminant that affects how albedos are rendered.
 *
 * v0: Simple color temperature shift model.
 * Future: Could be extended to spectral power distribution (SPD) based lighting.
 */
export type LightSource = {
  readonly id: string
  readonly name: string
  /** Color temperature in Kelvin (e.g., 6500 for D65, 2700 for warm bulb) */
  readonly temperature: number
  /** Tint shift (-1 to 1, negative = green, positive = magenta) */
  readonly tint: number
  /** Intensity multiplier (1.0 = neutral) */
  readonly intensity: number
}

export const $LightSource = {
  /**
   * Create a light source
   */
  create: (
    id: string,
    name: string,
    temperature: number,
    tint = 0,
    intensity = 1
  ): LightSource => ({
    id,
    name,
    temperature,
    tint,
    intensity,
  }),

  /**
   * Default daylight (D65)
   */
  daylight: (): LightSource => ({
    id: 'daylight',
    name: 'Daylight (D65)',
    temperature: 6500,
    tint: 0,
    intensity: 1,
  }),
}
