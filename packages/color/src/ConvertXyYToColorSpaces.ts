/**
 * xyY色度座標から各色空間のRGB値に変換するUseCase
 */

// 色空間ID
export type ColorSpaceId = 'srgb' | 'display-p3' | 'rec2020' | 'aces-ap1'

// 各色空間でのRGB値
export interface ColorSpaceRgb {
  linear: { r: number; g: number; b: number }
  gamma: { r: number; g: number; b: number }
  inGamut: boolean
  css: string
  // この色空間のRGB値から計算したxy色度座標
  chromaticity: { x: number; y: number }
}

// 変換結果
export interface XyYColorConversionResult {
  // 入力値
  input: {
    x: number
    y: number
    Y: number
  }
  // XYZ値
  xyz: {
    X: number
    Y: number
    Z: number
  }
  // 各色空間でのRGB値
  colorSpaces: Record<ColorSpaceId, ColorSpaceRgb>
  // 色度図上でのガマット判定
  xyGamut: Record<ColorSpaceId, boolean>
}

// ============================================
// 色空間の定義
// ============================================

// 色域の頂点（CIE xy座標）
const GAMUT_VERTICES: Record<ColorSpaceId, { r: [number, number]; g: [number, number]; b: [number, number] }> = {
  srgb: {
    r: [0.64, 0.33],
    g: [0.30, 0.60],
    b: [0.15, 0.06]
  },
  'display-p3': {
    r: [0.68, 0.32],
    g: [0.265, 0.69],
    b: [0.15, 0.06]
  },
  rec2020: {
    r: [0.708, 0.292],
    g: [0.17, 0.797],
    b: [0.131, 0.046]
  },
  'aces-ap1': {
    r: [0.713, 0.293],
    g: [0.165, 0.830],
    b: [0.128, 0.044]
  }
}

// ============================================
// XYZ -> 各色空間への変換行列
// ============================================

const XYZ_TO_SRGB = [
  [3.2409699419, -1.5373831776, -0.4986107603],
  [-0.9692436363, 1.8759675015, 0.0415550574],
  [0.0556300797, -0.2039769589, 1.0569715142],
] as const

const XYZ_TO_DISPLAY_P3 = [
  [2.4934969119, -0.9313836179, -0.4027107845],
  [-0.8294889696, 1.7626640603, 0.0236246858],
  [0.0358458302, -0.0761723893, 0.9568845240],
] as const

const XYZ_TO_REC2020 = [
  [1.7166511880, -0.3556707838, -0.2533662814],
  [-0.6666843518, 1.6164812366, 0.0157685458],
  [0.0176398574, -0.0427706133, 0.9421031212],
] as const

const XYZ_TO_ACES_AP1 = [
  [1.6410233797, -0.3248032942, -0.2364246952],
  [-0.6636628587, 1.6153315917, 0.0167563477],
  [0.0117218943, -0.0082844420, 0.9883948585],
] as const

// ============================================
// 各色空間のRGB -> XYZ変換行列（xy座標計算用）
// ============================================

const SRGB_TO_XYZ = [
  [0.4123907993, 0.3575843394, 0.1804807884],
  [0.2126390059, 0.7151686788, 0.0721923154],
  [0.0193308187, 0.1191947798, 0.9505321522],
] as const

const DISPLAY_P3_TO_XYZ = [
  [0.4865709486, 0.2656676932, 0.1982172852],
  [0.2289745641, 0.6917385218, 0.0792869141],
  [0.0000000000, 0.0451133819, 1.0439443689],
] as const

const REC2020_TO_XYZ = [
  [0.6369580483, 0.1446169036, 0.1688809752],
  [0.2627002120, 0.6779980715, 0.0593017165],
  [0.0000000000, 0.0280726930, 1.0609850577],
] as const

const ACES_AP1_TO_XYZ = [
  [0.6624541811, 0.1340042065, 0.1561876870],
  [0.2722287168, 0.6740817658, 0.0536895174],
  [-0.0055746495, 0.0040607335, 1.0103391003],
] as const

// ============================================
// ヘルパー関数
// ============================================

function matmul3x3(m: readonly (readonly number[])[], v: [number, number, number]): [number, number, number] {
  return [
    m[0]![0]! * v[0] + m[0]![1]! * v[1] + m[0]![2]! * v[2],
    m[1]![0]! * v[0] + m[1]![1]! * v[1] + m[1]![2]! * v[2],
    m[2]![0]! * v[0] + m[2]![1]! * v[1] + m[2]![2]! * v[2],
  ]
}

function linearToSrgbGamma(v: number): number {
  if (v <= 0.0031308) return v * 12.92
  return 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function isInGamut(rgb: { r: number; g: number; b: number }): boolean {
  return rgb.r >= -1e-6 && rgb.r <= 1 + 1e-6 &&
         rgb.g >= -1e-6 && rgb.g <= 1 + 1e-6 &&
         rgb.b >= -1e-6 && rgb.b <= 1 + 1e-6
}

// 点が三角形内にあるか判定（重心座標）
function isPointInTriangle(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number
): boolean {
  const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
  if (Math.abs(det) < 1e-10) return false

  const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / det
  const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / det
  const l3 = 1 - l1 - l2

  return l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6
}

function isXyInGamut(x: number, y: number, spaceId: ColorSpaceId): boolean {
  const v = GAMUT_VERTICES[spaceId]
  return isPointInTriangle(
    x, y,
    v.r[0], v.r[1],
    v.g[0], v.g[1],
    v.b[0], v.b[1]
  )
}

// ============================================
// メイン変換関数
// ============================================

function xyYToXYZ(x: number, y: number, Y: number): { X: number; Y: number; Z: number } {
  if (y <= 0) return { X: 0, Y: 0, Z: 0 }
  return {
    X: (x / y) * Y,
    Y: Y,
    Z: ((1 - x - y) / y) * Y
  }
}

function xyzToColorSpaceRgb(
  X: number, Y: number, Z: number,
  xyzToRgbMatrix: readonly (readonly number[])[],
  rgbToXyzMatrix: readonly (readonly number[])[],
  cssColorSpace: string | null
): ColorSpaceRgb {
  const linear = matmul3x3(xyzToRgbMatrix, [X, Y, Z])
  const linearRgb = { r: linear[0], g: linear[1], b: linear[2] }

  const gammaRgb = {
    r: linearToSrgbGamma(linear[0]),
    g: linearToSrgbGamma(linear[1]),
    b: linearToSrgbGamma(linear[2]),
  }

  const inGamut = isInGamut(linearRgb)

  // CSS用に小数点4桁に丸める
  const round4 = (v: number) => Math.round(clamp01(v) * 10000) / 10000

  let css: string
  if (cssColorSpace) {
    css = `color(${cssColorSpace} ${round4(gammaRgb.r)} ${round4(gammaRgb.g)} ${round4(gammaRgb.b)})`
  } else {
    // ACES AP1: sRGBにフォールバック
    const srgbLinear = matmul3x3(XYZ_TO_SRGB, [X, Y, Z])
    const srgbGamma = {
      r: linearToSrgbGamma(srgbLinear[0]),
      g: linearToSrgbGamma(srgbLinear[1]),
      b: linearToSrgbGamma(srgbLinear[2]),
    }
    css = `color(srgb ${round4(srgbGamma.r)} ${round4(srgbGamma.g)} ${round4(srgbGamma.b)})`
  }

  // この色空間でのRGB値（クリップ後）をXYZに戻してxy座標を計算
  const clippedLinear: [number, number, number] = [
    clamp01(linearRgb.r),
    clamp01(linearRgb.g),
    clamp01(linearRgb.b)
  ]
  const clippedXyz = matmul3x3(rgbToXyzMatrix, clippedLinear)
  const sumXyz = clippedXyz[0] + clippedXyz[1] + clippedXyz[2]

  const chromaticity = sumXyz > 0
    ? { x: clippedXyz[0] / sumXyz, y: clippedXyz[1] / sumXyz }
    : { x: 0, y: 0 }

  return {
    linear: linearRgb,
    gamma: gammaRgb,
    inGamut,
    css,
    chromaticity
  }
}

// ============================================
// UseCase
// ============================================

export function convertXyYToColorSpaces(x: number, y: number, Y: number): XyYColorConversionResult {
  const xyz = xyYToXYZ(x, y, Y)

  const colorSpaces: Record<ColorSpaceId, ColorSpaceRgb> = {
    srgb: xyzToColorSpaceRgb(xyz.X, xyz.Y, xyz.Z, XYZ_TO_SRGB, SRGB_TO_XYZ, 'srgb'),
    'display-p3': xyzToColorSpaceRgb(xyz.X, xyz.Y, xyz.Z, XYZ_TO_DISPLAY_P3, DISPLAY_P3_TO_XYZ, 'display-p3'),
    rec2020: xyzToColorSpaceRgb(xyz.X, xyz.Y, xyz.Z, XYZ_TO_REC2020, REC2020_TO_XYZ, 'rec2020'),
    'aces-ap1': xyzToColorSpaceRgb(xyz.X, xyz.Y, xyz.Z, XYZ_TO_ACES_AP1, ACES_AP1_TO_XYZ, null),
  }

  const xyGamut: Record<ColorSpaceId, boolean> = {
    srgb: isXyInGamut(x, y, 'srgb'),
    'display-p3': isXyInGamut(x, y, 'display-p3'),
    rec2020: isXyInGamut(x, y, 'rec2020'),
    'aces-ap1': isXyInGamut(x, y, 'aces-ap1'),
  }

  return {
    input: { x, y, Y },
    xyz,
    colorSpaces,
    xyGamut,
  }
}

// 色空間情報
export const COLOR_SPACE_INFO: Record<ColorSpaceId, { name: string; description: string; cssColorSpace: string | null }> = {
  srgb: { name: 'sRGB', description: '標準Web色空間', cssColorSpace: 'srgb' },
  'display-p3': { name: 'Display P3', description: 'Apple/HDR向け広色域', cssColorSpace: 'display-p3' },
  rec2020: { name: 'Rec.2020', description: '4K/8K放送規格', cssColorSpace: 'rec2020' },
  'aces-ap1': { name: 'ACES AP1', description: '映像制作用色空間', cssColorSpace: null },
}

// 色域頂点のエクスポート
export { GAMUT_VERTICES }
