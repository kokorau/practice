import { describe, it, expect } from 'vitest'
import { hsvToRgb, rgbToHex } from './colorConversion'

describe('hsvToRgb', () => {
  describe('primary colors', () => {
    it('red (H=0, S=100, V=100) → [255, 0, 0]', () => {
      expect(hsvToRgb(0, 100, 100)).toEqual([255, 0, 0])
    })

    it('green (H=120, S=100, V=100) → [0, 255, 0]', () => {
      expect(hsvToRgb(120, 100, 100)).toEqual([0, 255, 0])
    })

    it('blue (H=240, S=100, V=100) → [0, 0, 255]', () => {
      expect(hsvToRgb(240, 100, 100)).toEqual([0, 0, 255])
    })
  })

  describe('secondary colors', () => {
    it('yellow (H=60, S=100, V=100) → [255, 255, 0]', () => {
      expect(hsvToRgb(60, 100, 100)).toEqual([255, 255, 0])
    })

    it('cyan (H=180, S=100, V=100) → [0, 255, 255]', () => {
      expect(hsvToRgb(180, 100, 100)).toEqual([0, 255, 255])
    })

    it('magenta (H=300, S=100, V=100) → [255, 0, 255]', () => {
      expect(hsvToRgb(300, 100, 100)).toEqual([255, 0, 255])
    })
  })

  describe('grayscale', () => {
    it('white (H=0, S=0, V=100) → [255, 255, 255]', () => {
      expect(hsvToRgb(0, 0, 100)).toEqual([255, 255, 255])
    })

    it('black (H=0, S=0, V=0) → [0, 0, 0]', () => {
      expect(hsvToRgb(0, 0, 0)).toEqual([0, 0, 0])
    })

    it('gray 50% (H=0, S=0, V=50) → [128, 128, 128]', () => {
      expect(hsvToRgb(0, 0, 50)).toEqual([128, 128, 128])
    })
  })

  describe('saturation variations', () => {
    it('desaturated red (H=0, S=50, V=100) → [255, 128, 128]', () => {
      expect(hsvToRgb(0, 50, 100)).toEqual([255, 128, 128])
    })

    it('fully desaturated (H=any, S=0, V=100) → white', () => {
      expect(hsvToRgb(0, 0, 100)).toEqual([255, 255, 255])
      expect(hsvToRgb(120, 0, 100)).toEqual([255, 255, 255])
      expect(hsvToRgb(240, 0, 100)).toEqual([255, 255, 255])
    })
  })

  describe('value variations', () => {
    it('dark red (H=0, S=100, V=50) → [128, 0, 0]', () => {
      expect(hsvToRgb(0, 100, 50)).toEqual([128, 0, 0])
    })

    it('value 0 always produces black regardless of H and S', () => {
      expect(hsvToRgb(0, 100, 0)).toEqual([0, 0, 0])
      expect(hsvToRgb(120, 50, 0)).toEqual([0, 0, 0])
    })
  })

  describe('hue boundary cases', () => {
    it('hue at 359 (almost red)', () => {
      const [r, g, b] = hsvToRgb(359, 100, 100)
      expect(r).toBe(255)
      expect(g).toBe(0)
      expect(b).toBeGreaterThan(0) // slight blue tint
    })

    it('each 60-degree sector', () => {
      // 0-60: red to yellow
      expect(hsvToRgb(30, 100, 100)).toEqual([255, 128, 0])
      // 60-120: yellow to green
      expect(hsvToRgb(90, 100, 100)).toEqual([128, 255, 0])
      // 120-180: green to cyan
      expect(hsvToRgb(150, 100, 100)).toEqual([0, 255, 128])
      // 180-240: cyan to blue
      expect(hsvToRgb(210, 100, 100)).toEqual([0, 128, 255])
      // 240-300: blue to magenta
      expect(hsvToRgb(270, 100, 100)).toEqual([128, 0, 255])
      // 300-360: magenta to red
      expect(hsvToRgb(330, 100, 100)).toEqual([255, 0, 128])
    })
  })
})

describe('rgbToHex', () => {
  describe('primary colors', () => {
    it('[255, 0, 0] → #ff0000', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
    })

    it('[0, 255, 0] → #00ff00', () => {
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00')
    })

    it('[0, 0, 255] → #0000ff', () => {
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff')
    })
  })

  describe('grayscale', () => {
    it('[0, 0, 0] → #000000', () => {
      expect(rgbToHex(0, 0, 0)).toBe('#000000')
    })

    it('[255, 255, 255] → #ffffff', () => {
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
    })

    it('[128, 128, 128] → #808080', () => {
      expect(rgbToHex(128, 128, 128)).toBe('#808080')
    })
  })

  describe('padding', () => {
    it('single digit values are zero-padded', () => {
      expect(rgbToHex(0, 0, 0)).toBe('#000000')
      expect(rgbToHex(1, 2, 3)).toBe('#010203')
      expect(rgbToHex(15, 15, 15)).toBe('#0f0f0f')
    })
  })

  describe('mixed values', () => {
    it('[255, 128, 64] → #ff8040', () => {
      expect(rgbToHex(255, 128, 64)).toBe('#ff8040')
    })

    it('[18, 52, 86] → #123456', () => {
      expect(rgbToHex(18, 52, 86)).toBe('#123456')
    })
  })
})
