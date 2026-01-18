import { $DesignTokens, type DesignTokens } from '../Domain'

/**
 * Token preset entry with id, name, and tokens
 */
export type TokenPresetEntry = {
  id: string
  name: string
  tokens: DesignTokens
}

/**
 * Default design tokens preset
 */
export const createDefaultTokens = (): DesignTokens => {
  return $DesignTokens.create({
    typography: {
      title: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '1rem',
        weight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      body: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '1rem',
        weight: 400,
        lineHeight: 1.6,
        letterSpacing: 'normal',
      },
      meta: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '0.875rem',
        weight: 400,
        lineHeight: 1.4,
        letterSpacing: '0.01em',
      },
      link: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '1rem',
        weight: 400,
        lineHeight: 1.6,
        letterSpacing: 'normal',
      },
    },
    radius: {
      none: '0',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px',
    },
    spacing: {
      none: '0',
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem',
    },
  })
}

/**
 * Compact design tokens preset (tighter spacing, smaller text)
 */
export const createCompactTokens = (): DesignTokens => {
  return $DesignTokens.create({
    typography: {
      title: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '0.9rem',
        weight: 600,
        lineHeight: 1.25,
        letterSpacing: '-0.01em',
      },
      body: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '1rem',
        weight: 400,
        lineHeight: 1.5,
        letterSpacing: 'normal',
      },
      meta: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '0.8rem',
        weight: 400,
        lineHeight: 1.35,
        letterSpacing: '0.02em',
      },
      link: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '1rem',
        weight: 400,
        lineHeight: 1.5,
        letterSpacing: 'normal',
      },
    },
    radius: {
      none: '0',
      sm: '0.2rem',
      md: '0.4rem',
      lg: '0.6rem',
      xl: '0.8rem',
      full: '9999px',
    },
    spacing: {
      none: '0',
      xs: '0.2rem',
      sm: '0.4rem',
      md: '0.8rem',
      lg: '1.25rem',
      xl: '1.75rem',
      '2xl': '2.5rem',
      '3xl': '3.5rem',
    },
  })
}

/**
 * Comfortable design tokens preset (looser spacing, larger text)
 */
export const createComfortableTokens = (): DesignTokens => {
  return $DesignTokens.create({
    typography: {
      title: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '1.1rem',
        weight: 600,
        lineHeight: 1.35,
        letterSpacing: '-0.02em',
      },
      body: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '1rem',
        weight: 400,
        lineHeight: 1.7,
        letterSpacing: 'normal',
      },
      meta: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '0.9rem',
        weight: 400,
        lineHeight: 1.5,
        letterSpacing: '0.01em',
      },
      link: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '1rem',
        weight: 400,
        lineHeight: 1.7,
        letterSpacing: 'normal',
      },
    },
    radius: {
      none: '0',
      sm: '0.3rem',
      md: '0.6rem',
      lg: '0.9rem',
      xl: '1.2rem',
      full: '9999px',
    },
    spacing: {
      none: '0',
      xs: '0.3rem',
      sm: '0.6rem',
      md: '1.2rem',
      lg: '1.75rem',
      xl: '2.25rem',
      '2xl': '3.5rem',
      '3xl': '4.5rem',
    },
  })
}

/**
 * Get all available token presets
 */
export const getTokenPresetEntries = (): TokenPresetEntry[] => [
  { id: 'default', name: 'Default', tokens: createDefaultTokens() },
  { id: 'compact', name: 'Compact', tokens: createCompactTokens() },
  { id: 'comfortable', name: 'Comfortable', tokens: createComfortableTokens() },
]
