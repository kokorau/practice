import type { SurfacePreset } from '../Domain'

/**
 * Get default surface presets
 * Returns a list of reusable surface pattern definitions
 */
export type GetSurfacePresets = () => SurfacePreset[]
