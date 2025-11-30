import { describe, it, expect } from 'vitest'
import { $ColorPalette } from './ColorPalette'
import type { ColorPalette } from './ColorPalette'

describe('ColorPalette', () => {
  describe('$ColorPalette.createDefault', () => {
    it('should create a default palette with all required fields', () => {
      const palette = $ColorPalette.createDefault()

      expect(palette.id).toBe('default')
      expect(palette.name).toBe('Default Palette')

      // Check semantic colors
      expect(palette.semantic.primary).toBeDefined()
      expect(palette.semantic.secondary).toBeDefined()
      expect(palette.semantic.success).toBeDefined()
      expect(palette.semantic.warning).toBeDefined()
      expect(palette.semantic.error).toBeDefined()
      expect(palette.semantic.info).toBeDefined()

      // Check surface colors
      expect(palette.semantic.surface).toBeDefined()
      expect(palette.semantic.surfaceVariant).toBeDefined()
      expect(palette.semantic.background).toBeDefined()

      // Check grayscale
      expect(palette.grayScale.gray50).toBeDefined()
      expect(palette.grayScale.gray500).toBeDefined()
      expect(palette.grayScale.gray950).toBeDefined()

      // Check brand
      expect(palette.brand.main).toBeDefined()
    })
  })

  describe('$ColorPalette.create', () => {
    it('should create a custom palette with overrides', () => {
      const customPrimary = { r: 0.5, g: 0.2, b: 0.8 }
      const palette = $ColorPalette.create({
        id: 'custom',
        name: 'Custom Palette',
        semantic: {
          primary: customPrimary,
        },
      })

      expect(palette.id).toBe('custom')
      expect(palette.name).toBe('Custom Palette')
      expect(palette.semantic.primary).toEqual(customPrimary)

      // Check that other defaults are preserved
      expect(palette.semantic.secondary).toBeDefined()
      expect(palette.grayScale.gray500).toBeDefined()
    })

    it('should include metadata with creation timestamp', () => {
      const palette = $ColorPalette.create({
        id: 'test',
        semantic: {},
      })

      expect(palette.metadata).toBeDefined()
      expect(palette.metadata?.createdAt).toBeDefined()
      expect(new Date(palette.metadata!.createdAt!)).toBeInstanceOf(Date)
    })

    it('should allow custom colors', () => {
      const palette = $ColorPalette.create({
        id: 'custom',
        semantic: {},
        custom: {
          accent1: { r: 1, g: 0, b: 0.5 },
          accent2: { r: 0, g: 1, b: 0.5 },
        }
      })

      expect(palette.custom).toBeDefined()
      expect(palette.custom?.accent1).toEqual({ r: 1, g: 0, b: 0.5 })
      expect(palette.custom?.accent2).toEqual({ r: 0, g: 1, b: 0.5 })
    })
  })

  describe('$ColorPalette.getColor', () => {
    it('should get a color by path', () => {
      const palette = $ColorPalette.createDefault()

      const primary = $ColorPalette.getColor(palette, 'semantic.primary')
      expect(primary).toBeDefined()
      expect(primary).toHaveProperty('r')
      expect(primary).toHaveProperty('g')
      expect(primary).toHaveProperty('b')

      const gray500 = $ColorPalette.getColor(palette, 'grayScale.gray500')
      expect(gray500).toBeDefined()
      expect(gray500).toEqual({ r: 0.5, g: 0.5, b: 0.5 })
    })

    it('should return undefined for invalid paths', () => {
      const palette = $ColorPalette.createDefault()

      const nonExistent = $ColorPalette.getColor(palette, 'invalid.path')
      expect(nonExistent).toBeUndefined()

      const partialPath = $ColorPalette.getColor(palette, 'semantic')
      expect(partialPath).toBeUndefined()
    })

    it('should get custom colors', () => {
      const palette = $ColorPalette.create({
        id: 'custom',
        semantic: {},
        custom: {
          myColor: { r: 0.1, g: 0.2, b: 0.3 }
        }
      })

      const customColor = $ColorPalette.getColor(palette, 'custom.myColor')
      expect(customColor).toEqual({ r: 0.1, g: 0.2, b: 0.3 })
    })
  })

  describe('$ColorPalette.merge', () => {
    it('should merge two palettes with override priority', () => {
      const base = $ColorPalette.createDefault()
      const override: Partial<ColorPalette> = {
        semantic: {
          primary: { r: 1, g: 0, b: 0 },
          secondary: { r: 0, g: 1, b: 0 },
        } as any,
        custom: {
          newColor: { r: 0.5, g: 0.5, b: 0.5 }
        }
      }

      const merged = $ColorPalette.merge(base, override)

      // Check overrides
      expect(merged.semantic.primary).toEqual({ r: 1, g: 0, b: 0 })
      expect(merged.semantic.secondary).toEqual({ r: 0, g: 1, b: 0 })

      // Check that non-overridden values are preserved
      expect(merged.semantic.success).toEqual(base.semantic.success)
      expect(merged.grayScale.gray500).toEqual(base.grayScale.gray500)

      // Check custom colors
      expect(merged.custom?.newColor).toEqual({ r: 0.5, g: 0.5, b: 0.5 })
    })

    it('should handle partial semantic overrides', () => {
      const base = $ColorPalette.createDefault()
      const override: Partial<ColorPalette> = {
        semantic: {
          primary: { r: 0.9, g: 0.1, b: 0.1 },
        } as any,
      }

      const merged = $ColorPalette.merge(base, override)

      expect(merged.semantic.primary).toEqual({ r: 0.9, g: 0.1, b: 0.1 })
      expect(merged.semantic.secondary).toEqual(base.semantic.secondary)
    })

    it('should replace brand colors entirely when overridden', () => {
      const base = $ColorPalette.createDefault()
      const override: Partial<ColorPalette> = {
        brand: {
          main: { r: 1, g: 1, b: 0 },
          accent: { r: 0, g: 1, b: 1 },
        }
      }

      const merged = $ColorPalette.merge(base, override)

      expect(merged.brand).toEqual({
        main: { r: 1, g: 1, b: 0 },
        accent: { r: 0, g: 1, b: 1 },
      })
    })
  })
})