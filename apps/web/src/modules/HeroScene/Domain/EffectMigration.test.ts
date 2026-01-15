import { describe, it, expect } from 'vitest'
import {
  migrateLegacyEffectConfig,
  toLegacyEffectConfig,
  hasLegacyEffectConfigs,
  migrateEffectConfigsInModifiers,
  getEffectConfigsFromModifiers,
  isSingleEffectConfig,
  isLegacyEffectFilterConfig,
  createDefaultEffectFilterConfig,
  migrateHeroViewConfig,
  configNeedsMigration,
  type SingleEffectConfig,
  type EffectFilterConfig,
  type MaskProcessorConfig,
  type ProcessorConfig,
  type HeroViewConfig,
  type ProcessorNodeConfig,
} from './index'

describe('Effect Config Migration', () => {
  describe('isSingleEffectConfig', () => {
    it('should return true for new format effect config', () => {
      const config: SingleEffectConfig = {
        type: 'effect',
        id: 'blur',
        params: { radius: 8 },
      }
      expect(isSingleEffectConfig(config)).toBe(true)
    })

    it('should return false for legacy format effect config', () => {
      const config = createDefaultEffectFilterConfig()
      expect(isSingleEffectConfig(config)).toBe(false)
    })

    it('should return false for mask config', () => {
      const config: MaskProcessorConfig = {
        type: 'mask',
        enabled: true,
        shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
        invert: false,
        feather: 0,
      }
      expect(isSingleEffectConfig(config)).toBe(false)
    })
  })

  describe('isLegacyEffectFilterConfig', () => {
    it('should return true for legacy format effect config', () => {
      const config = createDefaultEffectFilterConfig()
      expect(isLegacyEffectFilterConfig(config)).toBe(true)
    })

    it('should return false for new format effect config', () => {
      const config: SingleEffectConfig = {
        type: 'effect',
        id: 'blur',
        params: { radius: 8 },
      }
      expect(isLegacyEffectFilterConfig(config)).toBe(false)
    })

    it('should return false for mask config', () => {
      const config: MaskProcessorConfig = {
        type: 'mask',
        enabled: true,
        shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
        invert: false,
        feather: 0,
      }
      expect(isLegacyEffectFilterConfig(config)).toBe(false)
    })
  })

  describe('migrateLegacyEffectConfig', () => {
    it('should return empty array for disabled legacy config', () => {
      const legacy: EffectFilterConfig = {
        type: 'effect',
        enabled: false,
        config: createDefaultEffectFilterConfig().config,
      }
      const result = migrateLegacyEffectConfig(legacy)
      expect(result).toEqual([])
    })

    it('should return empty array when no effects are enabled', () => {
      const legacy = createDefaultEffectFilterConfig()
      legacy.enabled = true
      // All effects have enabled: false by default
      const result = migrateLegacyEffectConfig(legacy)
      expect(result).toEqual([])
    })

    it('should migrate single enabled effect', () => {
      const legacy = createDefaultEffectFilterConfig()
      legacy.enabled = true
      legacy.config.blur = { enabled: true, radius: 12 }

      const result = migrateLegacyEffectConfig(legacy)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        type: 'effect',
        id: 'blur',
        params: { radius: 12 },
      })
    })

    it('should migrate multiple enabled effects', () => {
      const legacy = createDefaultEffectFilterConfig()
      legacy.enabled = true
      legacy.config.blur = { enabled: true, radius: 8 }
      legacy.config.chromaticAberration = { enabled: true, intensity: 5 }

      const result = migrateLegacyEffectConfig(legacy)
      expect(result).toHaveLength(2)
      expect(result.find((e) => e.id === 'blur')).toBeDefined()
      expect(result.find((e) => e.id === 'chromaticAberration')).toBeDefined()
    })

    it('should not include enabled property in params', () => {
      const legacy = createDefaultEffectFilterConfig()
      legacy.enabled = true
      legacy.config.blur = { enabled: true, radius: 10 }

      const result = migrateLegacyEffectConfig(legacy)
      expect(result[0]?.params).not.toHaveProperty('enabled')
      expect(result[0]?.params).toEqual({ radius: 10 })
    })
  })

  describe('toLegacyEffectConfig', () => {
    it('should create disabled legacy config for empty effects array', () => {
      const defaultConfig = createDefaultEffectFilterConfig().config
      const result = toLegacyEffectConfig([], defaultConfig)

      expect(result.enabled).toBe(false)
      expect(result.config.blur.enabled).toBe(false)
    })

    it('should enable specified effect in legacy config', () => {
      const effects: SingleEffectConfig[] = [
        { type: 'effect', id: 'blur', params: { radius: 15 } },
      ]
      const defaultConfig = createDefaultEffectFilterConfig().config

      const result = toLegacyEffectConfig(effects, defaultConfig)

      expect(result.enabled).toBe(true)
      expect(result.config.blur.enabled).toBe(true)
      expect(result.config.blur.radius).toBe(15)
      expect(result.config.chromaticAberration.enabled).toBe(false)
    })

    it('should handle multiple effects', () => {
      const effects: SingleEffectConfig[] = [
        { type: 'effect', id: 'blur', params: { radius: 8 } },
        { type: 'effect', id: 'chromaticAberration', params: { intensity: 10 } },
      ]
      const defaultConfig = createDefaultEffectFilterConfig().config

      const result = toLegacyEffectConfig(effects, defaultConfig)

      expect(result.enabled).toBe(true)
      expect(result.config.blur.enabled).toBe(true)
      expect(result.config.chromaticAberration.enabled).toBe(true)
      expect(result.config.dotHalftone.enabled).toBe(false)
    })
  })

  describe('hasLegacyEffectConfigs', () => {
    it('should return true if array contains legacy effect config', () => {
      const configs: ProcessorConfig[] = [
        createDefaultEffectFilterConfig(),
        {
          type: 'mask',
          enabled: true,
          shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
          invert: false,
          feather: 0,
        },
      ]
      expect(hasLegacyEffectConfigs(configs)).toBe(true)
    })

    it('should return false if array contains only new format configs', () => {
      const configs: ProcessorConfig[] = [
        { type: 'effect', id: 'blur', params: { radius: 8 } },
        {
          type: 'mask',
          enabled: true,
          shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
          invert: false,
          feather: 0,
        },
      ]
      expect(hasLegacyEffectConfigs(configs)).toBe(false)
    })

    it('should return false for empty array', () => {
      expect(hasLegacyEffectConfigs([])).toBe(false)
    })
  })

  describe('migrateEffectConfigsInModifiers', () => {
    it('should migrate legacy effect configs to new format', () => {
      const legacy = createDefaultEffectFilterConfig()
      legacy.enabled = true
      legacy.config.blur = { enabled: true, radius: 10 }

      const modifiers: ProcessorConfig[] = [
        legacy,
        {
          type: 'mask',
          enabled: true,
          shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
          invert: false,
          feather: 0,
        },
      ]

      const result = migrateEffectConfigsInModifiers(modifiers)

      expect(result).toHaveLength(2)
      expect(isSingleEffectConfig(result[0]!)).toBe(true)
      expect((result[0] as SingleEffectConfig).id).toBe('blur')
      expect(result[1]?.type).toBe('mask')
    })

    it('should preserve already migrated configs', () => {
      const newConfig: SingleEffectConfig = { type: 'effect', id: 'blur', params: { radius: 8 } }
      const modifiers: ProcessorConfig[] = [newConfig]

      const result = migrateEffectConfigsInModifiers(modifiers)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(newConfig)
    })

    it('should handle mixed old and new configs', () => {
      const legacy = createDefaultEffectFilterConfig()
      legacy.enabled = true
      legacy.config.chromaticAberration = { enabled: true, intensity: 5 }

      const newConfig: SingleEffectConfig = { type: 'effect', id: 'blur', params: { radius: 8 } }
      const mask: MaskProcessorConfig = {
        type: 'mask',
        enabled: true,
        shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
        invert: false,
        feather: 0,
      }

      const modifiers: ProcessorConfig[] = [legacy, newConfig, mask]

      const result = migrateEffectConfigsInModifiers(modifiers)

      // Legacy config with chromatic aberration should migrate to new format
      // newConfig should be preserved as-is
      // mask should be preserved
      expect(result).toHaveLength(3)
      expect(result.filter((m) => m.type === 'effect')).toHaveLength(2)
      expect(result.filter((m) => m.type === 'mask')).toHaveLength(1)
    })
  })

  describe('getEffectConfigsFromModifiers', () => {
    it('should return new format configs as-is', () => {
      const effect1: SingleEffectConfig = { type: 'effect', id: 'blur', params: { radius: 8 } }
      const effect2: SingleEffectConfig = { type: 'effect', id: 'vignette', params: { intensity: 0.5 } }
      const mask: MaskProcessorConfig = {
        type: 'mask',
        enabled: true,
        shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
        invert: false,
        feather: 0,
      }

      const modifiers: ProcessorConfig[] = [effect1, mask, effect2]

      const result = getEffectConfigsFromModifiers(modifiers)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(effect1)
      expect(result[1]).toEqual(effect2)
    })

    it('should convert legacy format configs', () => {
      const legacy = createDefaultEffectFilterConfig()
      legacy.enabled = true
      legacy.config.blur = { enabled: true, radius: 12 }

      const modifiers: ProcessorConfig[] = [legacy]

      const result = getEffectConfigsFromModifiers(modifiers)

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('blur')
      expect(result[0]?.params).toEqual({ radius: 12 })
    })

    it('should handle mixed formats', () => {
      const legacy = createDefaultEffectFilterConfig()
      legacy.enabled = true
      legacy.config.chromaticAberration = { enabled: true, intensity: 3 }

      const newConfig: SingleEffectConfig = { type: 'effect', id: 'blur', params: { radius: 8 } }
      const modifiers: ProcessorConfig[] = [legacy, newConfig]

      const result = getEffectConfigsFromModifiers(modifiers)

      expect(result).toHaveLength(2)
      expect(result.map((e) => e.id).sort()).toEqual(['blur', 'chromaticAberration'])
    })
  })

  describe('Round-trip conversion', () => {
    it('should preserve effect params through migration and back', () => {
      const legacy = createDefaultEffectFilterConfig()
      legacy.enabled = true
      legacy.config.blur = { enabled: true, radius: 15 }

      // Migrate to new format
      const newFormat = migrateLegacyEffectConfig(legacy)

      // Convert back to legacy
      const backToLegacy = toLegacyEffectConfig(newFormat, createDefaultEffectFilterConfig().config)

      // Check blur params are preserved
      expect(backToLegacy.config.blur.enabled).toBe(true)
      expect(backToLegacy.config.blur.radius).toBe(15)
    })
  })

  describe('configNeedsMigration', () => {
    it('should return false for config without legacy effects', () => {
      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          background: { primary: 'B', secondary: 'auto' },
          mask: { primary: 'auto', secondary: 'auto' },
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
        layers: [
          {
            type: 'base',
            id: 'base',
            name: 'Background',
            visible: true,
            surface: { type: 'solid' },
          },
        ],
        foreground: { elements: [] },
      }

      expect(configNeedsMigration(config)).toBe(false)
    })

    it('should return true for config with legacy effects in processor', () => {
      const legacyEffect = createDefaultEffectFilterConfig()
      legacyEffect.enabled = true
      legacyEffect.config.blur = { enabled: true, radius: 8 }

      const processor: ProcessorNodeConfig = {
        type: 'processor',
        id: 'processor-1',
        name: 'Effect Processor',
        visible: true,
        modifiers: [legacyEffect],
      }

      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          background: { primary: 'B', secondary: 'auto' },
          mask: { primary: 'auto', secondary: 'auto' },
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
        layers: [processor],
        foreground: { elements: [] },
      }

      expect(configNeedsMigration(config)).toBe(true)
    })

    it('should return false for config with only new format effects', () => {
      const newEffect: SingleEffectConfig = { type: 'effect', id: 'blur', params: { radius: 8 } }

      const processor: ProcessorNodeConfig = {
        type: 'processor',
        id: 'processor-1',
        name: 'Effect Processor',
        visible: true,
        modifiers: [newEffect],
      }

      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          background: { primary: 'B', secondary: 'auto' },
          mask: { primary: 'auto', secondary: 'auto' },
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
        layers: [processor],
        foreground: { elements: [] },
      }

      expect(configNeedsMigration(config)).toBe(false)
    })
  })

  describe('migrateHeroViewConfig', () => {
    it('should migrate legacy effects in processor nodes', () => {
      const legacyEffect = createDefaultEffectFilterConfig()
      legacyEffect.enabled = true
      legacyEffect.config.blur = { enabled: true, radius: 12 }
      legacyEffect.config.vignette = {
        enabled: true,
        shape: 'ellipse',
        intensity: 0.5,
        softness: 0.4,
        color: [0, 0, 0, 1],
        radius: 0.8,
        centerX: 0.5,
        centerY: 0.5,
        aspectRatio: 1,
      }

      const processor: ProcessorNodeConfig = {
        type: 'processor',
        id: 'processor-1',
        name: 'Effect Processor',
        visible: true,
        modifiers: [legacyEffect],
      }

      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          background: { primary: 'B', secondary: 'auto' },
          mask: { primary: 'auto', secondary: 'auto' },
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
        layers: [processor],
        foreground: { elements: [] },
      }

      const migrated = migrateHeroViewConfig(config)

      // Should have converted to new format
      expect(configNeedsMigration(migrated)).toBe(false)

      // Check the processor has SingleEffectConfig entries
      const migratedProcessor = migrated.layers[0] as ProcessorNodeConfig
      expect(migratedProcessor.modifiers).toHaveLength(2) // blur + vignette

      const blurEffect = migratedProcessor.modifiers.find(
        (m) => isSingleEffectConfig(m) && m.id === 'blur'
      ) as SingleEffectConfig
      expect(blurEffect).toBeDefined()
      expect(blurEffect.params).toEqual({ radius: 12 })

      const vignetteEffect = migratedProcessor.modifiers.find(
        (m) => isSingleEffectConfig(m) && m.id === 'vignette'
      ) as SingleEffectConfig
      expect(vignetteEffect).toBeDefined()
      expect(vignetteEffect.params.intensity).toBe(0.5)
    })

    it('should preserve non-effect modifiers', () => {
      const legacyEffect = createDefaultEffectFilterConfig()
      legacyEffect.enabled = true
      legacyEffect.config.blur = { enabled: true, radius: 8 }

      const mask: MaskProcessorConfig = {
        type: 'mask',
        enabled: true,
        shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: true },
        invert: false,
        feather: 0,
      }

      const processor: ProcessorNodeConfig = {
        type: 'processor',
        id: 'processor-1',
        name: 'Effect Processor',
        visible: true,
        modifiers: [legacyEffect, mask],
      }

      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          background: { primary: 'B', secondary: 'auto' },
          mask: { primary: 'auto', secondary: 'auto' },
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
        layers: [processor],
        foreground: { elements: [] },
      }

      const migrated = migrateHeroViewConfig(config)

      const migratedProcessor = migrated.layers[0] as ProcessorNodeConfig
      expect(migratedProcessor.modifiers).toHaveLength(2) // blur + mask

      // Mask should be preserved
      const maskMod = migratedProcessor.modifiers.find((m) => m.type === 'mask') as MaskProcessorConfig
      expect(maskMod).toBeDefined()
      expect(maskMod.shape.type).toBe('circle')
    })

    it('should handle nested groups recursively', () => {
      const legacyEffect = createDefaultEffectFilterConfig()
      legacyEffect.enabled = true
      legacyEffect.config.chromaticAberration = { enabled: true, intensity: 5 }

      const processor: ProcessorNodeConfig = {
        type: 'processor',
        id: 'processor-1',
        name: 'Effect Processor',
        visible: true,
        modifiers: [legacyEffect],
      }

      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          background: { primary: 'B', secondary: 'auto' },
          mask: { primary: 'auto', secondary: 'auto' },
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
        layers: [
          {
            type: 'group',
            id: 'group-1',
            name: 'Group',
            visible: true,
            children: [processor],
          },
        ],
        foreground: { elements: [] },
      }

      const migrated = migrateHeroViewConfig(config)

      // Should have migrated effects in nested processor
      expect(configNeedsMigration(migrated)).toBe(false)
    })

    it('should not modify config without legacy effects', () => {
      const newEffect: SingleEffectConfig = { type: 'effect', id: 'blur', params: { radius: 8 } }

      const processor: ProcessorNodeConfig = {
        type: 'processor',
        id: 'processor-1',
        name: 'Effect Processor',
        visible: true,
        modifiers: [newEffect],
      }

      const config: HeroViewConfig = {
        viewport: { width: 1280, height: 720 },
        colors: {
          background: { primary: 'B', secondary: 'auto' },
          mask: { primary: 'auto', secondary: 'auto' },
          semanticContext: 'canvas',
          brand: { hue: 198, saturation: 70, value: 65 },
          accent: { hue: 30, saturation: 80, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 97 },
        },
        layers: [processor],
        foreground: { elements: [] },
      }

      const migrated = migrateHeroViewConfig(config)

      const migratedProcessor = migrated.layers[0] as ProcessorNodeConfig
      expect(migratedProcessor.modifiers).toHaveLength(1)
      expect(migratedProcessor.modifiers[0]).toEqual(newEffect)
    })
  })
})
