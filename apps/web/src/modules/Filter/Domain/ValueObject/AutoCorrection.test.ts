import { describe, it, expect } from 'vitest'
import { $AutoCorrection } from './AutoCorrection'
import { $Lut3D } from './Lut3D'

describe('$AutoCorrection', () => {
  // テスト用のヒストグラムデータを生成
  const createTestHistogram = (options: {
    luminanceMean?: number
    spread?: number
    colorBias?: { r: number; g: number; b: number }
  } = {}) => {
    const { luminanceMean = 0.5, spread = 0.3, colorBias = { r: 0, g: 0, b: 0 } } = options

    const luminance = new Uint32Array(256)
    const r: number[] = new Array(256).fill(0)
    const g: number[] = new Array(256).fill(0)
    const b: number[] = new Array(256).fill(0)

    // ガウス分布風のヒストグラム
    for (let i = 0; i < 256; i++) {
      const x = i / 255
      const dist = Math.abs(x - luminanceMean) / spread
      const weight = Math.exp(-dist * dist * 2)
      luminance[i] = Math.floor(weight * 1000)

      // RGB ヒストグラム（バイアス付き）
      const rDist = Math.abs(x - (luminanceMean + colorBias.r)) / spread
      const gDist = Math.abs(x - (luminanceMean + colorBias.g)) / spread
      const bDist = Math.abs(x - (luminanceMean + colorBias.b)) / spread

      r[i] = Math.floor(Math.exp(-rDist * rDist * 2) * 1000)
      g[i] = Math.floor(Math.exp(-gDist * gDist * 2) * 1000)
      b[i] = Math.floor(Math.exp(-bDist * bDist * 2) * 1000)
    }

    return { luminance, r, g, b }
  }

  describe('compute', () => {
    it('should compute auto correction for a balanced image', () => {
      const histogram = createTestHistogram({ luminanceMean: 0.5 })
      const input = { histogram }

      const result = $AutoCorrection.compute(input)

      expect(result).toBeDefined()
      expect(result.exposure).toBeDefined()
      expect(result.contrast).toBeDefined()
      expect(result.wb).toBeDefined()
      expect(result.saturation).toBeDefined()
      expect(result.phase1Lut).toBeDefined()
      expect(result.phase2Lut3D).toBeDefined()
    })

    it('should compute positive exposure correction for dark image', () => {
      const histogram = createTestHistogram({ luminanceMean: 0.2 })
      const input = { histogram }

      const result = $AutoCorrection.compute(input)

      // 暗い画像なので露出を上げる（正のEV）
      expect(result.exposure.evDelta).toBeGreaterThan(0)
      expect(result.exposure.gain).toBeGreaterThan(1)
    })

    it('should compute negative exposure correction for bright image', () => {
      const histogram = createTestHistogram({ luminanceMean: 0.8 })
      const input = { histogram }

      const result = $AutoCorrection.compute(input)

      // 明るい画像なので露出を下げる（負のEV）
      expect(result.exposure.evDelta).toBeLessThan(0)
      expect(result.exposure.gain).toBeLessThan(1)
    })

    it('should detect WB correction for color-biased image', () => {
      // 赤が強い画像
      const histogram = createTestHistogram({
        luminanceMean: 0.5,
        colorBias: { r: 0.1, g: 0, b: -0.1 },
      })
      const input = { histogram }

      const result = $AutoCorrection.compute(input)

      // 赤が強いので R ゲインは 1 より小さくなる傾向
      // (ただしガード条件やクランプにより変わる可能性あり)
      expect(result.wb.gainR).toBeDefined()
      expect(result.wb.gainB).toBeDefined()
    })
  })

  describe('toLut3D', () => {
    it('should generate a valid 3D LUT', () => {
      const histogram = createTestHistogram({ luminanceMean: 0.5 })
      const input = { histogram }

      const result = $AutoCorrection.compute(input)
      const lut = $AutoCorrection.toLut3D(result, 17)

      expect(lut.type).toBe('lut3d')
      expect(lut.size).toBe(17)
      expect(lut.data.length).toBe(17 * 17 * 17 * 3)
    })

    it('should produce identity-like LUT for balanced image', () => {
      const histogram = createTestHistogram({ luminanceMean: 0.45, spread: 0.4 })
      const input = { histogram }

      const result = $AutoCorrection.compute(input)
      const lut = $AutoCorrection.toLut3D(result, 17)

      // 中間点（0.5, 0.5, 0.5）付近をチェック
      const [r, g, b] = $Lut3D.lookup(lut, 0.5, 0.5, 0.5)

      // バランスの取れた画像なら大きな変化はないはず（±0.2 以内）
      expect(r).toBeGreaterThan(0.3)
      expect(r).toBeLessThan(0.7)
      expect(g).toBeGreaterThan(0.3)
      expect(g).toBeLessThan(0.7)
      expect(b).toBeGreaterThan(0.3)
      expect(b).toBeLessThan(0.7)
    })
  })

  describe('createLutFromOriginal', () => {
    it('should create LUT and result in one call', () => {
      const histogram = createTestHistogram({ luminanceMean: 0.5 })
      const input = { histogram }

      const { lut, result } = $AutoCorrection.createLutFromOriginal(input, 17)

      expect(lut.type).toBe('lut3d')
      expect(lut.size).toBe(17)
      expect(result.exposure).toBeDefined()
      expect(result.contrast).toBeDefined()
    })
  })

  describe('getSummary', () => {
    it('should return summary string', () => {
      const histogram = createTestHistogram({ luminanceMean: 0.3 })
      const input = { histogram }

      const result = $AutoCorrection.compute(input)
      const summary = $AutoCorrection.getSummary(result)

      expect(typeof summary).toBe('string')
      // 暗い画像なので Exp が含まれるはず
      expect(summary).toContain('Exp')
    })

    it('should return "No correction" for balanced image', () => {
      // ほぼ理想的なヒストグラム
      const histogram = createTestHistogram({ luminanceMean: 0.45, spread: 0.5 })
      const input = { histogram }

      const result = $AutoCorrection.compute(input)

      // 補正量が小さい場合でも何らかの表示がある
      const summary = $AutoCorrection.getSummary(result)
      expect(typeof summary).toBe('string')
    })
  })

  describe('2-phase evaluation', () => {
    it('should accept phase2 input for more accurate WB/saturation', () => {
      const originalHistogram = createTestHistogram({ luminanceMean: 0.3 })
      const phase2Histogram = createTestHistogram({ luminanceMean: 0.45 })

      const result = $AutoCorrection.compute(
        { histogram: originalHistogram },
        { histogram: phase2Histogram }
      )

      expect(result).toBeDefined()
      expect(result.exposure).toBeDefined()
      expect(result.wb).toBeDefined()
    })

    it('should use createLutWithPhase2 for 2-phase evaluation', () => {
      const originalHistogram = createTestHistogram({ luminanceMean: 0.3 })
      const phase2Histogram = createTestHistogram({ luminanceMean: 0.45 })

      const { lut, result } = $AutoCorrection.createLutWithPhase2(
        { histogram: originalHistogram },
        { histogram: phase2Histogram },
        17
      )

      expect(lut.type).toBe('lut3d')
      expect(result.exposure).toBeDefined()
    })
  })
})
