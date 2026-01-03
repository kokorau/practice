import { describe, it, expect } from 'vitest'
import {
  createSite,
  createDemoSite,
  updateSiteTheme,
  updateSectionContent,
  getFirstPage,
  exportToHTML,
  exportToCSS,
} from './SiteService'
import { createDefaultLightPalette } from '../../SemanticColorPalette/Infra'
import { createDemoPage } from '../Infra'

describe('SiteService', () => {
  const palette = createDefaultLightPalette()

  describe('createSite', () => {
    it('creates a site with minimal params', () => {
      const site = createSite({ palette })

      expect(site.meta.name).toBe('Untitled Site')
      expect(site.theme.palette).toBe(palette)
      expect(site.pages).toEqual([])
      expect(site.contents).toEqual({})
    })

    it('creates a site with custom meta', () => {
      const site = createSite({
        palette,
        meta: { id: 'test-id', name: 'Test Site', description: 'A test site' },
      })

      expect(site.meta.id).toBe('test-id')
      expect(site.meta.name).toBe('Test Site')
      expect(site.meta.description).toBe('A test site')
    })

    it('creates a site with pages and contents', () => {
      const page = createDemoPage()
      // Build contents from sections
      const contents: Record<string, import('../Domain').SectionContent> = {}
      for (const section of page.sections) {
        contents[section.id] = section.content
      }

      const site = createSite({
        palette,
        pages: [page],
        contents,
      })

      expect(site.pages).toHaveLength(1)
      expect(Object.keys(site.contents).length).toBeGreaterThan(0)
    })
  })

  describe('createDemoSite', () => {
    it('creates a demo site with all sections', () => {
      const site = createDemoSite(palette)

      expect(site.meta.id).toBe('demo-site')
      expect(site.meta.name).toBe('Demo Site')
      expect(site.pages).toHaveLength(1)

      const page = getFirstPage(site)
      expect(page).toBeDefined()
      expect(page!.sections.length).toBeGreaterThan(0)

      // Check that contents are populated for each section
      for (const section of page!.sections) {
        expect(site.contents[section.id]).toBeDefined()
      }
    })
  })

  describe('updateSiteTheme', () => {
    it('updates the palette', () => {
      const site = createDemoSite(palette)
      const newPalette = createDefaultLightPalette() // different instance

      const updated = updateSiteTheme(site, { palette: newPalette })

      expect(updated.theme.palette).toBe(newPalette)
      expect(updated.theme.tokens).toBe(site.theme.tokens)
    })
  })

  describe('updateSectionContent', () => {
    it('updates content for a section', () => {
      const site = createDemoSite(palette)
      const page = getFirstPage(site)!
      const sectionId = page.sections[0]!.id
      // Use type assertion for test flexibility
      const newContent = { title: 'Updated Title' } as import('../Domain').SectionContent

      const updated = updateSectionContent(site, sectionId, newContent)

      expect(updated.contents[sectionId]).toEqual(newContent)
    })
  })

  describe('exportToHTML', () => {
    it('exports full HTML document', () => {
      const site = createDemoSite(palette)

      const html = exportToHTML(site, { title: 'Exported Demo' })

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html lang="en">')
      expect(html).toContain('<title>Exported Demo</title>')
      expect(html).toContain('<style>')
      expect(html).toContain('class="semantic-page"')
    })

    it('exports partial HTML (no document wrapper)', () => {
      const site = createDemoSite(palette)

      const html = exportToHTML(site, { fullDocument: false })

      expect(html).not.toContain('<!DOCTYPE html>')
      expect(html).toContain('<style>')
      expect(html).toContain('class="semantic-page"')
    })

    it('includes CSS variables in output', () => {
      const site = createDemoSite(palette)

      const html = exportToHTML(site)

      expect(html).toContain('--context-canvas-surface')
      expect(html).toContain('.context-canvas')
    })
  })

  describe('exportToCSS', () => {
    it('exports CSS without style tags', () => {
      const site = createDemoSite(palette)

      const css = exportToCSS(site)

      expect(css).not.toContain('<style>')
      expect(css).not.toContain('</style>')
      expect(css).toContain('.semantic-page')
      expect(css).toContain('--context-canvas-surface')
    })

    it('uses custom selector', () => {
      const site = createDemoSite(palette)

      const css = exportToCSS(site, '.my-app')

      expect(css).toContain('.my-app')
    })
  })
})
