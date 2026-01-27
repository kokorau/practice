import type { TexturePattern, MaskPattern } from '../Domain'

/**
 * Port interface for retrieving default texture patterns
 *
 * @deprecated Use TexturePatternRepository.getAll() instead
 */
export interface GetDefaultTexturePatterns {
  (): Promise<TexturePattern[]>
}

/**
 * Port interface for retrieving default mask patterns
 *
 * @deprecated Use MaskPatternRepository.getAll() instead
 */
export interface GetDefaultMaskPatterns {
  (): Promise<MaskPattern[]>
}
