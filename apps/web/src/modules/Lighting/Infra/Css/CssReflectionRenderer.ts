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
   * radial-gradient形式の文字列を生成（拡散反射・全体の明るさ）
   * 光源位置を中心に距離ベースで明るさを広げる
   */
  toDiffuseGradient(reflection: Reflection): string {
    const { diffuseX, diffuseY, intensity, color } = reflection
    // 拡散反射の中心位置（0-1の相対位置を%に変換）
    const centerX = (diffuseX * 100).toFixed(1)
    const centerY = (diffuseY * 100).toFixed(1)

    const colorCenter = hexToRgba(color, intensity * 0.3)
    const colorEdge = 'transparent'

    return `radial-gradient(ellipse at ${centerX}% ${centerY}%, ${colorCenter} 0%, ${colorEdge} 80%)`
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
    const specular = this.toRadialGradient(reflection)
    const diffuse = this.toDiffuseGradient(reflection)
    return `${specular}, ${diffuse}`
  },

  /**
   * 複数の反射から::before用のbackground文字列を生成
   */
  toBackgroundMultiple(reflections: Reflection[]): string {
    if (reflections.length === 0) return 'transparent'

    const gradients = reflections.flatMap((r) => [
      this.toRadialGradient(r),
      this.toDiffuseGradient(r),
    ])

    return gradients.join(', ')
  },
}
