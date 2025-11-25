import { Point, SceneObject, Shadow, Reflection, Illumination } from '../Domain'
import type { LightType, AmbientLightType, PanelLightType, PreparedIlluminationContext } from '../Domain'
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
  panelLight?: PanelLightType
}

/**
 * 事前計算済みのライティングコンテキスト
 */
export type PreparedLightingContext = {
  lights: readonly LightType[]
  illuminationCtx: PreparedIlluminationContext
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
   * ライティングコンテキストを事前計算
   * 光源設定が変わったときだけ呼び出す
   */
  prepareContext(context: LightingContext): PreparedLightingContext {
    return {
      lights: context.lights,
      illuminationCtx: Illumination.prepareContext(
        context.lights,
        context.ambientLight,
        context.panelLight
      ),
    }
  },

  /**
   * 事前計算済みコンテキストを使ってCSSスタイルを計算（最適化版）
   */
  executeFast(
    config: LightingConfig,
    position: ObjectPosition,
    preparedCtx: PreparedLightingContext
  ): LightingStyle {
    const obj = SceneObject.create('temp', Point.create(position.x, position.y), {
      width: 100,
      height: 100,
      depth: config.depth,
      reflectivity: config.reflectivity,
    })

    // 本影と半影を両方計算（光源の位置に依存するため毎回必要）
    const allShadows: Array<ReturnType<typeof Shadow.calculate>> = []
    preparedCtx.lights.forEach(light => {
      const { umbra, penumbra } = Shadow.calculateWithPenumbra(light, obj)
      allShadows.push(penumbra, umbra)
    })

    const highlights = preparedCtx.lights.map(light => Shadow.calculateHighlight(light, obj))
    const reflections = preparedCtx.lights.map(light => Reflection.calculate(light, obj))

    // 最適化版の照明計算（事前計算済みコンテキスト使用）
    const illuminatedColors = Illumination.calculateColorsFast(
      config.colors,
      preparedCtx.illuminationCtx,
      position.x,
      position.y,
      config.depth
    )

    return {
      boxShadow: CssShadowRenderer.toBoxShadowWithHighlight(allShadows, highlights),
      reflection: CssReflectionRenderer.toBackgroundMultiple(reflections),
      colors: illuminatedColors,
    }
  },

  /**
   * 光源・環境光・オブジェクト設定からCSSスタイルを計算（従来版、互換性維持）
   */
  execute(
    config: LightingConfig,
    position: ObjectPosition,
    context: LightingContext
  ): LightingStyle {
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

    // 物理ベースの照明計算: albedo × (環境光 + 直接光 + パネルライト)
    const illuminatedColors = Illumination.calculateColors(
      config.colors,
      context.lights,
      context.ambientLight,
      obj,
      context.panelLight
    )

    return {
      boxShadow: CssShadowRenderer.toBoxShadowWithHighlight(allShadows, highlights),
      reflection: CssReflectionRenderer.toBackgroundMultiple(reflections),
      colors: illuminatedColors,
    }
  },

  /**
   * デフォルトのスタイルを取得
   */
  defaultStyle(): LightingStyle {
    return { ...DEFAULT_STYLE }
  },
}
