import { describe, it, expect } from 'vitest'
import { hslToRgb, rgbToHsl, hueDifference } from './colors'

describe('hslToRgb', () => {
  it('should convert red correctly', () => {
    const result = hslToRgb(0, 1, 0.5)
    expect(result.r).toBe(255)
    expect(result.g).toBe(0)
    expect(result.b).toBe(0)
  })

  it('should convert green correctly', () => {
    const result = hslToRgb(120, 1, 0.5)
    expect(result.r).toBe(0)
    expect(result.g).toBe(255)
    expect(result.b).toBe(0)
  })

  it('should convert blue correctly', () => {
    const result = hslToRgb(240, 1, 0.5)
    expect(result.r).toBe(0)
    expect(result.g).toBe(0)
    expect(result.b).toBe(255)
  })

  it('should convert white correctly', () => {
    const result = hslToRgb(0, 0, 1)
    expect(result.r).toBe(255)
    expect(result.g).toBe(255)
    expect(result.b).toBe(255)
  })

  it('should convert black correctly', () => {
    const result = hslToRgb(0, 0, 0)
    expect(result.r).toBe(0)
    expect(result.g).toBe(0)
    expect(result.b).toBe(0)
  })

  it('should convert gray correctly', () => {
    const result = hslToRgb(0, 0, 0.5)
    expect(result.r).toBe(128)
    expect(result.g).toBe(128)
    expect(result.b).toBe(128)
  })

  it('should handle hue wrapping at 360', () => {
    const result360 = hslToRgb(360, 1, 0.5)
    const result0 = hslToRgb(0, 1, 0.5)
    expect(result360.r).toBe(result0.r)
    expect(result360.g).toBe(result0.g)
    expect(result360.b).toBe(result0.b)
  })
})

describe('rgbToHsl', () => {
  it('should convert red correctly', () => {
    const result = rgbToHsl(255, 0, 0)
    expect(result.h).toBe(0)
    expect(result.s).toBe(1)
    expect(result.l).toBe(0.5)
  })

  it('should convert green correctly', () => {
    const result = rgbToHsl(0, 255, 0)
    expect(result.h).toBe(120)
    expect(result.s).toBe(1)
    expect(result.l).toBe(0.5)
  })

  it('should convert blue correctly', () => {
    const result = rgbToHsl(0, 0, 255)
    expect(result.h).toBe(240)
    expect(result.s).toBe(1)
    expect(result.l).toBe(0.5)
  })

  it('should convert white correctly', () => {
    const result = rgbToHsl(255, 255, 255)
    expect(result.l).toBe(1)
    expect(result.s).toBe(0)
  })

  it('should convert black correctly', () => {
    const result = rgbToHsl(0, 0, 0)
    expect(result.l).toBe(0)
    expect(result.s).toBe(0)
  })

  it('should round-trip RGB -> HSL -> RGB', () => {
    const original = { r: 100, g: 150, b: 200 }
    const hsl = rgbToHsl(original.r, original.g, original.b)
    const back = hslToRgb(hsl.h, hsl.s, hsl.l)

    expect(Math.abs(back.r - original.r)).toBeLessThanOrEqual(1)
    expect(Math.abs(back.g - original.g)).toBeLessThanOrEqual(1)
    expect(Math.abs(back.b - original.b)).toBeLessThanOrEqual(1)
  })
})

describe('hueDifference', () => {
  it('should return 0 for same hue', () => {
    expect(hueDifference(0, 0)).toBe(0)
    expect(hueDifference(180, 180)).toBe(0)
  })

  it('should return correct difference for simple cases', () => {
    expect(hueDifference(0, 30)).toBe(30)
    expect(hueDifference(30, 0)).toBe(30)
  })

  it('should handle wrap-around correctly', () => {
    expect(hueDifference(0, 350)).toBe(10)
    expect(hueDifference(350, 0)).toBe(10)
    expect(hueDifference(10, 350)).toBe(20)
  })

  it('should return maximum 180', () => {
    expect(hueDifference(0, 180)).toBe(180)
    expect(hueDifference(180, 0)).toBe(180)
  })

  it('should handle opposite sides of color wheel', () => {
    expect(hueDifference(0, 200)).toBe(160)
    expect(hueDifference(200, 0)).toBe(160)
  })
})
