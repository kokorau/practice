/**
 * Curve - 7点制御のカーブ定義
 * x座標は等間隔固定、y座標のみ指定
 */

export type Curve = {
  /** y値の配列 (0-1)、x は等間隔 (0, 1/6, 2/6, ..., 1) */
  points: number[]
}

/**
 * Monotonic Cubic Hermite Interpolation (PCHIP / Fritsch-Carlson)
 * オーバーシュートを防ぎつつ滑らかに補間
 */
const monotoneCubicInterpolation = (
  xs: number[],
  ys: number[]
): ((x: number) => number) => {
  const n = xs.length

  if (n < 2) {
    return () => ys[0] ?? 0
  }

  // 1. 各区間の傾き (secant) を計算
  const deltas: number[] = []
  const h: number[] = []
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1]! - xs[i]!
    deltas[i] = (ys[i + 1]! - ys[i]!) / h[i]!
  }

  // 2. 各点での傾き (tangent) を計算
  const m: number[] = new Array(n)

  // 端点の傾き
  m[0] = deltas[0]!
  m[n - 1] = deltas[n - 2]!

  // 内部点の傾き (Fritsch-Carlson法)
  for (let i = 1; i < n - 1; i++) {
    const d0 = deltas[i - 1]!
    const d1 = deltas[i]!

    // 符号が異なる場合は0 (極値点)
    if (d0 * d1 <= 0) {
      m[i] = 0
    } else {
      // 調和平均
      m[i] = (2 * d0 * d1) / (d0 + d1)
    }
  }

  // 3. 単調性を保証するための傾き制限
  for (let i = 0; i < n - 1; i++) {
    const delta = deltas[i]!
    if (Math.abs(delta) < 1e-10) {
      // 水平区間
      m[i] = 0
      m[i + 1] = 0
    } else {
      const alpha = m[i]! / delta
      const beta = m[i + 1]! / delta

      // 制限: alpha^2 + beta^2 <= 9 (円の内側に収める)
      const tau = alpha * alpha + beta * beta
      if (tau > 9) {
        const t = 3 / Math.sqrt(tau)
        m[i] = t * alpha * delta
        m[i + 1] = t * beta * delta
      }
    }
  }

  // 4. Hermite補間関数を返す
  return (x: number): number => {
    // 範囲外はクランプ
    if (x <= xs[0]!) return ys[0]!
    if (x >= xs[n - 1]!) return ys[n - 1]!

    // 区間を探す
    let i = 0
    while (i < n - 1 && x > xs[i + 1]!) {
      i++
    }

    const x0 = xs[i]!
    const x1 = xs[i + 1]!
    const y0 = ys[i]!
    const y1 = ys[i + 1]!
    const m0 = m[i]!
    const m1 = m[i + 1]!

    // 正規化 t (0-1)
    const t = (x - x0) / (x1 - x0)
    const t2 = t * t
    const t3 = t2 * t

    // Hermite基底関数
    const h00 = 2 * t3 - 3 * t2 + 1
    const h10 = t3 - 2 * t2 + t
    const h01 = -2 * t3 + 3 * t2
    const h11 = t3 - t2

    // 補間値
    const interval = x1 - x0
    return h00 * y0 + h10 * interval * m0 + h01 * y1 + h11 * interval * m1
  }
}

export const $Curve = {
  /** デフォルト (リニア / 無変換) */
  identity: (pointCount: number = 7): Curve => {
    const points: number[] = []
    for (let i = 0; i < pointCount; i++) {
      points.push(i / (pointCount - 1))
    }
    return { points }
  },

  /** 指定した点数のx座標配列を生成 */
  getXPositions: (pointCount: number): number[] => {
    const xs: number[] = []
    for (let i = 0; i < pointCount; i++) {
      xs.push(i / (pointCount - 1))
    }
    return xs
  },

  /** カーブを256要素のLUTに変換 */
  toLut: (curve: Curve): Uint8Array => {
    const lut = new Uint8Array(256)
    const xs = $Curve.getXPositions(curve.points.length)
    const interpolate = monotoneCubicInterpolation(xs, curve.points)

    for (let i = 0; i < 256; i++) {
      const x = i / 255
      const y = interpolate(x)
      // 0-255にクランプして整数化
      lut[i] = Math.round(Math.max(0, Math.min(255, y * 255)))
    }

    return lut
  },

  /** 補間関数を取得 (テスト・可視化用) */
  getInterpolator: (curve: Curve): ((x: number) => number) => {
    const xs = $Curve.getXPositions(curve.points.length)
    return monotoneCubicInterpolation(xs, curve.points)
  },
}
