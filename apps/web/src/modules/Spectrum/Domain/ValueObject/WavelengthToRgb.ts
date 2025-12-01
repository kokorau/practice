/**
 * 波長（nm）からsRGB色空間への変換
 * CIE 1931 XYZ色空間を経由して変換
 */

import type { Srgb } from '../../../Color/Domain/ValueObject/Srgb'

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
