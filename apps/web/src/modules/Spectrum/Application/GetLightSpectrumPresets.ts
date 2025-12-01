import { createVisibleSpectrum, type Spectrum } from '../Domain/ValueObject/Spectrum'
import { spectrumToSrgb } from '../Domain/ValueObject/WavelengthToRgb'
import type { Srgb } from '../../Color/Domain/ValueObject/Srgb'

export interface LightSpectrumPreset {
  id: string
  name: string
  spectrum: Spectrum
  /** プリセットリスト表示用の色 */
  color: Srgb
}

/**
 * ガウシアンピークのスペクトラムを生成
 */
function createGaussianSpectrum(
  peakWavelength: number,
  fwhm: number,
  intensity: number = 1.0
): Spectrum {
  const s = createVisibleSpectrum(81, 0)
  const sigma = fwhm / 2.355 // FWHM to sigma

  for (let i = 0; i < s.wavelengths.length; i++) {
    const wl = s.wavelengths[i]!
    const diff = wl - peakWavelength
    s.values[i] = intensity * Math.exp(-(diff * diff) / (2 * sigma * sigma))
  }

  return s
}

/**
 * 黒体放射スペクトラムを生成（プランクの法則）
 */
function createBlackbodySpectrum(temperature: number): Spectrum {
  const s = createVisibleSpectrum(81, 0)
  const c1 = 3.74183e-16 // 2 * pi * h * c^2
  const c2 = 1.4388e-2 // h * c / k

  for (let i = 0; i < s.wavelengths.length; i++) {
    const wl = s.wavelengths[i]!
    const wlM = wl * 1e-9 // nm to m
    s.values[i] = (c1 / Math.pow(wlM, 5)) / (Math.exp(c2 / (wlM * temperature)) - 1)
  }

  // 正規化
  const max = Math.max(...s.values)
  for (let i = 0; i < s.values.length; i++) {
    s.values[i]! /= max
  }

  return s
}

/**
 * プリセットを作成するヘルパー
 */
function createPreset(
  id: string,
  name: string,
  spectrum: Spectrum
): LightSpectrumPreset {
  return {
    id,
    name,
    spectrum,
    color: spectrumToSrgb(spectrum),
  }
}

/**
 * 光源スペクトラムのプリセット一覧を取得
 */
export function getLightSpectrumPresets(): LightSpectrumPreset[] {
  return [
    // 黒体放射
    createPreset('daylight-d65', 'Daylight (D65, 6500K)', createBlackbodySpectrum(6500)),
    createPreset('incandescent', 'Incandescent (2700K)', createBlackbodySpectrum(2700)),
    createPreset('candle', 'Candle (1850K)', createBlackbodySpectrum(1850)),

    // 平坦
    createPreset('flat-white', 'Flat White (Equal Energy)', createVisibleSpectrum(81, 1.0)),

    // レーザー
    createPreset('red-laser', 'Red Laser (650nm)', createGaussianSpectrum(650, 5)),
    createPreset('green-laser', 'Green Laser (532nm)', createGaussianSpectrum(532, 5)),
    createPreset('blue-laser', 'Blue Laser (450nm)', createGaussianSpectrum(450, 5)),

    // LED
    createPreset('blue-led', 'Blue LED (460nm)', createGaussianSpectrum(460, 25)),
    createPreset('green-led', 'Green LED (525nm)', createGaussianSpectrum(525, 35)),
    createPreset('red-led', 'Red LED (625nm)', createGaussianSpectrum(625, 20)),

    // 単色光
    createPreset('sodium-lamp', 'Sodium Lamp (589nm)', createGaussianSpectrum(589, 2)),
  ]
}
