/**
 * UpdateContentUseCase - コンテンツ更新ユースケース
 */

import type { ContentsRepository } from '@practice/contents/Application'
import type { ContentValue } from '@practice/contents'

export interface UpdateContentUseCaseDeps {
  contentsRepository: ContentsRepository
}

export interface UpdateContentUseCase {
  /** パスでコンテンツを更新 */
  execute(path: string, value: ContentValue): void
}

export const createUpdateContentUseCase = (
  deps: UpdateContentUseCaseDeps
): UpdateContentUseCase => ({
  execute: (path: string, value: ContentValue) => {
    deps.contentsRepository.setByPath(path, value)
  },
})
