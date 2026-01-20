/**
 * GetTokensUseCase - デザイントークン取得ユースケース
 */

import type { TokenRepository, TokenSubscriber, TokenUnsubscribe } from './ports/TokenRepository'
import type { DesignTokens } from '../Domain/ValueObject/DesignTokens'

export interface GetTokensUseCaseDeps {
  tokenRepository: TokenRepository
}

export interface GetTokensUseCase {
  /** 現在のトークンを取得 */
  execute(): DesignTokens
  /** トークン変更を購読 */
  subscribe(subscriber: TokenSubscriber): TokenUnsubscribe
}

export const createGetTokensUseCase = (
  deps: GetTokensUseCaseDeps
): GetTokensUseCase => ({
  execute: () => deps.tokenRepository.get(),
  subscribe: (subscriber: TokenSubscriber) => deps.tokenRepository.subscribe(subscriber),
})
