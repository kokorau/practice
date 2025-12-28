/**
 * LayoutHtmlTemplate is a raw HTML string containing data-* attributes
 * for styling hooks.
 */
export type LayoutHtmlTemplate = string

/**
 * LayoutHtml represents a reusable HTML template with metadata.
 */
export type LayoutHtml = {
  /** Template ID (e.g., "hero-left-image") */
  readonly id: string

  /** Optional description for UI template picker */
  readonly description?: string

  /** The actual HTML template with data-* attributes */
  readonly template: LayoutHtmlTemplate
}

export const $LayoutHtml = {
  create: undefined as unknown as (
    id: string,
    template: LayoutHtmlTemplate,
    description?: string
  ) => LayoutHtml,
}
