import { describe, it, expect } from 'vitest'
import { $AutoCorrectionStats, type ImageDataLike } from './AutoCorrectionStats'

describe('$AutoCorrectionStats', () => {
  // テスト用画像データ生成ヘルパー
  const createImageData = (
    type: 'dark' | 'bright' | 'normal' | 'lowContrast' | 'colorful' | 'neutral'
  ): ImageDataLike => {
    const width = 64
    const height = 64
    const data = new Uint8ClampedArray(width * height * 4)

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4
      let r: number, g: number, b: number

      switch (type) {
        case 'dark':
          // 暗い画像 (p50 ≈ 0.2)
          r = g = b = Math.floor(Math.random() * 80 + 20)
          break
        case 'bright':
          // 明るい画像 (p50 ≈ 0.8)
          r = g = b = Math.floor(Math.random() * 60 + 180)
          break
        case 'normal':
          // 通常画像 (p50 ≈ 0.45)
          r = g = b = Math.floor(Math.random() * 100 + 70)
          break
        case 'lowContrast':
          // 低コントラスト (狭い範囲)
          r = g = b = Math.floor(Math.random() * 50 + 100)
          break
        case 'colorful':
          // カラフル (彩度高い)
          r = Math.floor(Math.random() * 200 + 55)
          g = Math.floor(Math.random() * 100)
          b = Math.floor(Math.random() * 100)
          break
        case 'neutral':
          // 無彩色が多い
          const gray = Math.floor(Math.random() * 150 + 50)
          const variance = Math.floor(Math.random() * 10 - 5)
          r = gray + variance
          g = gray + variance
          b = gray + variance
          break
      }

      data[idx] = Math.max(0, Math.min(255, r))
      data[idx + 1] = Math.max(0, Math.min(255, g))
      data[idx + 2] = Math.max(0, Math.min(255, b))
      data[idx + 3] = 255
    }

    return { data, width, height }
  }

  describe('analyze', () => {
    it('暗い画像の p50 は低い', () => {
      const imageData = createImageData('dark')
      const stats = $AutoCorrectionStats.analyze(imageData)

      expect(stats.luminance.p50).toBeLessThan(0.4)
      expect(stats.classification.isLowKey).toBe(true)
    })

    it('明るい画像の p50 は高い', () => {
      const imageData = createImageData('bright')
      const stats = $AutoCorrectionStats.analyze(imageData)

      expect(stats.luminance.p50).toBeGreaterThan(0.6)
      expect(stats.classification.isHighKey).toBe(true)
    })

    it('通常画像は中間', () => {
      const imageData = createImageData('normal')
      const stats = $AutoCorrectionStats.analyze(imageData)

      expect(stats.luminance.p50).toBeGreaterThan(0.3)
      expect(stats.luminance.p50).toBeLessThan(0.7)
      expect(stats.classification.isLowKey).toBe(false)
      expect(stats.classification.isHighKey).toBe(false)
    })

    it('低コントラスト画像の range は小さい', () => {
      const imageData = createImageData('lowContrast')
      const stats = $AutoCorrectionStats.analyze(imageData)

      expect(stats.luminance.range).toBeLessThan(0.4)
      expect(stats.classification.isLowContrast).toBe(true)
    })

    it('カラフルな画像は彩度が高い', () => {
      const imageData = createImageData('colorful')
      const stats = $AutoCorrectionStats.analyze(imageData)

      expect(stats.saturation.meanProxy).toBeGreaterThan(0.2)
      expect(stats.saturation.p95Proxy).toBeGreaterThan(0.3)
    })

    it('無彩色画像は neutral 候補が多い', () => {
      const imageData = createImageData('neutral')
      const stats = $AutoCorrectionStats.analyze(imageData)

      expect(stats.neutral.ratio).toBeGreaterThan(0.3)
      expect(stats.neutral.confidence).not.toBe('none')
    })
  })

  describe('computeNeutralStats', () => {
    it('候補がゼロの場合はデフォルト値を返す', () => {
      const stats = $AutoCorrectionStats.computeNeutralStats([], 1000)

      expect(stats.count).toBe(0)
      expect(stats.ratio).toBe(0)
      expect(stats.medianRGB).toEqual([1, 1, 1])
      expect(stats.confidence).toBe('none')
    })

    it('候補が多いと confidence が high', () => {
      const candidates = Array(100).fill(null).map(() => ({
        r: 0.5, g: 0.5, b: 0.5
      }))
      const stats = $AutoCorrectionStats.computeNeutralStats(candidates, 1000)

      expect(stats.ratio).toBe(0.1)
      expect(stats.confidence).toBe('high')
    })

    it('RGB の中央値を正しく計算', () => {
      const candidates = [
        { r: 0.1, g: 0.2, b: 0.3 },
        { r: 0.5, g: 0.5, b: 0.5 },
        { r: 0.9, g: 0.8, b: 0.7 },
      ]
      const stats = $AutoCorrectionStats.computeNeutralStats(candidates, 100)

      // 中央値は2番目の要素
      expect(stats.medianRGB[0]).toBeCloseTo(0.5, 2)
      expect(stats.medianRGB[1]).toBeCloseTo(0.5, 2)
      expect(stats.medianRGB[2]).toBeCloseTo(0.5, 2)
    })
  })

  describe('classify', () => {
    it('ローキーを検出', () => {
      const luminance = {
        p01: 0.01, p10: 0.05, p50: 0.2, p90: 0.4, p99: 0.5,
        clipBlack: 0.01, clipWhite: 0, range: 0.35, midRatio: 0.3,
      }
      const classification = $AutoCorrectionStats.classify(luminance)

      expect(classification.isLowKey).toBe(true)
      expect(classification.isHighKey).toBe(false)
    })

    it('ハイキーを検出', () => {
      const luminance = {
        p01: 0.4, p10: 0.5, p50: 0.8, p90: 0.95, p99: 0.99,
        clipBlack: 0, clipWhite: 0.01, range: 0.45, midRatio: 0.3,
      }
      const classification = $AutoCorrectionStats.classify(luminance)

      expect(classification.isHighKey).toBe(true)
      expect(classification.isLowKey).toBe(false)
    })

    it('極端なシーンを検出', () => {
      const luminance = {
        p01: 0.01, p10: 0.02, p50: 0.1, p90: 0.95, p99: 0.99,
        clipBlack: 0.05, clipWhite: 0.05, range: 0.93, midRatio: 0.1,
      }
      const classification = $AutoCorrectionStats.classify(luminance)

      expect(classification.isExtremeScene).toBe(true)
      expect(classification.hasSignificantClipping).toBe(true)
    })
  })

  describe('analyzeFromHistogram', () => {
    it('ヒストグラムから輝度統計と分類を計算', () => {
      // 中央付近に集中したヒストグラム
      const hist = new Uint32Array(256)
      for (let i = 100; i < 150; i++) {
        hist[i] = 100
      }

      const { luminance, classification } = $AutoCorrectionStats.analyzeFromHistogram(hist)

      expect(luminance.p50).toBeGreaterThan(0.4)
      expect(luminance.p50).toBeLessThan(0.6)
      expect(luminance.range).toBeLessThan(0.3)
      expect(classification.isLowContrast).toBe(true)
    })
  })

  describe('empty', () => {
    it('空の Stats を生成', () => {
      const stats = $AutoCorrectionStats.empty()

      expect(stats.luminance.p50).toBe(0.5)
      expect(stats.neutral.count).toBe(0)
      expect(stats.saturation.meanProxy).toBe(0)
      expect(stats.classification.isLowKey).toBe(false)
    })
  })
})
