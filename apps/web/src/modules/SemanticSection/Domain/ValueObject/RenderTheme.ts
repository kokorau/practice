/**
 * RenderTheme - Theme context for rendering sections
 *
 * Contains all styling information needed to render sections.
 */

import type { SemanticColorPalette } from '../../../SemanticColorPalette/Domain'

// ============================================================================
// StylePack (simplified for now)
// ============================================================================

export type RoundedSize = 'none' | 'sm' | 'md' | 'lg' | 'full'
export type SpacingSize = 'tight' | 'normal' | 'relaxed'

export interface StylePack {
  readonly rounded: RoundedSize
  readonly gap: SpacingSize
  readonly padding: SpacingSize
}

export const DEFAULT_STYLE_PACK: StylePack = {
  rounded: 'md',
  gap: 'normal',
  padding: 'normal',
} as const

// ============================================================================
// RenderTheme
// ============================================================================

export interface RenderTheme {
  readonly palette: SemanticColorPalette
  readonly style: StylePack
}

// ============================================================================
// Style Helpers
// ============================================================================

export const $StylePack = {
  /** Convert rounded size to CSS border-radius */
  rounded: (size: RoundedSize): string => {
    switch (size) {
      case 'none': return '0'
      case 'sm': return '4px'
      case 'md': return '8px'
      case 'lg': return '16px'
      case 'full': return '9999px'
    }
  },

  /** Section padding */
  sectionPadding: (size: SpacingSize): string => {
    switch (size) {
      case 'tight': return '3rem 1.5rem'
      case 'normal': return '5rem 2rem'
      case 'relaxed': return '7rem 3rem'
    }
  },

  /** Grid gap */
  gridGap: (size: SpacingSize): string => {
    switch (size) {
      case 'tight': return '1.5rem'
      case 'normal': return '2rem'
      case 'relaxed': return '3rem'
    }
  },

  /** Card gap */
  cardGap: (size: SpacingSize): string => {
    switch (size) {
      case 'tight': return '1rem'
      case 'normal': return '1.5rem'
      case 'relaxed': return '2rem'
    }
  },

  /** Card padding */
  cardPadding: (size: SpacingSize): string => {
    switch (size) {
      case 'tight': return '1.5rem'
      case 'normal': return '2rem'
      case 'relaxed': return '2.5rem'
    }
  },

  /** Button padding */
  buttonPadding: (size: SpacingSize): string => {
    switch (size) {
      case 'tight': return '0.75rem 1.5rem'
      case 'normal': return '1rem 2rem'
      case 'relaxed': return '1.25rem 2.5rem'
    }
  },
} as const
