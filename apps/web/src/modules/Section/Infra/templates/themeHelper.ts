import type { RenderTheme } from '../../Domain/ValueObject/SectionTemplate'
import type { RoundedSize, SpacingSize } from '../../../StylePack/Domain'
import { generateColorCssVariables, cssVariablesToStyleString } from '../../Domain/ValueObject/ColorCssVariables'

/**
 * Generate CSS variables string from theme palette
 */
export const themeToCssVars = (theme: RenderTheme): string => {
  return cssVariablesToStyleString(generateColorCssVariables(theme.palette))
}

/**
 * Rounded size to CSS border-radius
 */
export const roundedToCss = (size: RoundedSize): string => {
  const map: Record<RoundedSize, string> = {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '16px',
    full: '9999px',
  }
  return map[size]
}

/**
 * Get section padding based on stylePack.padding
 */
export const sectionPadding = (size: SpacingSize): string => {
  const map: Record<SpacingSize, string> = {
    tight: '3rem 1.5rem',
    normal: '5rem 2rem',
    relaxed: '7rem 3rem',
  }
  return map[size]
}

/**
 * Get grid/flex gap based on stylePack.gap
 */
export const gridGap = (size: SpacingSize): string => {
  const map: Record<SpacingSize, string> = {
    tight: '1.5rem',
    normal: '2rem',
    relaxed: '3rem',
  }
  return map[size]
}

/**
 * Get card gap (smaller than grid gap)
 */
export const cardGap = (size: SpacingSize): string => {
  const map: Record<SpacingSize, string> = {
    tight: '1rem',
    normal: '1.5rem',
    relaxed: '2rem',
  }
  return map[size]
}

/**
 * Get line-height based on stylePack.leading
 */
export const lineHeight = (size: SpacingSize): string => {
  const map: Record<SpacingSize, string> = {
    tight: '1.3',
    normal: '1.5',
    relaxed: '1.7',
  }
  return map[size]
}

/**
 * Get button padding based on stylePack.padding
 */
export const buttonPadding = (size: SpacingSize): string => {
  const map: Record<SpacingSize, string> = {
    tight: '0.75rem 1.5rem',
    normal: '1rem 2rem',
    relaxed: '1.25rem 2.5rem',
  }
  return map[size]
}

/**
 * Get input padding based on stylePack.padding
 */
export const inputPadding = (size: SpacingSize): string => {
  const map: Record<SpacingSize, string> = {
    tight: '0.75rem',
    normal: '1rem',
    relaxed: '1.25rem',
  }
  return map[size]
}

/**
 * Get card padding based on stylePack.padding
 */
export const cardPadding = (size: SpacingSize): string => {
  const map: Record<SpacingSize, string> = {
    tight: '1.5rem',
    normal: '2rem',
    relaxed: '2.5rem',
  }
  return map[size]
}
