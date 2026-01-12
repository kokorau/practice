import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FontLoaderService } from './FontLoaderService'

// Mock FontFace class
class MockFontFace {
  family: string
  source: string
  loaded = false

  constructor(family: string, source: string) {
    this.family = family
    this.source = source
  }

  async load(): Promise<MockFontFace> {
    this.loaded = true
    return this
  }
}

// Mock FontFaceSet
function createMockFontFaceSet() {
  const fonts = new Set<MockFontFace>()
  return {
    add: vi.fn((font: MockFontFace) => fonts.add(font)),
    delete: vi.fn((font: MockFontFace) => fonts.delete(font)),
    has: vi.fn((font: MockFontFace) => fonts.has(font)),
    get size() {
      return fonts.size
    },
    values: () => fonts.values(),
  } as unknown as FontFaceSet
}

// Replace global FontFace with mock
vi.stubGlobal('FontFace', MockFontFace)

describe('FontLoaderService', () => {
  let service: FontLoaderService
  let mockFontSet: ReturnType<typeof createMockFontFaceSet>

  beforeEach(() => {
    mockFontSet = createMockFontFaceSet()
    service = new FontLoaderService({ fontSet: mockFontSet })
  })

  describe('loadFont', () => {
    it('should load a font and return family name', async () => {
      const familyName = await service.loadFont('https://example.com/font.woff2', 'MyFont')

      expect(familyName).toMatch(/^preview-font-\d+-MyFont$/)
      expect(mockFontSet.add).toHaveBeenCalledTimes(1)
    })

    it('should sanitize font name in family name', async () => {
      const familyName = await service.loadFont(
        'https://example.com/font.woff2',
        'My Font! @Special'
      )

      expect(familyName).toMatch(/^preview-font-\d+-My-Font---Special$/)
    })

    it('should generate unique family names for different fonts', async () => {
      const familyName1 = await service.loadFont('https://example.com/font1.woff2', 'Font')
      const familyName2 = await service.loadFont('https://example.com/font2.woff2', 'Font')

      expect(familyName1).not.toBe(familyName2)
    })

    it('should return cached family name for same URL', async () => {
      const url = 'https://example.com/font.woff2'
      const familyName1 = await service.loadFont(url, 'Font')
      const familyName2 = await service.loadFont(url, 'Font')

      expect(familyName1).toBe(familyName2)
      // Should only add to fontSet once
      expect(mockFontSet.add).toHaveBeenCalledTimes(1)
    })
  })

  describe('unloadFont', () => {
    it('should unload a font by family name', async () => {
      const familyName = await service.loadFont('https://example.com/font.woff2', 'Font')

      const result = service.unloadFont(familyName)

      expect(result).toBe(true)
      expect(mockFontSet.delete).toHaveBeenCalledTimes(1)
      expect(service.isLoaded(familyName)).toBe(false)
    })

    it('should return false when unloading non-existent font', () => {
      const result = service.unloadFont('non-existent-font')

      expect(result).toBe(false)
      expect(mockFontSet.delete).not.toHaveBeenCalled()
    })

    it('should allow reloading same URL after unload', async () => {
      const url = 'https://example.com/font.woff2'
      const familyName1 = await service.loadFont(url, 'Font')
      service.unloadFont(familyName1)
      const familyName2 = await service.loadFont(url, 'Font')

      expect(familyName1).not.toBe(familyName2)
      expect(mockFontSet.add).toHaveBeenCalledTimes(2)
    })
  })

  describe('unloadAll', () => {
    it('should unload all loaded fonts', async () => {
      await service.loadFont('https://example.com/font1.woff2', 'Font1')
      await service.loadFont('https://example.com/font2.woff2', 'Font2')
      await service.loadFont('https://example.com/font3.woff2', 'Font3')

      service.unloadAll()

      expect(mockFontSet.delete).toHaveBeenCalledTimes(3)
      expect(service.getLoadedFonts()).toHaveLength(0)
    })

    it('should work when no fonts are loaded', () => {
      expect(() => service.unloadAll()).not.toThrow()
    })
  })

  describe('isLoaded', () => {
    it('should return true for loaded font', async () => {
      const familyName = await service.loadFont('https://example.com/font.woff2', 'Font')

      expect(service.isLoaded(familyName)).toBe(true)
    })

    it('should return false for unloaded font', () => {
      expect(service.isLoaded('non-existent')).toBe(false)
    })
  })

  describe('getLoadedFonts', () => {
    it('should return all loaded font family names', async () => {
      const familyName1 = await service.loadFont('https://example.com/font1.woff2', 'Font1')
      const familyName2 = await service.loadFont('https://example.com/font2.woff2', 'Font2')

      const loadedFonts = service.getLoadedFonts()

      expect(loadedFonts).toContain(familyName1)
      expect(loadedFonts).toContain(familyName2)
      expect(loadedFonts).toHaveLength(2)
    })

    it('should return empty array when no fonts loaded', () => {
      expect(service.getLoadedFonts()).toEqual([])
    })
  })
})
