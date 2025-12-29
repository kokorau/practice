import type { TexturePattern } from '../Domain'

/**
 * Port interface for retrieving default texture patterns
 */
export interface GetDefaultTexturePatterns {
  (): TexturePattern[]
}

/**
 * Port interface for retrieving default mask patterns
 */
export interface GetDefaultMaskPatterns {
  (): TexturePattern[]
}
