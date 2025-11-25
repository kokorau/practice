import { Point, SceneObject, Shadow, Reflection, AmbientLight } from '../Domain'
import type { LightType, AmbientLightType } from '../Domain'
import { CssShadowRenderer } from '../Infra/Css/CssShadowRenderer'
import { CssReflectionRenderer } from '../Infra/Css/CssReflectionRenderer'

/**
 * ライティングの設定（オブジェクトの物理特性）
 */
export type LightingConfig = {
  depth: number
  reflectivity: number
  colors: Record<string, string>
}

/**
 * CSS用のスタイル出力
 */
export type LightingStyle = {
  boxShadow: string
  reflection: string
  colors: Record<string, string>
}

/**
 * シーンのコンテキスト（光源と環境光）
 */
export type LightingContext = {
  lights: readonly LightType[]
  ambientLight: AmbientLightType
}

/**
 * オブジェクトの位置情報
 */
export type ObjectPosition = {
  x: number
  y: number
}

const DEFAULT_STYLE: LightingStyle = {
  boxShadow: 'none',
  reflection: 'none',
  colors: { bg: '#ffffff' },
}

/**
 * ライティング設定からCSSスタイルを計算するユースケース
 */
export const ComputeLightingStyle = {
  /**
   * 光源・環境光・オブジェクト設定からCSSスタイルを計算
   */
  execute(
    config: LightingConfig,
    position: ObjectPosition,
    context: LightingContext
  ): LightingStyle {
    if (context.lights.length === 0) {
      return {
        ...DEFAULT_STYLE,
        colors: config.colors,
      }
    }

    const obj = SceneObject.create('temp', Point.create(position.x, position.y), {
      width: 100,
      height: 100,
      depth: config.depth,
      reflectivity: config.reflectivity,
    })

    // 本影と半影を両方計算
    const allShadows: Array<ReturnType<typeof Shadow.calculate>> = []
    context.lights.forEach(light => {
      const { umbra, penumbra } = Shadow.calculateWithPenumbra(light, obj)
      allShadows.push(penumbra, umbra) // 半影→本影の順で重ねる
    })

    const highlights = context.lights.map(light => Shadow.calculateHighlight(light, obj))
    const reflections = context.lights.map(light => Reflection.calculate(light, obj))

    // 環境光を各色に適用
    const adjustedColors: Record<string, string> = {}
    for (const [key, color] of Object.entries(config.colors)) {
      adjustedColors[key] = AmbientLight.applyToColor(context.ambientLight, color)
    }

    return {
      boxShadow: CssShadowRenderer.toBoxShadowWithHighlight(allShadows, highlights),
      reflection: CssReflectionRenderer.toBackgroundMultiple(reflections),
      colors: adjustedColors,
    }
  },

  /**
   * デフォルトのスタイルを取得
   */
  defaultStyle(): LightingStyle {
    return { ...DEFAULT_STYLE }
  },
}
