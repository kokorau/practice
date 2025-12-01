/**
 * スペクトラムを表す値オブジェクト
 * 可視光の波長域（約380nm〜780nm）における光の強度分布を表現する
 */
export interface Spectrum {
  /** 各波長におけるサンプル値（強度/パワー） */
  values: Float32Array
  /** サンプリングしている波長（nm単位） */
  wavelengths: Float32Array
}

/** 可視光の最小波長（nm） */
export const VISIBLE_MIN_WAVELENGTH = 380

/** 可視光の最大波長（nm） */
export const VISIBLE_MAX_WAVELENGTH = 780

/**
 * 均等にサンプリングされたスペクトラムを作成
 */
export function createSpectrum(
  minWavelength: number,
  maxWavelength: number,
  sampleCount: number,
  initialValue: number = 0
): Spectrum {
  const wavelengths = new Float32Array(sampleCount)
  const values = new Float32Array(sampleCount)
  const step = (maxWavelength - minWavelength) / (sampleCount - 1)

  for (let i = 0; i < sampleCount; i++) {
    wavelengths[i] = minWavelength + step * i
    values[i] = initialValue
  }

  return { values, wavelengths }
}

/**
 * 可視光域のスペクトラムを作成
 */
export function createVisibleSpectrum(
  sampleCount: number = 81,
  initialValue: number = 0
): Spectrum {
  return createSpectrum(
    VISIBLE_MIN_WAVELENGTH,
    VISIBLE_MAX_WAVELENGTH,
    sampleCount,
    initialValue
  )
}

/**
 * 特定の波長に対応するサンプルインデックスを取得（線形補間用）
 */
export function getInterpolationIndices(
  spectrum: Spectrum,
  wavelength: number
): { lower: number; upper: number; t: number } | null {
  const { wavelengths } = spectrum
  const n = wavelengths.length

  const first = wavelengths[0]
  const last = wavelengths[n - 1]
  if (first === undefined || last === undefined) return null
  if (wavelength < first || wavelength > last) {
    return null
  }

  for (let i = 0; i < n - 1; i++) {
    const wlI = wavelengths[i]!
    const wlNext = wavelengths[i + 1]!
    if (wavelength >= wlI && wavelength <= wlNext) {
      const t = (wavelength - wlI) / (wlNext - wlI)
      return { lower: i, upper: i + 1, t }
    }
  }

  return null
}

/**
 * 特定の波長における値を線形補間で取得
 */
export function sampleSpectrum(
  spectrum: Spectrum,
  wavelength: number
): number | null {
  const indices = getInterpolationIndices(spectrum, wavelength)
  if (!indices) return null

  const { lower, upper, t } = indices
  return spectrum.values[lower]! * (1 - t) + spectrum.values[upper]! * t
}

/**
 * スペクトラムをコピー
 */
export function copySpectrum(spectrum: Spectrum): Spectrum {
  return {
    values: new Float32Array(spectrum.values),
    wavelengths: new Float32Array(spectrum.wavelengths),
  }
}

/**
 * スペクトラムをスケーリング
 */
export function scaleSpectrum(spectrum: Spectrum, factor: number): Spectrum {
  const result = copySpectrum(spectrum)
  for (let i = 0; i < result.values.length; i++) {
    result.values[i]! *= factor
  }
  return result
}

/**
 * 2つのスペクトラムを加算（同じ波長サンプリングを前提）
 */
export function addSpectra(a: Spectrum, b: Spectrum): Spectrum {
  if (a.values.length !== b.values.length) {
    throw new Error('Spectra must have the same sample count')
  }

  const result = copySpectrum(a)
  for (let i = 0; i < result.values.length; i++) {
    result.values[i]! += b.values[i]!
  }
  return result
}

/**
 * 2つのスペクトラムを乗算（フィルタリング）
 */
export function multiplySpectra(a: Spectrum, b: Spectrum): Spectrum {
  if (a.values.length !== b.values.length) {
    throw new Error('Spectra must have the same sample count')
  }

  const result = copySpectrum(a)
  for (let i = 0; i < result.values.length; i++) {
    result.values[i]! *= b.values[i]!
  }
  return result
}
