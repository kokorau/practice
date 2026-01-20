/**
 * TokenRepository - デザイントークンへのアクセスを抽象化
 *
 * Observer pattern によるリアクティブな状態管理をサポート
 */

import type { DesignTokens } from '../../Domain/ValueObject/DesignTokens'
import type { Typography } from '../../Domain/ValueObject/Typography'
import type { Radius } from '../../Domain/ValueObject/Radius'
import type { Spacing } from '../../Domain/ValueObject/Spacing'

export type TokenSubscriber = (tokens: DesignTokens) => void
export type TokenUnsubscribe = () => void

export interface TokenRepository {
  /** 現在のDesignTokensを取得 */
  get(): DesignTokens

  /** DesignTokensを設定 */
  set(tokens: DesignTokens): void

  /** DesignTokens変更を購読 */
  subscribe(subscriber: TokenSubscriber): TokenUnsubscribe

  // ============================================================================
  // Partial Updates
  // ============================================================================

  /** Typographyを部分更新 */
  updateTypography(typography: Partial<Typography>): void

  /** Radiusを部分更新 */
  updateRadius(radius: Partial<Radius>): void

  /** Spacingを部分更新 */
  updateSpacing(spacing: Partial<Spacing>): void
}
