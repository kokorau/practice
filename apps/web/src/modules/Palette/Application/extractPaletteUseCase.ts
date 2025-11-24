import type { Palette } from '../Domain'
import type { Photo } from '../../Photo/Domain'
import { extractPalette } from '../Infra/Service/paletteExtractionService'

/**
 * 画像からパレットを抽出するユースケース
 */
export const extractPaletteUseCase = async (photo: Photo): Promise<Palette> => {
  return extractPalette(photo.imageData)
}
