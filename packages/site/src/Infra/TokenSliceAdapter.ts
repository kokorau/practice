/**
 * TokenSliceAdapter - SiteRepositoryからTokenへのスライスビュー
 *
 * SiteRepositoryのtokenフィールドに対するTokenRepository互換のアダプター
 */

import type {
  TokenRepository,
  TokenSubscriber,
  TokenUnsubscribe,
} from '@practice/design-tokens/Application'
import type { DesignTokens } from '@practice/design-tokens/Domain'
import type { Typography } from '@practice/design-tokens/Domain'
import type { Radius } from '@practice/design-tokens/Domain'
import type { Spacing } from '@practice/design-tokens/Domain'
import type { SiteRepository } from '../Application/ports/SiteRepository'

export const createTokenSlice = (siteRepository: SiteRepository): TokenRepository => {
  return {
    get: (): DesignTokens => {
      return siteRepository.get().token
    },

    set: (tokens: DesignTokens): void => {
      const site = siteRepository.get()
      siteRepository.set({
        ...site,
        token: tokens,
      })
    },

    subscribe: (subscriber: TokenSubscriber): TokenUnsubscribe => {
      let lastToken = siteRepository.get().token

      return siteRepository.subscribe((site) => {
        // Only notify if token actually changed
        if (site.token !== lastToken) {
          lastToken = site.token
          subscriber(site.token)
        }
      })
    },

    updateTypography: (typography: Partial<Typography>): void => {
      const site = siteRepository.get()
      siteRepository.set({
        ...site,
        token: {
          ...site.token,
          typography: {
            ...site.token.typography,
            ...typography,
          },
        },
      })
    },

    updateRadius: (radius: Partial<Radius>): void => {
      const site = siteRepository.get()
      siteRepository.set({
        ...site,
        token: {
          ...site.token,
          radius: {
            ...site.token.radius,
            ...radius,
          },
        },
      })
    },

    updateSpacing: (spacing: Partial<Spacing>): void => {
      const site = siteRepository.get()
      siteRepository.set({
        ...site,
        token: {
          ...site.token,
          spacing: {
            ...site.token.spacing,
            ...spacing,
          },
        },
      })
    },
  }
}
