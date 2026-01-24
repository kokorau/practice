/**
 * resolvePropertyValue tests
 */

import { describe, it, expect } from 'vitest'
import { $PropertyValue } from '../../Domain/SectionVisual'
import {
  resolvePropertyValueToNumber,
  resolvePropertyValueToString,
  resolvePropertyValueToBoolean,
  resolvePropertyValue,
  resolveParams,
  DEFAULT_INTENSITY_PROVIDER,
  type IntensityProvider,
} from './resolvePropertyValue'

// ============================================================
// resolvePropertyValueToNumber
// ============================================================

describe('resolvePropertyValueToNumber', () => {
  describe('static values', () => {
    it('should resolve static number value', () => {
      const prop = $PropertyValue.static(42)
      expect(resolvePropertyValueToNumber(prop)).toBe(42)
    })

    it('should resolve static float value', () => {
      const prop = $PropertyValue.static(3.14)
      expect(resolvePropertyValueToNumber(prop)).toBeCloseTo(3.14)
    })

    it('should resolve static numeric string', () => {
      const prop = $PropertyValue.static('123')
      expect(resolvePropertyValueToNumber(prop)).toBe(123)
    })

    it('should return 0 for non-numeric string', () => {
      const prop = $PropertyValue.static('hello')
      expect(resolvePropertyValueToNumber(prop)).toBe(0)
    })

    it('should return 0 for boolean', () => {
      const propTrue = $PropertyValue.static(true)
      const propFalse = $PropertyValue.static(false)
      expect(resolvePropertyValueToNumber(propTrue)).toBe(0)
      expect(resolvePropertyValueToNumber(propFalse)).toBe(0)
    })
  })

  describe('range values', () => {
    it('should interpolate at intensity 0', () => {
      const prop = $PropertyValue.range('track-1', 10, 30)
      const provider: IntensityProvider = () => 0
      expect(resolvePropertyValueToNumber(prop, provider)).toBe(10)
    })

    it('should interpolate at intensity 1', () => {
      const prop = $PropertyValue.range('track-1', 10, 30)
      const provider: IntensityProvider = () => 1
      expect(resolvePropertyValueToNumber(prop, provider)).toBe(30)
    })

    it('should interpolate at intensity 0.5', () => {
      const prop = $PropertyValue.range('track-1', 10, 30)
      const provider: IntensityProvider = () => 0.5
      expect(resolvePropertyValueToNumber(prop, provider)).toBe(20)
    })

    it('should use correct track ID', () => {
      const prop = $PropertyValue.range('my-track', 0, 100)
      const provider: IntensityProvider = (trackId) => trackId === 'my-track' ? 0.25 : 0
      expect(resolvePropertyValueToNumber(prop, provider)).toBe(25)
    })

    it('should clamp intensity when clamp is true', () => {
      const prop = { type: 'binding' as const, trackId: 'track', min: 0, max: 100, clamp: true }
      const overProvider: IntensityProvider = () => 1.5
      const underProvider: IntensityProvider = () => -0.5
      expect(resolvePropertyValueToNumber(prop, overProvider)).toBe(100)
      expect(resolvePropertyValueToNumber(prop, underProvider)).toBe(0)
    })

    it('should not clamp intensity when clamp is false', () => {
      const prop = { type: 'binding' as const, trackId: 'track', min: 0, max: 100, clamp: false }
      const overProvider: IntensityProvider = () => 1.5
      expect(resolvePropertyValueToNumber(prop, overProvider)).toBe(150)
    })

    it('should use DEFAULT_INTENSITY_PROVIDER when not provided', () => {
      const prop = $PropertyValue.range('track', 10, 30)
      // DEFAULT_INTENSITY_PROVIDER returns 0
      expect(resolvePropertyValueToNumber(prop)).toBe(10)
    })
  })
})

// ============================================================
// resolvePropertyValueToString
// ============================================================

describe('resolvePropertyValueToString', () => {
  it('should resolve static string', () => {
    const prop = $PropertyValue.static('hello')
    expect(resolvePropertyValueToString(prop)).toBe('hello')
  })

  it('should resolve static number as string', () => {
    const prop = $PropertyValue.static(42)
    expect(resolvePropertyValueToString(prop)).toBe('42')
  })

  it('should resolve static boolean as string', () => {
    expect(resolvePropertyValueToString($PropertyValue.static(true))).toBe('true')
    expect(resolvePropertyValueToString($PropertyValue.static(false))).toBe('false')
  })

  it('should resolve range as interpolated string', () => {
    const prop = $PropertyValue.range('track', 10, 30)
    const provider: IntensityProvider = () => 0.5
    expect(resolvePropertyValueToString(prop, provider)).toBe('20')
  })
})

// ============================================================
// resolvePropertyValueToBoolean
// ============================================================

describe('resolvePropertyValueToBoolean', () => {
  describe('static values', () => {
    it('should resolve static boolean true', () => {
      const prop = $PropertyValue.static(true)
      expect(resolvePropertyValueToBoolean(prop)).toBe(true)
    })

    it('should resolve static boolean false', () => {
      const prop = $PropertyValue.static(false)
      expect(resolvePropertyValueToBoolean(prop)).toBe(false)
    })

    it('should resolve number > 0.5 as true', () => {
      expect(resolvePropertyValueToBoolean($PropertyValue.static(0.6))).toBe(true)
      expect(resolvePropertyValueToBoolean($PropertyValue.static(1))).toBe(true)
    })

    it('should resolve number <= 0.5 as false', () => {
      expect(resolvePropertyValueToBoolean($PropertyValue.static(0.5))).toBe(false)
      expect(resolvePropertyValueToBoolean($PropertyValue.static(0))).toBe(false)
    })

    it('should resolve string "true" as true', () => {
      expect(resolvePropertyValueToBoolean($PropertyValue.static('true'))).toBe(true)
    })

    it('should resolve string "1" as true', () => {
      expect(resolvePropertyValueToBoolean($PropertyValue.static('1'))).toBe(true)
    })

    it('should resolve other strings as false', () => {
      expect(resolvePropertyValueToBoolean($PropertyValue.static('false'))).toBe(false)
      expect(resolvePropertyValueToBoolean($PropertyValue.static('hello'))).toBe(false)
    })
  })

  describe('range values', () => {
    it('should return true when interpolated > 0.5', () => {
      const prop = $PropertyValue.range('track', 0, 1)
      const provider: IntensityProvider = () => 0.6
      expect(resolvePropertyValueToBoolean(prop, provider)).toBe(true)
    })

    it('should return false when interpolated <= 0.5', () => {
      const prop = $PropertyValue.range('track', 0, 1)
      const provider: IntensityProvider = () => 0.4
      expect(resolvePropertyValueToBoolean(prop, provider)).toBe(false)
    })
  })
})

// ============================================================
// resolvePropertyValue
// ============================================================

describe('resolvePropertyValue', () => {
  it('should return static value directly', () => {
    expect(resolvePropertyValue($PropertyValue.static(42))).toBe(42)
    expect(resolvePropertyValue($PropertyValue.static('hello'))).toBe('hello')
    expect(resolvePropertyValue($PropertyValue.static(true))).toBe(true)
  })

  it('should resolve range to number', () => {
    const prop = $PropertyValue.range('track', 10, 30)
    const provider: IntensityProvider = () => 0.5
    expect(resolvePropertyValue(prop, provider)).toBe(20)
  })
})

// ============================================================
// resolveParams
// ============================================================

describe('resolveParams', () => {
  it('should resolve all static params', () => {
    const params = {
      width: $PropertyValue.static(100),
      height: $PropertyValue.static(50),
      enabled: $PropertyValue.static(true),
      label: $PropertyValue.static('test'),
    }

    const resolved = resolveParams(params)

    expect(resolved.width).toBe(100)
    expect(resolved.height).toBe(50)
    expect(resolved.enabled).toBe(true)
    expect(resolved.label).toBe('test')
  })

  it('should resolve mixed static and range params', () => {
    const params = {
      width: $PropertyValue.static(100),
      opacity: $PropertyValue.range('fade-track', 0, 1),
    }

    const provider: IntensityProvider = (trackId) => trackId === 'fade-track' ? 0.75 : 0

    const resolved = resolveParams(params, provider)

    expect(resolved.width).toBe(100)
    expect(resolved.opacity).toBe(0.75)
  })

  it('should return empty object for empty params', () => {
    const resolved = resolveParams({})
    expect(resolved).toEqual({})
  })

  it('should use DEFAULT_INTENSITY_PROVIDER when not provided', () => {
    const params = {
      value: $PropertyValue.range('track', 10, 30),
    }

    // DEFAULT_INTENSITY_PROVIDER returns 0
    const resolved = resolveParams(params)
    expect(resolved.value).toBe(10)
  })
})

// ============================================================
// DEFAULT_INTENSITY_PROVIDER
// ============================================================

describe('DEFAULT_INTENSITY_PROVIDER', () => {
  it('should always return 0', () => {
    expect(DEFAULT_INTENSITY_PROVIDER('any-track')).toBe(0)
    expect(DEFAULT_INTENSITY_PROVIDER('')).toBe(0)
    expect(DEFAULT_INTENSITY_PROVIDER('track-123')).toBe(0)
  })
})
