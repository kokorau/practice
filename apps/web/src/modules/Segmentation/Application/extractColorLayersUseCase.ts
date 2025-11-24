import type { Photo } from '../../Photo/Domain'
import type { ColorBasedLayerMap } from '../Domain'
import { extractColorLayers } from '../Infra/Service/colorLayerService'

/**
 * 画像を色ベースでレイヤー化するユースケース
 */
export const extractColorLayersUseCase = (
  photo: Photo,
  numLayers: number = 6
): ColorBasedLayerMap => {
  const result = extractColorLayers(photo.imageData, numLayers)

  return {
    labels: result.labels,
    layers: result.layers,
    width: result.width,
    height: result.height,
  }
}
