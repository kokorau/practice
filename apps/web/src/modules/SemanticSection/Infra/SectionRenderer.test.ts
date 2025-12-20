import { describe, it, expect } from 'vitest'
import { renderPage, renderSection } from './SectionRenderer'
import { $Page, DEFAULT_STYLE_PACK } from '../Domain'
import type { RenderTheme, PageContents, HeaderContent, HeroContent } from '../Domain'
import { getDefaultContent } from '../Application'
import { createSemanticFromPrimitive, createPrimitivePalette } from '../../SemanticColorPalette/Infra'

// Create a test theme
const createTestTheme = (): RenderTheme => {
  const primitivePalette = createPrimitivePalette({
    brand: { L: 0.5, C: 0.2, H: 210 },
    foundation: { L: 0.95, C: 0.01, H: 210 },
  })
  const semanticPalette = createSemanticFromPrimitive(primitivePalette)

  return {
    palette: semanticPalette,
    style: DEFAULT_STYLE_PACK,
  }
}

describe('SectionRenderer', () => {
  describe('renderSection', () => {
    it('renders a header section', () => {
      const theme = createTestTheme()
      const content: HeaderContent = {
        logoText: 'TestLogo',
        links: [{ label: 'Home', url: '/' }],
      }

      const section = { id: 'header-1', type: 'header' as const }
      const html = renderSection(section, content, theme)

      expect(html).toContain('TestLogo')
      expect(html).toContain('Home')
      expect(html).toContain('context-canvas')
    })

    it('renders a hero section', () => {
      const theme = createTestTheme()
      const content: HeroContent = {
        title: 'Welcome',
        subtitle: 'This is a test',
        primaryCtaLabel: 'Get Started',
      }

      const section = { id: 'hero-1', type: 'hero' as const }
      const html = renderSection(section, content, theme)

      expect(html).toContain('Welcome')
      expect(html).toContain('This is a test')
      expect(html).toContain('Get Started')
      expect(html).toContain('context-section-tint')
    })
  })

  describe('renderPage', () => {
    it('renders a full page with all sections', () => {
      const theme = createTestTheme()
      const page = $Page.createDemo()

      // Create contents from default content
      const contents: Record<string, ReturnType<typeof getDefaultContent>> = {}
      for (const section of page.sections) {
        contents[section.id] = getDefaultContent(section.type)
      }

      const html = renderPage(page, contents, theme)

      // Check for CSS
      expect(html).toContain('<style>')
      expect(html).toContain('--context-canvas-surface')

      // Check for page wrapper
      expect(html).toContain('class="semantic-page"')

      // Check for various sections
      expect(html).toContain('PaletteGen') // Header logo
      expect(html).toContain('Design with') // Hero title
      expect(html).toContain('Features') // Features section
      expect(html).toContain('Trusted by teams at') // Logos section
      expect(html).toContain('How it works') // HowItWorks section
      expect(html).toContain('What people are saying') // Testimonials
      expect(html).toContain('Simple pricing') // Pricing
      expect(html).toContain('Frequently asked') // FAQ
      expect(html).toContain('Ready to Start') // CTA
      expect(html).toContain('Beautiful colors for everyone') // Footer tagline
    })

    it('renders without CSS when includeCSS is false', () => {
      const theme = createTestTheme()
      const page = $Page.create([{ id: 'header-1', type: 'header' }])
      const contents: PageContents = {
        'header-1': getDefaultContent('header'),
      }

      const html = renderPage(page, contents, theme, { includeCSS: false })

      expect(html).not.toContain('<style>')
      expect(html).toContain('class="semantic-page"')
    })

    it('uses custom wrapper class', () => {
      const theme = createTestTheme()
      const page = $Page.create([{ id: 'header-1', type: 'header' }])
      const contents: PageContents = {
        'header-1': getDefaultContent('header'),
      }

      const html = renderPage(page, contents, theme, { wrapperClass: 'my-custom-page' })

      expect(html).toContain('class="my-custom-page"')
    })
  })
})
