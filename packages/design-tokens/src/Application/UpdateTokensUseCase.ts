/**
 * UpdateTokensUseCase - デザイントークン更新ユースケース
 */

import type { TokenRepository } from './ports/TokenRepository'
import type { Typography } from '../Domain/ValueObject/Typography'
import type { Radius } from '../Domain/ValueObject/Radius'
import type { Spacing } from '../Domain/ValueObject/Spacing'

export interface UpdateTokensUseCaseDeps {
  tokenRepository: TokenRepository
}

export interface UpdateTokensUseCase {
  /** Typography を更新 */
  updateTypography(typography: Partial<Typography>): void
  /** Radius を更新 */
  updateRadius(radius: Partial<Radius>): void
  /** Spacing を更新 */
  updateSpacing(spacing: Partial<Spacing>): void
}

export const createUpdateTokensUseCase = (
  deps: UpdateTokensUseCaseDeps
): UpdateTokensUseCase => ({
  updateTypography: (typography: Partial<Typography>) => {
    deps.tokenRepository.updateTypography(typography)
  },
  updateRadius: (radius: Partial<Radius>) => {
    deps.tokenRepository.updateRadius(radius)
  },
  updateSpacing: (spacing: Partial<Spacing>) => {
    deps.tokenRepository.updateSpacing(spacing)
  },
})
