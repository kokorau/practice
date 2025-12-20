/**
 * Template Evaluator - Simple variable substitution for string templates
 *
 * Evaluates template strings by replacing ${variable} placeholders with values.
 * Loops and conditionals should be handled in the preprocessor before evaluation.
 */

import type { TemplateVars } from '../Domain'

// ============================================================================
// Template Evaluation
// ============================================================================

/**
 * Evaluate a template string by replacing ${variable} placeholders
 *
 * @param template - Template string with ${variable} placeholders
 * @param vars - Map of variable names to values
 * @returns Evaluated HTML string
 *
 * @example
 * ```ts
 * const result = evaluateTemplate(
 *   '<h1>${title}</h1><p>${description}</p>',
 *   { title: 'Hello', description: 'World' }
 * )
 * // => '<h1>Hello</h1><p>World</p>'
 * ```
 */
export const evaluateTemplate = (template: string, vars: TemplateVars): string => {
  return template.replace(/\$\{([^}]+)\}/g, (_, key: string) => {
    const trimmedKey = key.trim()
    return vars[trimmedKey] ?? ''
  })
}

// ============================================================================
// HTML Helpers
// ============================================================================

/**
 * Escape HTML special characters to prevent XSS
 */
export const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

/**
 * Create an HTML attribute string, escaping the value
 */
export const attr = (name: string, value: string): string =>
  `${name}="${escapeHtml(value)}"`

/**
 * Join multiple HTML fragments
 */
export const join = (fragments: readonly string[], separator = ''): string =>
  fragments.join(separator)

// ============================================================================
// Preprocessor Helpers
// ============================================================================

/**
 * Map an array to HTML fragments using a mapper function
 * Use this in preprocessors to handle loops
 */
export const mapToHtml = <T>(
  items: readonly T[],
  mapper: (item: T, index: number) => string
): string => items.map(mapper).join('')

/**
 * Conditionally return HTML or empty string
 * Use this in preprocessors to handle conditionals
 */
export const when = (condition: unknown, html: string): string =>
  condition ? html : ''

/**
 * Choose between two HTML strings based on condition
 */
export const ifElse = (condition: unknown, ifTrue: string, ifFalse: string): string =>
  condition ? ifTrue : ifFalse
