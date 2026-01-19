/**
 * UpdateTextLayerFont UseCase
 *
 * テキストレイヤーのフォント設定を更新する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'

/**
 * フォント設定の更新パラメータ
 */
export interface UpdateTextLayerFontParams {
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  lineHeight?: number
}

/**
 * テキストレイヤーのフォント設定を更新する
 *
 * @param layerId - 対象レイヤーのID
 * @param params - フォント設定のパラメータ（部分更新可能）
 * @param repository - HeroViewRepository
 * @returns 更新が成功した場合はtrue、レイヤーが見つからないか型が不一致の場合はfalse
 */
export function updateTextLayerFont(
  layerId: string,
  params: UpdateTextLayerFontParams,
  repository: HeroViewRepository
): boolean {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)

  if (!layer || layer.type !== 'text') {
    return false
  }

  const updates: Record<string, unknown> = {}

  if (params.fontFamily !== undefined) {
    updates.fontFamily = params.fontFamily
  }
  if (params.fontSize !== undefined) {
    updates.fontSize = params.fontSize
  }
  if (params.fontWeight !== undefined) {
    updates.fontWeight = params.fontWeight
  }
  if (params.letterSpacing !== undefined) {
    updates.letterSpacing = params.letterSpacing
  }
  if (params.lineHeight !== undefined) {
    updates.lineHeight = params.lineHeight
  }

  if (Object.keys(updates).length === 0) {
    return true // No updates, but not an error
  }

  repository.updateLayer(layerId, updates)
  return true
}
