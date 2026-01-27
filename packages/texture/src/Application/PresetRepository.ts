/**
 * Preset Repository Interfaces
 *
 * Repository pattern for preset retrieval with async API.
 * Designed for future DB/API migration while currently using in-memory data.
 */

import type { SurfacePreset, Preset } from '../Domain'
import type { TexturePattern, MaskPattern } from '../Domain'

/**
 * Generic preset repository interface
 */
export interface PresetRepository<T extends Preset = Preset> {
  getAll(): Promise<T[]>
  getById(id: string): Promise<T | undefined>
}

/**
 * Surface preset repository interface
 */
export interface SurfacePresetRepository extends PresetRepository<SurfacePreset> {
  getAll(): Promise<SurfacePreset[]>
  getById(id: string): Promise<SurfacePreset | undefined>
}

/**
 * Texture pattern repository interface
 */
export interface TexturePatternRepository {
  getAll(): Promise<TexturePattern[]>
}

/**
 * Mask pattern repository interface
 */
export interface MaskPatternRepository {
  getAll(): Promise<MaskPattern[]>
}

/**
 * Create an in-memory surface preset repository
 */
export function createInMemorySurfacePresetRepository(
  presets: SurfacePreset[]
): SurfacePresetRepository {
  return {
    async getAll() {
      return presets
    },
    async getById(id: string) {
      return presets.find((p) => p.params.id === id)
    },
  }
}

/**
 * Create an in-memory texture pattern repository
 */
export function createInMemoryTexturePatternRepository(
  patterns: TexturePattern[]
): TexturePatternRepository {
  return {
    async getAll() {
      return patterns
    },
  }
}

/**
 * Create an in-memory mask pattern repository
 */
export function createInMemoryMaskPatternRepository(
  patterns: MaskPattern[]
): MaskPatternRepository {
  return {
    async getAll() {
      return patterns
    },
  }
}
