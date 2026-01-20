/**
 * UpdateContentUseCase - コンテンツ更新ユースケース
 */

import type { ContentsRepository } from './ports/ContentsRepository'
import type { ContentValue } from '../Domain/ValueObject/Contents'

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
