import type { ProfiledPalette } from '../Domain'
import type { Photo } from '../../Photo/Domain'
import { extractProfiledPalette } from '../Infra/Service/profiledPaletteExtractionService'

/**
 * 画像からProfiledPaletteを抽出するユースケース
 */
export const extractProfiledPaletteUseCase = async (photo: Photo): Promise<ProfiledPalette> => {
  return extractProfiledPalette(photo.imageData)
}
