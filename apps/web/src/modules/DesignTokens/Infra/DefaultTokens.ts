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
        size: '1.25rem',
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
        size: '1.125rem',
        weight: 600,
        lineHeight: 1.25,
        letterSpacing: '-0.01em',
      },
      body: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '0.875rem',
        weight: 400,
        lineHeight: 1.5,
        letterSpacing: 'normal',
      },
      meta: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '0.75rem',
        weight: 400,
        lineHeight: 1.35,
        letterSpacing: '0.02em',
      },
      link: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '0.875rem',
        weight: 400,
        lineHeight: 1.5,
        letterSpacing: 'normal',
      },
    },
    radius: {
      none: '0',
      sm: '0.125rem',
      md: '0.25rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px',
    },
    spacing: {
      none: '0',
      xs: '0.125rem',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '1rem',
      xl: '1.5rem',
      '2xl': '2rem',
      '3xl': '3rem',
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
        size: '1.5rem',
        weight: 600,
        lineHeight: 1.35,
        letterSpacing: '-0.02em',
      },
      body: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '1.125rem',
        weight: 400,
        lineHeight: 1.7,
        letterSpacing: 'normal',
      },
      meta: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '1rem',
        weight: 400,
        lineHeight: 1.5,
        letterSpacing: '0.01em',
      },
      link: {
        family: 'system-ui, -apple-system, sans-serif',
        size: '1.125rem',
        weight: 400,
        lineHeight: 1.7,
        letterSpacing: 'normal',
      },
    },
    radius: {
      none: '0',
      sm: '0.375rem',
      md: '0.75rem',
      lg: '1rem',
      xl: '1.5rem',
      full: '9999px',
    },
    spacing: {
      none: '0',
      xs: '0.375rem',
      sm: '0.75rem',
      md: '1.25rem',
      lg: '2rem',
      xl: '2.5rem',
      '2xl': '4rem',
      '3xl': '5rem',
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
