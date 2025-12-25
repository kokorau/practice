/**
 * Typography token for a semantic role (title, body, meta, link)
 */
export type TypographyToken = {
  readonly family: string
  readonly size: string
  readonly weight: number
  readonly lineHeight: number
  readonly letterSpacing: string
}

/**
 * Semantic typography roles
 */
export type TypographyRole = 'title' | 'body' | 'meta' | 'link'

/**
 * Typography tokens for all semantic roles
 */
export type Typography = {
  readonly [K in TypographyRole]: TypographyToken
}

/**
 * Default typography token values
 */
const DEFAULT_TYPOGRAPHY_TOKEN: TypographyToken = {
  family: 'system-ui, -apple-system, sans-serif',
  size: '1rem',
  weight: 400,
  lineHeight: 1.5,
  letterSpacing: 'normal',
}

/**
 * Create a typography token with defaults
 */
export const createTypographyToken = (
  partial: Partial<TypographyToken> = {}
): TypographyToken => ({
  ...DEFAULT_TYPOGRAPHY_TOKEN,
  ...partial,
})

/**
 * Create typography tokens for all roles
 */
export const createTypography = (partial: Partial<Typography> = {}): Typography => ({
  title: partial.title ?? createTypographyToken({
    size: '1.25rem',
    weight: 600,
    lineHeight: 1.3,
  }),
  body: partial.body ?? createTypographyToken({
    size: '1rem',
    weight: 400,
    lineHeight: 1.6,
  }),
  meta: partial.meta ?? createTypographyToken({
    size: '0.875rem',
    weight: 400,
    lineHeight: 1.4,
    letterSpacing: '0.01em',
  }),
  link: partial.link ?? createTypographyToken({
    size: '1rem',
    weight: 400,
    lineHeight: 1.6,
  }),
})
