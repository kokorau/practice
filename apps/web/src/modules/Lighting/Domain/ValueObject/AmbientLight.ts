/**
 * 環境光を表す値オブジェクト
 */
export type AmbientLight = {
  readonly color: string // HEX color
  readonly intensity: number // 0-1
}

/**
 * HEX色をRGBに変換
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 255, g: 255, b: 255 }
  return {
    r: parseInt(result[1] ?? 'ff', 16),
    g: parseInt(result[2] ?? 'ff', 16),
    b: parseInt(result[3] ?? 'ff', 16),
  }
}

/**
 * RGBをHEXに変換
 */
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export const AmbientLight = {
  create(color: string = '#ffffff', intensity: number = 0): AmbientLight {
    return {
      color,
      intensity: Math.max(0, Math.min(1, intensity)),
    }
  },

  setColor(ambient: AmbientLight, color: string): AmbientLight {
    return { ...ambient, color }
  },

  setIntensity(ambient: AmbientLight, intensity: number): AmbientLight {
    return { ...ambient, intensity: Math.max(0, Math.min(1, intensity)) }
  },

  /**
   * オブジェクトの色に環境光を適用
   * 乗算ブレンドで色を混ぜる
   */
  applyToColor(ambient: AmbientLight, objectColor: string): string {
    if (ambient.intensity === 0) return objectColor

    const objRgb = hexToRgb(objectColor)
    const ambRgb = hexToRgb(ambient.color)

    // 乗算ブレンド: obj * (amb / 255)
    // intensity で元の色とブレンド結果を補間
    const blend = (obj: number, amb: number) => {
      const multiplied = (obj * amb) / 255
      return obj + (multiplied - obj) * ambient.intensity
    }

    return rgbToHex(
      blend(objRgb.r, ambRgb.r),
      blend(objRgb.g, ambRgb.g),
      blend(objRgb.b, ambRgb.b)
    )
  },

  /**
   * 複数の色に環境光を一括適用
   */
  applyToColors(
    ambient: AmbientLight,
    colors: Record<string, string>
  ): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, color] of Object.entries(colors)) {
      result[key] = AmbientLight.applyToColor(ambient, color)
    }
    return result
  },
}
