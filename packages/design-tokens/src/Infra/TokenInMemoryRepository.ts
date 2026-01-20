/**
 * TokenInMemoryRepository - デザイントークンのインメモリ実装
 */

import type {
  TokenRepository,
  TokenSubscriber,
  TokenUnsubscribe,
} from '../Application/ports/TokenRepository'
import type { DesignTokens } from '../Domain/ValueObject/DesignTokens'
import type { Typography } from '../Domain/ValueObject/Typography'
import type { Radius } from '../Domain/ValueObject/Radius'
import type { Spacing } from '../Domain/ValueObject/Spacing'

export interface CreateTokenInMemoryRepositoryOptions {
  initialTokens: DesignTokens
}

export const createTokenInMemoryRepository = (
  options: CreateTokenInMemoryRepositoryOptions
): TokenRepository => {
  let tokens = options.initialTokens
  const subscribers = new Set<TokenSubscriber>()

  const notifySubscribers = () => {
    for (const callback of subscribers) {
      callback(tokens)
    }
  }

  return {
    get: () => tokens,

    set: (newTokens: DesignTokens) => {
      tokens = newTokens
      notifySubscribers()
    },

    subscribe: (subscriber: TokenSubscriber): TokenUnsubscribe => {
      subscribers.add(subscriber)
      return () => {
        subscribers.delete(subscriber)
      }
    },

    updateTypography: (typography: Partial<Typography>) => {
      tokens = {
        ...tokens,
        typography: {
          ...tokens.typography,
          ...typography,
        },
      }
      notifySubscribers()
    },

    updateRadius: (radius: Partial<Radius>) => {
      tokens = {
        ...tokens,
        radius: {
          ...tokens.radius,
          ...radius,
        },
      }
      notifySubscribers()
    },

    updateSpacing: (spacing: Partial<Spacing>) => {
      tokens = {
        ...tokens,
        spacing: {
          ...tokens.spacing,
          ...spacing,
        },
      }
      notifySubscribers()
    },
  }
}
