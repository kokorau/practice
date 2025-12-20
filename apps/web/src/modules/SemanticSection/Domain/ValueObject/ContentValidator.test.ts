import { describe, it, expect } from 'vitest'
import {
  validateContent,
  formatErrors,
  hasErrorAt,
  getErrorsAt,
} from './ContentValidator'
import type { SectionSchema, HeaderContent, HeroContent, FeaturesContent, SectionContent } from './index'

// ============================================================================
// Test Schemas
// ============================================================================

const headerSchema: SectionSchema = {
  id: 'header',
  type: 'header',
  name: 'Header',
  fields: [
    { key: 'logoText', type: 'text', label: 'Logo Text', constraints: { maxLength: 20 } },
    { key: 'logoUrl', type: 'url', label: 'Logo URL', required: false },
    {
      key: 'links',
      type: 'list',
      label: 'Links',
      constraints: { minItems: 1, maxItems: 6 },
      itemSchema: {
        key: 'item',
        type: 'object',
        fields: [
          { key: 'label', type: 'text', label: 'Label', constraints: { maxLength: 30 } },
          { key: 'url', type: 'url', label: 'URL' },
        ],
      },
    },
  ],
}

const heroSchema: SectionSchema = {
  id: 'hero',
  type: 'hero',
  name: 'Hero',
  fields: [
    { key: 'title', type: 'text', label: 'Title', constraints: { minLength: 5, maxLength: 60 } },
    { key: 'subtitle', type: 'text', label: 'Subtitle', constraints: { maxLength: 150 } },
    { key: 'badge', type: 'text', label: 'Badge', required: false, constraints: { maxLength: 30 } },
  ],
}

const featuresSchema: SectionSchema = {
  id: 'features',
  type: 'features',
  name: 'Features',
  fields: [
    { key: 'title', type: 'text', label: 'Title', constraints: { maxLength: 40 } },
    {
      key: 'features',
      type: 'list',
      label: 'Features',
      constraints: { minItems: 2, maxItems: 6 },
      itemSchema: {
        key: 'item',
        type: 'object',
        fields: [
          { key: 'title', type: 'text', label: 'Feature Title', constraints: { maxLength: 40 } },
          { key: 'description', type: 'text', label: 'Description', constraints: { maxLength: 120 } },
        ],
      },
    },
  ],
}

// ============================================================================
// Tests
// ============================================================================

describe('ContentValidator', () => {
  describe('validateContent', () => {
    describe('required fields', () => {
      it('passes when all required fields present', () => {
        const content: HeaderContent = {
          logoText: 'Brand',
          links: [{ label: 'Home', url: '/' }],
        }
        const result = validateContent(content, headerSchema)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('fails when required field is missing', () => {
        const content = {
          links: [{ label: 'Home', url: '/' }],
        } as unknown as SectionContent
        const result = validateContent(content, headerSchema)
        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0]?.path).toEqual(['logoText'])
        expect(result.errors[0]?.constraint).toBe('required')
      })

      it('fails when required field is empty string', () => {
        const content: HeaderContent = {
          logoText: '',
          links: [{ label: 'Home', url: '/' }],
        }
        const result = validateContent(content, headerSchema)
        expect(result.valid).toBe(false)
        expect(result.errors[0]?.constraint).toBe('required')
      })

      it('allows optional fields to be missing', () => {
        const content: HeroContent = {
          title: 'Welcome to our site',
          subtitle: 'The best thing ever',
          primaryCtaLabel: 'Get Started',
          // badge is optional
        }
        const result = validateContent(content, heroSchema)
        expect(result.valid).toBe(true)
      })
    })

    describe('text length constraints', () => {
      it('passes when text is within limits', () => {
        const content: HeroContent = {
          title: 'Welcome',
          subtitle: 'Great product',
          primaryCtaLabel: 'Start',
        }
        const result = validateContent(content, heroSchema)
        expect(result.valid).toBe(true)
      })

      it('fails when text is too short', () => {
        const content: HeroContent = {
          title: 'Hi', // minLength is 5
          subtitle: 'Good',
          primaryCtaLabel: 'Go',
        }
        const result = validateContent(content, heroSchema)
        expect(result.valid).toBe(false)
        expect(result.errors[0]?.constraint).toBe('minLength')
        expect(result.errors[0]?.expected).toBe(5)
        expect(result.errors[0]?.actual).toBe(2)
      })

      it('fails when text is too long', () => {
        const content: HeroContent = {
          title: 'A'.repeat(61), // maxLength is 60
          subtitle: 'Short',
          primaryCtaLabel: 'Go',
        }
        const result = validateContent(content, heroSchema)
        expect(result.valid).toBe(false)
        expect(result.errors[0]?.constraint).toBe('maxLength')
        expect(result.errors[0]?.expected).toBe(60)
        expect(result.errors[0]?.actual).toBe(61)
      })
    })

    describe('list constraints', () => {
      it('passes when list count is within limits', () => {
        const content: FeaturesContent = {
          title: 'Features',
          features: [
            { title: 'Feature 1', description: 'Desc 1' },
            { title: 'Feature 2', description: 'Desc 2' },
          ],
        }
        const result = validateContent(content, featuresSchema)
        expect(result.valid).toBe(true)
      })

      it('fails when list has too few items', () => {
        const content: FeaturesContent = {
          title: 'Features',
          features: [{ title: 'Only one', description: 'Not enough' }],
        }
        const result = validateContent(content, featuresSchema)
        expect(result.valid).toBe(false)
        expect(result.errors[0]?.constraint).toBe('minItems')
        expect(result.errors[0]?.expected).toBe(2)
        expect(result.errors[0]?.actual).toBe(1)
      })

      it('fails when list has too many items', () => {
        const content: FeaturesContent = {
          title: 'Features',
          features: Array(7)
            .fill(null)
            .map((_, i) => ({ title: `Feature ${i}`, description: `Desc ${i}` })),
        }
        const result = validateContent(content, featuresSchema)
        expect(result.valid).toBe(false)
        expect(result.errors[0]?.constraint).toBe('maxItems')
        expect(result.errors[0]?.expected).toBe(6)
        expect(result.errors[0]?.actual).toBe(7)
      })
    })

    describe('nested validation', () => {
      it('validates nested object fields', () => {
        const content: HeaderContent = {
          logoText: 'Brand',
          links: [{ label: 'A'.repeat(31), url: '/' }], // label too long
        }
        const result = validateContent(content, headerSchema)
        expect(result.valid).toBe(false)
        expect(result.errors[0]?.path).toEqual(['links', '0', 'label'])
        expect(result.errors[0]?.constraint).toBe('maxLength')
      })

      it('validates required fields in nested objects', () => {
        const content = {
          logoText: 'Brand',
          links: [{ label: 'Home' }], // missing url
        } as unknown as SectionContent
        const result = validateContent(content, headerSchema)
        expect(result.valid).toBe(false)
        expect(result.errors[0]?.path).toEqual(['links', '0', 'url'])
        expect(result.errors[0]?.constraint).toBe('required')
      })

      it('reports multiple errors', () => {
        const content: FeaturesContent = {
          title: 'A'.repeat(41), // too long
          features: [
            { title: 'OK', description: 'A'.repeat(121) }, // description too long
          ], // also too few items
        }
        const result = validateContent(content, featuresSchema)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThanOrEqual(3)
      })
    })
  })

  describe('formatErrors', () => {
    it('returns empty string for valid result', () => {
      const result = { valid: true, errors: [] }
      expect(formatErrors(result)).toBe('')
    })

    it('formats errors as line-separated strings', () => {
      const result = {
        valid: false,
        errors: [
          { path: ['title'], message: 'Title is required', constraint: 'required' as const },
          { path: ['features', '0', 'desc'], message: 'Desc too long', constraint: 'maxLength' as const },
        ],
      }
      const formatted = formatErrors(result)
      expect(formatted).toContain('[title] Title is required')
      expect(formatted).toContain('[features.0.desc] Desc too long')
    })
  })

  describe('hasErrorAt', () => {
    it('returns true when error exists at path', () => {
      const result = {
        valid: false,
        errors: [{ path: ['features', '0', 'title'], message: 'Too long', constraint: 'maxLength' as const }],
      }
      expect(hasErrorAt(result, ['features', '0', 'title'])).toBe(true)
    })

    it('returns false when no error at path', () => {
      const result = {
        valid: false,
        errors: [{ path: ['title'], message: 'Required', constraint: 'required' as const }],
      }
      expect(hasErrorAt(result, ['subtitle'])).toBe(false)
    })
  })

  describe('getErrorsAt', () => {
    it('returns errors at specified path', () => {
      const result = {
        valid: false,
        errors: [
          { path: ['title'], message: 'Error 1', constraint: 'required' as const },
          { path: ['title'], message: 'Error 2', constraint: 'minLength' as const },
          { path: ['subtitle'], message: 'Other', constraint: 'maxLength' as const },
        ],
      }
      const errors = getErrorsAt(result, ['title'])
      expect(errors).toHaveLength(2)
    })
  })
})
