/**
 * Radius scale tokens
 */
export type RadiusScale = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'

/**
 * Radius tokens for all scales
 */
export type Radius = {
  readonly [K in RadiusScale]: string
}

/**
 * Create radius tokens with defaults
 */
export const createRadius = (partial: Partial<Radius> = {}): Radius => ({
  none: partial.none ?? '0',
  sm: partial.sm ?? '0.25rem',
  md: partial.md ?? '0.5rem',
  lg: partial.lg ?? '0.75rem',
  xl: partial.xl ?? '1rem',
  full: partial.full ?? '9999px',
})
