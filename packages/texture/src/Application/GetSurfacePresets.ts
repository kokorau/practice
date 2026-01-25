import type { SurfacePreset } from '../Domain'

/**
 * Get default surface presets
 * Returns a list of reusable surface pattern definitions
 *
 * @deprecated Use SurfacePresetRepository.getAll() instead
 */
export type GetSurfacePresets = () => Promise<SurfacePreset[]>
