import type { Srgb } from '../../../Color/Domain/ValueObject'

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
}
