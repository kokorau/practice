import type { Lut } from '../../../Filter/Domain/ValueObject/Lut'

/**
 * Filter preset ID for identifying built-in presets.
 */
export type FilterPresetId = 'none' | 'warm' | 'cool' | 'vintage' | 'cinematic'

/**
 * FilterPreset wraps a LUT with metadata for the site simulator.
 */
export type FilterPreset = {
  readonly id: FilterPresetId
  readonly name: string
  /** The LUT to apply (1D or 3D) */
  readonly lut: Lut
}

export const $FilterPreset = {
  /**
   * Create a filter preset
   */
  create: (id: FilterPresetId, name: string, lut: Lut): FilterPreset => ({
    id,
    name,
    lut,
  }),
}
