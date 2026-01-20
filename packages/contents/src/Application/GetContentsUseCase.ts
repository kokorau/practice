/**
 * GetContentsUseCase - コンテンツ取得ユースケース
 */

import type { ContentsRepository, ContentsSubscriber, ContentsUnsubscribe } from './ports/ContentsRepository'
import type { Contents, ContentValue } from '../Domain/ValueObject/Contents'

export interface GetContentsUseCaseDeps {
  contentsRepository: ContentsRepository
}

export interface GetContentsUseCase {
  /** 全コンテンツを取得 */
  getAll(): Contents
  /** パスでコンテンツを取得 */
  getByPath(path: string): ContentValue | undefined
  /** コンテンツ変更を購読 */
  subscribe(subscriber: ContentsSubscriber): ContentsUnsubscribe
}

export const createGetContentsUseCase = (
  deps: GetContentsUseCaseDeps
): GetContentsUseCase => ({
  getAll: () => deps.contentsRepository.get(),
  getByPath: (path: string) => deps.contentsRepository.getByPath(path),
  subscribe: (subscriber: ContentsSubscriber) => deps.contentsRepository.subscribe(subscriber),
})
