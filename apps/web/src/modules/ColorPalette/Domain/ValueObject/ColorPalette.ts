import type { Srgb } from '../../../Color/Domain/ValueObject'
import { $Srgb } from '../../../Color/Domain/ValueObject'
import type { Lut1D, Lut3D } from '../../../Filter/Domain'
import { $Lut3D } from '../../../Filter/Domain'

/**
 * シンプルなカラーパレット
 * base, primary, secondary, brand の4色 + それぞれの上に載せる色
 */
export type ColorPalette = {
  id: string
  name?: string

  /** ベース色（背景） */
  base: Srgb
  /** ベース色の上に載せる色 */
  onBase: Srgb

  /** プライマリー色 */
  primary: Srgb
  /** プライマリー色の上に載せる色 */
  onPrimary: Srgb

  /** セカンダリー色 */
  secondary: Srgb
  /** セカンダリー色の上に載せる色 */
  onSecondary: Srgb

  /** ブランド色 */
  brand: Srgb
  /** ブランド色の上に載せる色 */
  onBrand: Srgb
}

/**
 * ColorPalette Factory
 */
export const $ColorPalette = {
  /**
   * デフォルトのColorPaletteを作成
   */
  createDefault: (): ColorPalette => ({
    id: 'default',
    name: 'Default Palette',

    base: { r: 0.98, g: 0.98, b: 0.98 },
    onBase: { r: 0.1, g: 0.1, b: 0.1 },

    primary: { r: 0.2, g: 0.4, b: 0.8 },
    onPrimary: { r: 1, g: 1, b: 1 },

    secondary: { r: 0.5, g: 0.3, b: 0.7 },
    onSecondary: { r: 1, g: 1, b: 1 },

    brand: { r: 0.2, g: 0.4, b: 0.8 },
    onBrand: { r: 1, g: 1, b: 1 },
  }),

  /**
   * カスタムColorPaletteを作成
   */
  create: (params: Partial<ColorPalette> & { id: string }): ColorPalette => {
    const defaultPalette = $ColorPalette.createDefault()
    return {
      ...defaultPalette,
      ...params,
    }
  },

  /**
   * LUTを使用してSrgb色を変換
   */
  applyLutToColor: (color: Srgb, lut: Lut1D | Lut3D): Srgb => {
    if ($Lut3D.is(lut)) {
      const [r, g, b] = $Lut3D.lookup(lut, color.r, color.g, color.b)
      return $Srgb.create(r, g, b)
    } else {
      // 1D LUT: 0-255インデックスでルックアップ
      const rgb255 = $Srgb.to255(color)
      const r = lut.r[rgb255.r]!
      const g = lut.g[rgb255.g]!
      const b = lut.b[rgb255.b]!
      return $Srgb.create(r, g, b)
    }
  },

  /**
   * ColorPalette全体にLUTを適用
   */
  applyLut: (palette: ColorPalette, lut: Lut1D | Lut3D): ColorPalette => {
    const applyColor = (color: Srgb) => $ColorPalette.applyLutToColor(color, lut)
    return {
      ...palette,
      base: applyColor(palette.base),
      onBase: applyColor(palette.onBase),
      primary: applyColor(palette.primary),
      onPrimary: applyColor(palette.onPrimary),
      secondary: applyColor(palette.secondary),
      onSecondary: applyColor(palette.onSecondary),
      brand: applyColor(palette.brand),
      onBrand: applyColor(palette.onBrand),
    }
  },
}
