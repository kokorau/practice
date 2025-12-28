import { describe, it, expect } from 'vitest'
import { $ContrastCorrection } from './ContrastCorrection'
import { $ExposureCorrection, type LuminanceStats, type ImageClassification } from './ExposureCorrection'

describe('$ContrastCorrection', () => {
  // テスト用ヘルパー: 基本的な LuminanceStats
  const createStats = (overrides: Partial<LuminanceStats> = {}): LuminanceStats => ({
    p01: 0.05,
    p10: 0.15,
    p50: 0.45,
    p90: 0.75,
    p99: 0.9,
    clipBlack: 0,
    clipWhite: 0,
    range: 0.6, // p90 - p10
    midRatio: 0.4,
    ...overrides,
  })

  // テスト用ヘルパー: 基本的な ImageClassification
  const createClassification = (overrides: Partial<ImageClassification> = {}): ImageClassification => ({
    isLowKey: false,
    isHighKey: false,
    isLowContrast: false,
    isHighContrast: false,
    hasSignificantClipping: false,
    ...overrides,
  })

  describe('compute', () => {
    it('通常画像: 差分を計算してS字適用量を返す', () => {
      const stats = createStats({ range: 0.6 })
      const classification = createClassification()
      const result = $ContrastCorrection.compute(stats, classification)

      // delta = 0.55 - 0.6 = -0.05 (少しコントラストを下げる方向)
      expect(result.delta).toBeCloseTo(-0.05, 3)
      expect(result.clampedDelta).toBeLessThan(0)
      expect(result.amount).toBeLessThan(0)
      expect(result.guardApplied).toBe(false)
    })

    it('低コントラスト画像: コントラストを上げる方向', () => {
      const stats = createStats({ range: 0.3 }) // targetRange(0.55) より低い
      const classification = createClassification()
      const result = $ContrastCorrection.compute(stats, classification)

      // delta = 0.55 - 0.3 = 0.25 (コントラストを上げる方向)
      expect(result.delta).toBeCloseTo(0.25, 3)
      expect(result.clampedDelta).toBeGreaterThan(0)
      expect(result.amount).toBeGreaterThan(0)
    })

    it('高コントラスト画像: 拡張を禁止するガード', () => {
      const stats = createStats({ range: 0.8 }) // highContrastThreshold(0.75) を超えている
      const classification = createClassification({ isHighContrast: true })
      const result = $ContrastCorrection.compute(stats, classification)

      // range > 0.75 かつ delta > 0 (拡張方向) は禁止
      // delta = 0.55 - 0.8 = -0.25 (圧縮方向なので実行される)
      expect(result.delta).toBeLessThan(0)
      expect(result.guardApplied).toBe(false) // 圧縮方向は許可
    })

    it('超高コントラスト画像で拡張方向: ガードが適用', () => {
      // このテストケースは拡張方向を強制するため特殊な設定
      const stats = createStats({ range: 0.8 })
      const classification = createClassification({ isHighContrast: true })
      // targetRange を高くして拡張方向に
      const result = $ContrastCorrection.compute(stats, classification, { targetRange: 0.9 })

      // range > 0.75 かつ delta > 0 (拡張方向) は禁止
      expect(result.delta).toBeGreaterThan(0) // 0.9 - 0.8 = 0.1
      expect(result.amount).toBe(0)
      expect(result.guardApplied).toBe(true)
      expect(result.guardType).toBe('highContrast')
    })

    it('ローキー+低コントラスト: 強度が大幅に下がる', () => {
      const stats = createStats({ p50: 0.2, range: 0.25 })
      const classification = createClassification({ isLowKey: true, isLowContrast: true })
      const result = $ContrastCorrection.compute(stats, classification)

      expect(result.guardApplied).toBe(true)
      expect(result.guardType).toBe('lowKeyLowContrast')
      expect(result.effectiveStrength).toBeCloseTo(0.4 * 0.3, 3) // デフォルト * 0.3
    })

    it('ハイキー画像: 強度が下がる', () => {
      const stats = createStats({ p50: 0.75 })
      const classification = createClassification({ isHighKey: true })
      const result = $ContrastCorrection.compute(stats, classification)

      expect(result.guardApplied).toBe(true)
      expect(result.guardType).toBe('highKey')
      expect(result.effectiveStrength).toBeCloseTo(0.4 * 0.5, 3) // デフォルト * 0.5
    })

    it('中間調が少ない画像: 強度が大幅に下がる', () => {
      const stats = createStats({ midRatio: 0.15 }) // midRatioThreshold(0.2) 未満
      const classification = createClassification()
      const result = $ContrastCorrection.compute(stats, classification)

      expect(result.guardApplied).toBe(true)
      expect(result.guardType).toBe('lowMidRatio')
      expect(result.effectiveStrength).toBeCloseTo(0.4 * 0.3, 3) // デフォルト * 0.3
    })

    it('非線形制限: 大きな差分も maxRange を超えない', () => {
      const stats = createStats({ range: 0.1 }) // targetRange(0.55) と大きな差
      const classification = createClassification()
      const result = $ContrastCorrection.compute(stats, classification, { maxRange: 0.15 })

      // delta = 0.55 - 0.1 = 0.45 だが、tanh で制限される
      expect(result.delta).toBeCloseTo(0.45, 3)
      expect(Math.abs(result.clampedDelta)).toBeLessThan(0.15)
    })
  })

  describe('toCurve', () => {
    it('amount ≈ 0 なら identity カーブ', () => {
      const result = {
        delta: 0,
        clampedDelta: 0,
        amount: 0,
        effectiveStrength: 0.4,
        guardApplied: false,
        guardType: 'none' as const,
      }
      const curve = $ContrastCorrection.toCurve(result)

      // 7点カーブの各点が対角線上にある
      expect(curve.points).toHaveLength(7)
      for (let i = 0; i < 7; i++) {
        expect(curve.points[i]).toBeCloseTo(i / 6, 3)
      }
    })

    it('amount > 0 でS字カーブ（コントラスト増加）', () => {
      const result = {
        delta: 0.3,
        clampedDelta: 0.1,
        amount: 0.05,
        effectiveStrength: 0.4,
        guardApplied: false,
        guardType: 'none' as const,
      }
      const curve = $ContrastCorrection.toCurve(result)

      // 端点は固定
      expect(curve.points[0]).toBe(0)
      expect(curve.points[6]).toBe(1)

      // 中央は 0.5 付近（ほぼ固定に近い）
      expect(curve.points[3]).toBeCloseTo(0.5, 1)

      // 暗部は下がり、明部は上がる
      expect(curve.points[1]).toBeLessThan(1 / 6)
      expect(curve.points[2]).toBeLessThan(2 / 6)
      expect(curve.points[4]).toBeGreaterThan(4 / 6)
      expect(curve.points[5]).toBeGreaterThan(5 / 6)
    })

    it('amount < 0 でS字カーブ（コントラスト減少）', () => {
      const result = {
        delta: -0.2,
        clampedDelta: -0.08,
        amount: -0.03,
        effectiveStrength: 0.4,
        guardApplied: false,
        guardType: 'none' as const,
      }
      const curve = $ContrastCorrection.toCurve(result)

      // 端点は固定
      expect(curve.points[0]).toBe(0)
      expect(curve.points[6]).toBe(1)

      // 暗部は上がり、明部は下がる（中央に寄る）
      expect(curve.points[1]).toBeGreaterThan(1 / 6)
      expect(curve.points[2]).toBeGreaterThan(2 / 6)
      expect(curve.points[4]).toBeLessThan(4 / 6)
      expect(curve.points[5]).toBeLessThan(5 / 6)
    })

    it('異なる pointCount でも動作', () => {
      const result = {
        delta: 0.2,
        clampedDelta: 0.1,
        amount: 0.04,
        effectiveStrength: 0.4,
        guardApplied: false,
        guardType: 'none' as const,
      }
      const curve5 = $ContrastCorrection.toCurve(result, 5)
      const curve9 = $ContrastCorrection.toCurve(result, 9)

      expect(curve5.points).toHaveLength(5)
      expect(curve9.points).toHaveLength(9)

      // 端点は固定
      expect(curve5.points[0]).toBe(0)
      expect(curve5.points[4]).toBe(1)
      expect(curve9.points[0]).toBe(0)
      expect(curve9.points[8]).toBe(1)
    })
  })

  describe('toLut', () => {
    it('LUT を生成できる', () => {
      const result = {
        delta: 0.2,
        clampedDelta: 0.1,
        amount: 0.04,
        effectiveStrength: 0.4,
        guardApplied: false,
        guardType: 'none' as const,
      }
      const lut = $ContrastCorrection.toLut(result)

      expect(lut.type).toBe('lut1d')
      expect(lut.r).toHaveLength(256)
      expect(lut.g).toHaveLength(256)
      expect(lut.b).toHaveLength(256)

      // RGB 全チャンネルが同じ（マスター LUT）
      expect(lut.r[128]).toBe(lut.g[128])
      expect(lut.g[128]).toBe(lut.b[128])
    })

    it('コントラスト増加 LUT: 端が離れる', () => {
      const result = {
        delta: 0.3,
        clampedDelta: 0.12,
        amount: 0.06,
        effectiveStrength: 0.4,
        guardApplied: false,
        guardType: 'none' as const,
      }
      const lut = $ContrastCorrection.toLut(result)

      // 暗部がより暗く、明部がより明るく
      expect(lut.r[64]!).toBeLessThan(64 / 255)
      expect(lut.r[192]!).toBeGreaterThan(192 / 255)

      // 中央付近はあまり変わらない
      expect(lut.r[128]!).toBeCloseTo(128 / 255, 1)
    })
  })

  describe('createLutFromStats', () => {
    it('統計から直接 LUT を生成', () => {
      const stats = createStats({ range: 0.4 })
      const classification = createClassification()
      const { lut, result } = $ContrastCorrection.createLutFromStats(stats, classification)

      expect(lut.type).toBe('lut1d')
      expect(result.delta).toBeCloseTo(0.15, 3) // 0.55 - 0.4
      expect(result.amount).toBeGreaterThan(0)
    })
  })

  describe('ヒストグラムからの統合テスト', () => {
    it('低コントラストヒストグラム -> コントラスト増加 LUT', () => {
      // 狭い範囲に集中したヒストグラム
      const hist = new Uint32Array(256)
      for (let i = 100; i < 150; i++) {
        hist[i] = 200
      }

      const stats = $ExposureCorrection.computeStats(hist)
      const classification = $ExposureCorrection.classify(stats)

      expect(stats.range).toBeLessThan(0.3) // 低コントラスト
      expect(classification.isLowContrast).toBe(true)

      const { lut, result } = $ContrastCorrection.createLutFromStats(stats, classification)

      // コントラストを上げる方向
      expect(result.amount).toBeGreaterThan(0)
      expect(lut.r[64]!).toBeLessThan(64 / 255)
    })

    it('高コントラストヒストグラム -> 補正が控えめ', () => {
      // 広い範囲に分布したヒストグラム
      const hist = new Uint32Array(256)
      for (let i = 10; i < 250; i++) {
        hist[i] = 40
      }

      const stats = $ExposureCorrection.computeStats(hist)
      const classification = $ExposureCorrection.classify(stats)

      expect(stats.range).toBeGreaterThan(0.7) // 高コントラスト

      const { result } = $ContrastCorrection.createLutFromStats(stats, classification)

      // 圧縮方向だが控えめ
      expect(result.amount).toBeLessThan(0)
      expect(Math.abs(result.amount)).toBeLessThan(0.1)
    })
  })
})
