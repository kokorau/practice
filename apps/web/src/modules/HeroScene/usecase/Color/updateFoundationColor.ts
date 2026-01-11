/**
 * UpdateFoundationColor UseCase
 *
 * ファウンデーションカラーを部分更新する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'

export interface UpdateFoundationColorParams {
  hue?: number
  saturation?: number
  value?: number
}

/**
 * ファウンデーションカラーを更新する
 *
 * @param params - 更新するカラーパラメータ（部分更新可能）
 * @param repository - HeroViewRepository
 */
export function updateFoundationColor(
  params: UpdateFoundationColorParams,
  repository: HeroViewRepository
): void {
  const currentColors = repository.get().colors
  repository.updateColors({
    foundation: { ...currentColors.foundation, ...params },
  })
}
