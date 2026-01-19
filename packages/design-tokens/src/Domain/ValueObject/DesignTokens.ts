import { type Typography, createTypography } from './Typography'
import { type Radius, createRadius } from './Radius'
import { type Spacing, createSpacing } from './Spacing'

/**
 * Complete design tokens combining typography, radius, and spacing
 */
export type DesignTokens = {
  readonly typography: Typography
  readonly radius: Radius
  readonly spacing: Spacing
}

/**
 * Input for creating design tokens (all fields optional with defaults)
 */
export type DesignTokensInput = {
  readonly typography?: Partial<Typography>
  readonly radius?: Partial<Radius>
  readonly spacing?: Partial<Spacing>
}

/**
 * Create design tokens with defaults
 */
export const createDesignTokens = (input: DesignTokensInput = {}): DesignTokens => ({
  typography: createTypography(input.typography),
  radius: createRadius(input.radius),
  spacing: createSpacing(input.spacing),
})

/**
 * DesignTokens factory namespace
 */
export const $DesignTokens = {
  create: createDesignTokens,
} as const
