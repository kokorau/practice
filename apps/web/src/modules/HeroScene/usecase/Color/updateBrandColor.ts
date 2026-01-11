/**
 * UpdateBrandColor UseCase
 *
 * ブランドカラーを部分更新する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'

export interface UpdateBrandColorParams {
  hue?: number
  saturation?: number
  value?: number
}

/**
 * ブランドカラーを更新する
 *
 * @param params - 更新するカラーパラメータ（部分更新可能）
 * @param repository - HeroViewRepository
 */
export function updateBrandColor(
  params: UpdateBrandColorParams,
  repository: HeroViewRepository
): void {
  const currentColors = repository.get().colors
  repository.updateColors({
    brand: { ...currentColors.brand, ...params },
  })
}
