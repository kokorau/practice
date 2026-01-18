/**
 * Spacing scale tokens
 */
export type SpacingScale = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

/**
 * Spacing tokens for all scales
 */
export type Spacing = {
  readonly [K in SpacingScale]: string
}

/**
 * Create spacing tokens with defaults
 */
export const createSpacing = (partial: Partial<Spacing> = {}): Spacing => ({
  none: partial.none ?? '0',
  xs: partial.xs ?? '0.25rem',
  sm: partial.sm ?? '0.5rem',
  md: partial.md ?? '1rem',
  lg: partial.lg ?? '1.5rem',
  xl: partial.xl ?? '2rem',
  '2xl': partial['2xl'] ?? '3rem',
  '3xl': partial['3xl'] ?? '4rem',
})
