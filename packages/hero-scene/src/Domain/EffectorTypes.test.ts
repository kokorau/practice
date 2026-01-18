import { describe, it, expect } from 'vitest'
import {
  // Types
  type EffectorType,
  type EffectorCategory,
  type MaskShapeType,
  // Constants
  EFFECTOR_TYPES,
  MASK_SHAPE_TYPES,
  // Type guards
  isEffectType,
  isMaskType,
  isValidEffectorType,
  isValidMaskShapeType,
  // Utilities
  getEffectorCategory,
  getEffectorDisplayName,
  getMaskShapeDisplayName,
  createEffectorModifier,
} from './EffectorTypes'

describe('EffectorTypes', () => {
  describe('EFFECTOR_TYPES', () => {
    it('should include all effect types and mask', () => {
      expect(EFFECTOR_TYPES).toContain('vignette')
      expect(EFFECTOR_TYPES).toContain('chromaticAberration')
      expect(EFFECTOR_TYPES).toContain('dotHalftone')
      expect(EFFECTOR_TYPES).toContain('lineHalftone')
      expect(EFFECTOR_TYPES).toContain('blur')
      expect(EFFECTOR_TYPES).toContain('mask')
    })

    it('should have correct length', () => {
      expect(EFFECTOR_TYPES.length).toBe(6)
    })
  })

  describe('MASK_SHAPE_TYPES', () => {
    it('should include all mask shape types', () => {
      expect(MASK_SHAPE_TYPES).toContain('circle')
      expect(MASK_SHAPE_TYPES).toContain('rect')
      expect(MASK_SHAPE_TYPES).toContain('blob')
      expect(MASK_SHAPE_TYPES).toContain('perlin')
      expect(MASK_SHAPE_TYPES).toContain('linearGradient')
      expect(MASK_SHAPE_TYPES).toContain('radialGradient')
      expect(MASK_SHAPE_TYPES).toContain('boxGradient')
      expect(MASK_SHAPE_TYPES).toContain('image')
    })

    it('should have correct length', () => {
      expect(MASK_SHAPE_TYPES.length).toBe(8)
    })
  })

  describe('isEffectType', () => {
    it('should return true for effect types', () => {
      expect(isEffectType('vignette')).toBe(true)
      expect(isEffectType('blur')).toBe(true)
      expect(isEffectType('chromaticAberration')).toBe(true)
    })

    it('should return false for mask', () => {
      expect(isEffectType('mask')).toBe(false)
    })
  })

  describe('isMaskType', () => {
    it('should return true for mask', () => {
      expect(isMaskType('mask')).toBe(true)
    })

    it('should return false for effect types', () => {
      expect(isMaskType('vignette')).toBe(false)
      expect(isMaskType('blur')).toBe(false)
    })
  })

  describe('isValidEffectorType', () => {
    it('should return true for valid effector types', () => {
      expect(isValidEffectorType('vignette')).toBe(true)
      expect(isValidEffectorType('mask')).toBe(true)
      expect(isValidEffectorType('blur')).toBe(true)
    })

    it('should return false for invalid types', () => {
      expect(isValidEffectorType('invalid')).toBe(false)
      expect(isValidEffectorType('')).toBe(false)
    })
  })

  describe('isValidMaskShapeType', () => {
    it('should return true for valid mask shape types', () => {
      expect(isValidMaskShapeType('circle')).toBe(true)
      expect(isValidMaskShapeType('rect')).toBe(true)
      expect(isValidMaskShapeType('linearGradient')).toBe(true)
    })

    it('should return false for invalid types', () => {
      expect(isValidMaskShapeType('invalid')).toBe(false)
      expect(isValidMaskShapeType('vignette')).toBe(false)
    })
  })

  describe('getEffectorCategory', () => {
    it('should return color-modification for effect types', () => {
      expect(getEffectorCategory('vignette')).toBe('color-modification')
      expect(getEffectorCategory('blur')).toBe('color-modification')
      expect(getEffectorCategory('chromaticAberration')).toBe('color-modification')
    })

    it('should return transparency-modification for mask', () => {
      expect(getEffectorCategory('mask')).toBe('transparency-modification')
    })
  })

  describe('getEffectorDisplayName', () => {
    it('should return correct display names', () => {
      expect(getEffectorDisplayName('vignette')).toBe('Vignette')
      expect(getEffectorDisplayName('chromaticAberration')).toBe('Chromatic Aberration')
      expect(getEffectorDisplayName('mask')).toBe('Mask')
    })
  })

  describe('getMaskShapeDisplayName', () => {
    it('should return correct display names', () => {
      expect(getMaskShapeDisplayName('circle')).toBe('Circle')
      expect(getMaskShapeDisplayName('linearGradient')).toBe('Linear Gradient')
      expect(getMaskShapeDisplayName('boxGradient')).toBe('Box Gradient')
    })
  })

  describe('createEffectorModifier', () => {
    it('should create SingleEffectConfig for effect types', () => {
      const modifier = createEffectorModifier('vignette')
      expect(modifier.type).toBe('effect')
      // SingleEffectConfig has id and params (not enabled and config)
      expect((modifier as { id: string }).id).toBe('vignette')
      expect((modifier as { params: object }).params).toBeDefined()
      // Should not have legacy format properties
      expect((modifier as { enabled?: boolean }).enabled).toBeUndefined()
    })

    it('should create mask modifier for mask type', () => {
      const modifier = createEffectorModifier('mask')
      expect(modifier.type).toBe('mask')
      expect((modifier as { enabled: boolean }).enabled).toBe(true)
      // Mask modifier has normalized shape format (id and params)
      expect((modifier as { shape: { id: string } }).shape.id).toBe('circle')
    })
  })
})
