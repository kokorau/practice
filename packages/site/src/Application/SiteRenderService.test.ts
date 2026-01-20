import { describe, it, expect } from 'vitest'
import { createRenderableSite, exportToHTML } from './SiteRenderService'
import { createSemanticFromPrimitive, createPrimitivePalette } from '@practice/semantic-color-palette/Infra'
import { createDesignTokens } from '@practice/design-tokens/Domain'
import type { Page, Section, HeroContent } from '@practice/section-semantic'

describe('SiteRenderService', () => {
  const createTestPalette = () => {
    const primitivePalette = createPrimitivePalette({
      brand: { L: 0.5, C: 0.2, H: 240 },
      foundation: { L: 0.95, C: 0.01, H: 240 },
    })
    return createSemanticFromPrimitive(primitivePalette)
  }

  const createTestTokens = () => createDesignTokens()

  const createTestPage = (): Page => ({
    id: 'test-page',
    sections: [
      {
        id: 'hero-1',
        kind: 'hero',
        content: {
          title: 'Test Headline',
          subtitle: 'Test Subheadline',
          primaryCtaLabel: 'Get Started',
        } satisfies HeroContent,
      } as Section,
    ],
  })

  describe('createRenderableSite', () => {
    it('creates a renderable site with required params', () => {
      const palette = createTestPalette()
      const site = createRenderableSite({ palette })

      expect(site.meta.name).toBe('Untitled Site')
      expect(site.theme.palette).toBe(palette)
      expect(site.theme.tokens).toBeDefined()
      expect(site.pages).toEqual([])
      expect(site.contents).toEqual({})
    })

    it('creates a renderable site with all params', () => {
      const palette = createTestPalette()
      const tokens = createTestTokens()
      const page = createTestPage()
      const contents = { 'hero-1': { headline: 'Custom' } }

      const site = createRenderableSite({
        meta: { id: 'my-site', name: 'My Site', description: 'A test site' },
        palette,
        tokens,
        pages: [page],
        contents,
      })

      expect(site.meta.id).toBe('my-site')
      expect(site.meta.name).toBe('My Site')
      expect(site.meta.description).toBe('A test site')
      expect(site.theme.palette).toBe(palette)
      expect(site.theme.tokens).toBe(tokens)
      expect(site.pages).toEqual([page])
      expect(site.contents).toBe(contents)
    })

    it('generates UUID for meta.id if not provided', () => {
      const palette = createTestPalette()
      const site = createRenderableSite({ palette })

      expect(site.meta.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      )
    })
  })

  describe('exportToHTML', () => {
    it('exports site to full HTML document', () => {
      const palette = createTestPalette()
      const page = createTestPage()
      const site = createRenderableSite({
        meta: { name: 'Test Site' },
        palette,
        pages: [page],
      })

      const html = exportToHTML(site)

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<title>Test Site</title>')
      expect(html).toContain('Test Headline')
      expect(html).toContain('semantic-page')
    })

    it('exports site with custom title', () => {
      const palette = createTestPalette()
      const page = createTestPage()
      const site = createRenderableSite({ palette, pages: [page] })

      const html = exportToHTML(site, { title: 'Custom Title' })

      expect(html).toContain('<title>Custom Title</title>')
    })

    it('exports site without full document wrapper', () => {
      const palette = createTestPalette()
      const page = createTestPage()
      const site = createRenderableSite({ palette, pages: [page] })

      const html = exportToHTML(site, { fullDocument: false })

      expect(html).not.toContain('<!DOCTYPE html>')
      expect(html).toContain('semantic-page')
    })

    it('throws error when no pages to export', () => {
      const palette = createTestPalette()
      const site = createRenderableSite({ palette })

      expect(() => exportToHTML(site)).toThrow('No page to export')
    })

    it('exports specific page when provided', () => {
      const palette = createTestPalette()
      const page1 = createTestPage()
      const page2: Page = {
        id: 'page-2',
        sections: [
          {
            id: 'hero-2',
            kind: 'hero',
            content: {
              title: 'Page 2 Headline',
              subtitle: 'Page 2 Subheadline',
              primaryCtaLabel: 'Click',
            } satisfies HeroContent,
          } as Section,
        ],
      }
      const site = createRenderableSite({ palette, pages: [page1, page2] })

      const html = exportToHTML(site, { page: page2 })

      expect(html).toContain('Page 2 Headline')
      expect(html).not.toContain('Test Headline')
    })

    it('escapes HTML in title', () => {
      const palette = createTestPalette()
      const page = createTestPage()
      const site = createRenderableSite({ palette, pages: [page] })

      const html = exportToHTML(site, { title: '<script>alert("xss")</script>' })

      expect(html).toContain('&lt;script&gt;')
      expect(html).not.toContain('<script>alert')
    })
  })
})
