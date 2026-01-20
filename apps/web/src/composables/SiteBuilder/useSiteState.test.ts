import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { useSiteState } from './useSiteState'

describe('useSiteState', () => {
  describe('initialization', () => {
    it('creates with default site', () => {
      const state = useSiteState()

      expect(state.site.value).toBeDefined()
      expect(state.seedColors.value).toBeDefined()
      expect(state.palette.value).toBeDefined()
      expect(state.tokens.value).toBeDefined()
      expect(state.isDark.value).toBe(false) // Default foundation is light
    })

    it('has default seed colors', () => {
      const state = useSiteState()

      expect(state.seedColors.value.brand).toBeDefined()
      expect(state.seedColors.value.foundation).toBeDefined()
      expect(state.seedColors.value.accent).toBeDefined()
    })

    it('generates primitive and semantic palettes from seed colors', () => {
      const state = useSiteState()

      expect(state.primitivePalette.value).toBeDefined()
      expect(state.semanticPalette.value).toBeDefined()
      expect(state.primitivePalette.value.theme).toBe('light') // Light theme for light foundation
    })
  })

  describe('updateSeedColors', () => {
    it('updates brand color', async () => {
      const state = useSiteState()
      const newBrand = { L: 0.7, C: 0.2, H: 240 }

      state.updateBrandColor(newBrand)
      await nextTick()

      expect(state.seedColors.value.brand).toEqual(newBrand)
    })

    it('updates foundation color', async () => {
      const state = useSiteState()
      const newFoundation = { L: 0.2, C: 0.01, H: 0 }

      state.updateFoundationColor(newFoundation)
      await nextTick()

      expect(state.seedColors.value.foundation).toEqual(newFoundation)
      expect(state.isDark.value).toBe(true) // Dark foundation
    })

    it('updates accent color', async () => {
      const state = useSiteState()
      const newAccent = { L: 0.5, C: 0.25, H: 120 }

      state.updateAccentColor(newAccent)
      await nextTick()

      expect(state.seedColors.value.accent).toEqual(newAccent)
    })

    it('regenerates palettes when seed colors change', async () => {
      const state = useSiteState()
      const oldPrimitive = state.primitivePalette.value

      state.updateBrandColor({ L: 0.7, C: 0.2, H: 240 })
      await nextTick()

      // Palette should have changed
      expect(state.primitivePalette.value).not.toBe(oldPrimitive)
    })
  })

  describe('updateTokens', () => {
    it('updates tokens', async () => {
      const state = useSiteState()
      const newTokens = {
        ...state.tokens.value,
        spacing: {
          none: '0',
          xs: '0.1rem',
          sm: '0.2rem',
          md: '0.4rem',
          lg: '0.8rem',
          xl: '1.6rem',
          '2xl': '3.2rem',
          '3xl': '6.4rem',
        },
      }

      state.updateTokens(newTokens)
      await nextTick()

      expect(state.tokens.value.spacing.xs).toBe('0.1rem')
    })

    it('sets tokens by preset ID', async () => {
      const state = useSiteState()
      const originalSpacing = state.tokens.value.spacing

      state.setTokensById('compact')
      await nextTick()

      // Compact preset has different spacing values
      expect(state.tokens.value.spacing).not.toEqual(originalSpacing)
    })
  })

  describe('updateContents', () => {
    it('updates contents', async () => {
      const state = useSiteState()

      state.updateContents({ 'section.hero.title': 'Hello World' })
      await nextTick()

      expect(state.contents.value['section.hero.title']).toBe('Hello World')
    })

    it('sets content by path', async () => {
      const state = useSiteState()

      state.setContentByPath('section.about.description', 'About us text')
      await nextTick()

      // $Contents.set creates nested structure for dot-separated paths
      const section = state.contents.value['section'] as Record<string, unknown>
      const about = section?.['about'] as Record<string, unknown>
      expect(about?.['description']).toBe('About us text')
    })

    it('updates section content', async () => {
      const state = useSiteState()
      const content = { title: 'New Title', subtitle: 'New Subtitle' }

      state.updateSectionContent('hero-1', content)
      await nextTick()

      expect(state.contents.value['hero-1']).toEqual(content)
    })
  })

  describe('repository access', () => {
    it('exposes repository for advanced use cases', () => {
      const state = useSiteState()

      expect(state.repository).toBeDefined()
      expect(typeof state.repository.get).toBe('function')
      expect(typeof state.repository.set).toBe('function')
      expect(typeof state.repository.subscribe).toBe('function')
    })
  })

  describe('reactivity', () => {
    it('site ref updates when repository changes', async () => {
      const state = useSiteState()
      const originalSite = state.site.value

      state.updateBrandColor({ L: 0.8, C: 0.1, H: 60 })
      await nextTick()

      expect(state.site.value).not.toBe(originalSite)
    })
  })
})
