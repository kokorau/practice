import type { TexturePattern } from '../Domain'
import type { GetDefaultTexturePatterns } from '../Application'
import { createTexturePatternsFromPresets } from '../Application'
import { getSurfacePresets } from './defaultSurfacePresets'

/**
 * Default texture patterns for background layer
 * Generated from shared surface presets
 */
const defaultTexturePatterns: TexturePattern[] = createTexturePatternsFromPresets(getSurfacePresets())

/**
 * Get default texture patterns for background layer
 */
export const getDefaultTexturePatterns: GetDefaultTexturePatterns = () => defaultTexturePatterns
