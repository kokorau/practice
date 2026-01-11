/**
 * UpdateAccentColor UseCase
 *
 * アクセントカラーを部分更新する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'

export interface UpdateAccentColorParams {
  hue?: number
  saturation?: number
  value?: number
}

/**
 * アクセントカラーを更新する
 *
 * @param params - 更新するカラーパラメータ（部分更新可能）
 * @param repository - HeroViewRepository
 */
export function updateAccentColor(
  params: UpdateAccentColorParams,
  repository: HeroViewRepository
): void {
  const currentColors = repository.get().colors
  repository.updateColors({
    accent: { ...currentColors.accent, ...params },
  })
}
