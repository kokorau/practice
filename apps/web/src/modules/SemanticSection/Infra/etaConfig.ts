/**
 * Eta Template Engine Configuration
 */

import { Eta } from 'eta'

export const eta = new Eta({
  autoEscape: true,
  autoTrim: [false, false],
})

/**
 * Escape HTML special characters (for use in templates with <%~ %> raw output)
 */
export const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
