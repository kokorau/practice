/**
 * UpdateTextLayerPosition UseCase
 *
 * テキストレイヤーの位置を更新する（既存値とマージ）
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type { TextLayerNodeConfig } from '../../Domain/HeroViewConfig'

/**
 * テキストアンカー位置の型
 */
export type TextAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

/**
 * 位置更新パラメータ
 */
export interface UpdateTextLayerPositionParams {
  x?: number
  y?: number
  anchor?: TextAnchor
}

/**
 * テキストレイヤーの位置を更新する
 * 既存のposition値とマージして更新する
 *
 * @param layerId - 対象レイヤーのID
 * @param params - 位置パラメータ（部分更新可能）
 * @param repository - HeroViewRepository
 * @returns 更新が成功した場合はtrue、レイヤーが見つからないか型が不一致の場合はfalse
 */
export function updateTextLayerPosition(
  layerId: string,
  params: UpdateTextLayerPositionParams,
  repository: HeroViewRepository
): boolean {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)

  if (!layer || layer.type !== 'text') {
    return false
  }

  const textLayer = layer as TextLayerNodeConfig
  const currentPosition = textLayer.position

  // Merge with existing position values
  const newPosition = {
    x: params.x ?? currentPosition.x,
    y: params.y ?? currentPosition.y,
    anchor: params.anchor ?? currentPosition.anchor,
  }

  repository.updateLayer(layerId, { position: newPosition })
  return true
}
