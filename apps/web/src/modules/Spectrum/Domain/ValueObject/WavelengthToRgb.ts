/**
 * 波長（nm）からsRGB色空間への変換
 * CIE 1931 XYZ色空間を経由して変換
 */

import type { Srgb } from '@practice/color'
import type { Spectrum } from './Spectrum'

/**
 * 波長（nm）からXYZ三刺激値を近似計算
 * Gaussian近似を使用
 */
export function wavelengthToXYZ(
  wavelength: number
): { x: number; y: number; z: number } {
  // Gaussian functions for x, y, z color matching functions
  const gaussian = (x: number, mu: number, sigma1: number, sigma2: number) => {
    const sigma = x < mu ? sigma1 : sigma2
    return Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2))
  }

  const x =
    1.056 * gaussian(wavelength, 599.8, 37.9, 31.0) +
    0.362 * gaussian(wavelength, 442.0, 16.0, 26.7) -
    0.065 * gaussian(wavelength, 501.1, 20.4, 26.2)

  const y =
    0.821 * gaussian(wavelength, 568.8, 46.9, 40.5) +
    0.286 * gaussian(wavelength, 530.9, 16.3, 31.1)

  const z = 1.217 * gaussian(wavelength, 437.0, 11.8, 36.0) + 0.681 * gaussian(wavelength, 459.0, 26.0, 13.8)

  return { x, y, z }
}

/**
 * XYZからsRGBへの変換（D65白色点）
 */
export function xyzToSrgb(xyz: {
  x: number
  y: number
  z: number
}): { r: number; g: number; b: number } {
  const { x, y, z } = xyz

  // XYZ to linear RGB (sRGB D65)
  let r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z
  let g = -0.969266 * x + 1.8760108 * y + 0.041556 * z
  let b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z

  // Gamma correction (linear to sRGB)
  const gammaCorrect = (c: number) => {
    if (c <= 0.0031308) {
      return 12.92 * c
    }
    return 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  }

  r = gammaCorrect(r)
  g = gammaCorrect(g)
  b = gammaCorrect(b)

  return { r, g, b }
}

/**
 * 波長（nm）からsRGB色を取得
 * @param wavelength 波長（nm）、380〜780の範囲
 * @param intensity 強度（0〜1）
 * @returns sRGB色（0〜1の範囲にクランプ済み）
 */
export function wavelengthToSrgb(
  wavelength: number,
  intensity: number = 1.0
): Srgb {
  const xyz = wavelengthToXYZ(wavelength)
  let { r, g, b } = xyzToSrgb(xyz)

  // 強度を適用
  r *= intensity
  g *= intensity
  b *= intensity

  // 範囲外の値をクランプ
  r = Math.max(0, Math.min(1, r))
  g = Math.max(0, Math.min(1, g))
  b = Math.max(0, Math.min(1, b))

  return { r, g, b }
}

/**
 * 可視光スペクトラムのグラデーション配列を生成
 */
export function generateSpectrumGradient(
  minWavelength: number = 380,
  maxWavelength: number = 780,
  steps: number = 100
): Srgb[] {
  const colors: Srgb[] = []
  const step = (maxWavelength - minWavelength) / (steps - 1)

  for (let i = 0; i < steps; i++) {
    const wavelength = minWavelength + step * i
    colors.push(wavelengthToSrgb(wavelength))
  }

  return colors
}

/**
 * スペクトラムをXYZ三刺激値に積分
 * 各波長での強度と色マッチング関数の積を積分する
 */
export function spectrumToXYZ(spectrum: Spectrum): { x: number; y: number; z: number } {
  let x = 0
  let y = 0
  let z = 0

  const n = spectrum.wavelengths.length
  if (n < 2) return { x: 0, y: 0, z: 0 }

  // 台形積分
  for (let i = 0; i < n - 1; i++) {
    const wl0 = spectrum.wavelengths[i]!
    const wl1 = spectrum.wavelengths[i + 1]!
    const v0 = spectrum.values[i]!
    const v1 = spectrum.values[i + 1]!

    const xyz0 = wavelengthToXYZ(wl0)
    const xyz1 = wavelengthToXYZ(wl1)

    const dWl = wl1 - wl0

    // 台形公式: (f(a) + f(b)) / 2 * (b - a)
    x += ((v0 * xyz0.x + v1 * xyz1.x) / 2) * dWl
    y += ((v0 * xyz0.y + v1 * xyz1.y) / 2) * dWl
    z += ((v0 * xyz0.z + v1 * xyz1.z) / 2) * dWl
  }

  return { x, y, z }
}

/**
 * スペクトラムをsRGB色に変換
 * スペクトラムの強度分布を積分してXYZを求め、sRGBに変換する
 * @param spectrum スペクトラム
 * @param normalize trueの場合、最大輝度を1に正規化する（デフォルト: true）
 * @returns sRGB色（0〜1の範囲にクランプ済み）
 */
export function spectrumToSrgb(spectrum: Spectrum, normalize: boolean = true): Srgb {
  const xyz = spectrumToXYZ(spectrum)

  // 正規化（Y=1 を白とする）
  let { x, y, z } = xyz
  if (normalize && y > 0) {
    const scale = 1 / y
    x *= scale
    y *= scale
    z *= scale
  }

  let rgb = xyzToSrgb({ x, y, z })

  // ガマット外の色を扱う: 最大値でスケーリング
  const maxComponent = Math.max(rgb.r, rgb.g, rgb.b)
  if (maxComponent > 1) {
    rgb.r /= maxComponent
    rgb.g /= maxComponent
    rgb.b /= maxComponent
  }

  // 負の値をクランプ
  rgb.r = Math.max(0, rgb.r)
  rgb.g = Math.max(0, rgb.g)
  rgb.b = Math.max(0, rgb.b)

  return rgb
}
