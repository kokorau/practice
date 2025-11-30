import type { GoogleFontItem } from './types'

export type FontPreset = {
  id: string
  name: string
  family: string
  category: string
  source: {
    vendor: 'google'
    url: string
  }
}

/**
 * Convert Google Fonts API variant to weight number
 * e.g., "regular" -> 400, "700" -> 700, "700italic" -> 700
 */
function variantToWeight(variant: string): number {
  if (variant === 'regular' || variant === 'italic') return 400
  const match = variant.match(/^\d+/)
  return match ? parseInt(match[0], 10) : 400
}

/**
 * Generate Google Fonts CSS URL
 * e.g., https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap
 */
function generateGoogleFontsUrl(family: string, variants: string[]): string {
  const weights = [...new Set(variants.map(variantToWeight))].sort((a, b) => a - b)
  const encodedFamily = encodeURIComponent(family)
  const weightsParam = weights.length > 0 ? `:wght@${weights.join(';')}` : ''
  return `https://fonts.googleapis.com/css2?family=${encodedFamily}${weightsParam}&display=swap`
}

/**
 * Generate font-family CSS value with fallback
 */
function generateFontFamily(family: string, category: string): string {
  const fallback = getFallback(category)
  return `'${family}', ${fallback}`
}

function getFallback(category: string): string {
  switch (category) {
    case 'serif':
      return 'serif'
    case 'monospace':
      return 'monospace'
    case 'display':
    case 'handwriting':
      return 'cursive'
    default:
      return 'sans-serif'
  }
}

/**
 * Generate a URL-safe ID from font family name
 */
function generateId(family: string): string {
  return family
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/**
 * Convert Google Font item to FontPreset
 */
export function toFontPreset(item: GoogleFontItem): FontPreset {
  return {
    id: generateId(item.family),
    name: item.family,
    family: generateFontFamily(item.family, item.category),
    category: item.category,
    source: {
      vendor: 'google',
      url: generateGoogleFontsUrl(item.family, item.variants),
    },
  }
}

/**
 * Convert multiple Google Font items to FontPresets
 */
export function toFontPresets(items: GoogleFontItem[]): FontPreset[] {
  return items.map(toFontPreset)
}
