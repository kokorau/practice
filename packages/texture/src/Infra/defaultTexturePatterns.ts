import type { TexturePattern } from '../Domain'
import type { GetDefaultTexturePatterns, TexturePatternRepository } from '../Application'
import { createTexturePatternsFromPresets } from '../Application'
import { surfacePresetRepository } from './defaultSurfacePresets'

// Cached texture patterns (lazy initialized)
let cachedTexturePatterns: TexturePattern[] | null = null

/**
 * Get default texture patterns for background layer (async)
 * Generated from shared surface presets
 */
export const getDefaultTexturePatterns: GetDefaultTexturePatterns = async () => {
  if (!cachedTexturePatterns) {
    const surfacePresets = await surfacePresetRepository.getAll()
    cachedTexturePatterns = createTexturePatternsFromPresets(surfacePresets)
  }
  return cachedTexturePatterns
}

/**
 * Default texture pattern repository
 */
export const texturePatternRepository: TexturePatternRepository = {
  async getAll() {
    return getDefaultTexturePatterns()
  },
}
