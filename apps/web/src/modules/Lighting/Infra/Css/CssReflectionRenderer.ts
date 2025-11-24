import type { Reflection } from '../../Domain/ValueObject/Reflection'

/**
 * HEX色をRGBAに変換
 */
const hexToRgba = (hex: string, alpha: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return `rgba(255, 255, 255, ${alpha})`
  const r = parseInt(result[1] ?? '0', 16)
  const g = parseInt(result[2] ?? '0', 16)
  const b = parseInt(result[3] ?? '0', 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * ReflectionをCSS gradient形式に変換するレンダラー
 */
export const CssReflectionRenderer = {
  /**
   * linear-gradient形式の文字列を生成（面全体の明るさ）
   */
  toLinearGradient(reflection: Reflection): string {
    const { angle, intensity, color } = reflection
    // 光源方向から明るくなるグラデーション
    // angleは光源への角度なので、その方向から開始
    const gradientAngle = angle + 180 // CSS gradientは下から始まるので調整
    const colorStart = hexToRgba(color, intensity * 0.4)
    const colorEnd = 'transparent'

    return `linear-gradient(${gradientAngle.toFixed(1)}deg, ${colorStart} 0%, ${colorEnd} 60%)`
  },

  /**
   * radial-gradient形式の文字列を生成（スペキュラー反射）
   */
  toRadialGradient(reflection: Reflection): string {
    const { specularX, specularY, specularSize, intensity, color } = reflection
    // スペキュラーの位置（%）
    const posX = (specularX * 100).toFixed(1)
    const posY = (specularY * 100).toFixed(1)
    // サイズ（%）
    const size = (specularSize * 100).toFixed(1)
    // 色
    const colorCenter = hexToRgba(color, intensity * 0.6)
    const colorEdge = 'transparent'

    return `radial-gradient(circle at ${posX}% ${posY}%, ${colorCenter} 0%, ${colorEdge} ${size}%)`
  },

  /**
   * 単一の反射から::before用のbackground文字列を生成
   */
  toBackground(reflection: Reflection): string {
    const radial = this.toRadialGradient(reflection)
    const linear = this.toLinearGradient(reflection)
    return `${radial}, ${linear}`
  },

  /**
   * 複数の反射から::before用のbackground文字列を生成
   */
  toBackgroundMultiple(reflections: Reflection[]): string {
    if (reflections.length === 0) return 'transparent'

    const gradients = reflections.flatMap((r) => [
      this.toRadialGradient(r),
      this.toLinearGradient(r),
    ])

    return gradients.join(', ')
  },
}
