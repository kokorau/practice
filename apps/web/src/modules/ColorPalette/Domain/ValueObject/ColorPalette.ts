import type { Srgb } from '../../../Color/Domain/ValueObject'

/**
 * セマンティックカラーの定義
 * UIコンポーネントで使用される意味を持つ色
 */
export type SemanticColors = {
  primary: Srgb
  secondary: Srgb
  tertiary?: Srgb
  success: Srgb
  warning: Srgb
  error: Srgb
  info: Srgb

  // Surface colors
  surface: Srgb
  surfaceVariant: Srgb
  background: Srgb

  // Content colors
  onPrimary: Srgb
  onSecondary: Srgb
  onTertiary?: Srgb
  onSurface: Srgb
  onSurfaceVariant: Srgb
  onBackground: Srgb

  // State colors
  disabled: Srgb
  outline: Srgb
  shadow?: Srgb
}

/**
 * グレースケール階調
 * 中間色やコントラストレベルの管理
 */
export type GrayScale = {
  gray50: Srgb
  gray100: Srgb
  gray200: Srgb
  gray300: Srgb
  gray400: Srgb
  gray500: Srgb
  gray600: Srgb
  gray700: Srgb
  gray800: Srgb
  gray900: Srgb
  gray950: Srgb
}

/**
 * ブランドカラー
 * 企業・製品固有の色
 */
export type BrandColors = {
  main: Srgb
  accent?: Srgb
  variants?: Record<string, Srgb>
}

/**
 * アルベドカラー（物体色）
 * LUT変換前の基準色
 */
export type AlbedoColors = {
  base: Srgb
  highlights?: Srgb
  midtones?: Srgb
  shadows?: Srgb
}

/**
 * ColorPalette Value Object
 * Themeシステムで使用される色の完全な定義
 */
export type ColorPalette = {
  id: string
  name?: string
  description?: string

  semantic: SemanticColors
  grayScale: GrayScale
  brand: BrandColors
  albedo?: AlbedoColors

  // 追加のカスタムカラー
  custom?: Record<string, Srgb>

  // メタデータ
  metadata?: {
    createdAt?: string
    updatedAt?: string
    author?: string
    tags?: string[]
  }
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
    semantic: {
      // Primary colors
      primary: { r: 0.2, g: 0.4, b: 0.8 },
      secondary: { r: 0.5, g: 0.3, b: 0.7 },
      success: { r: 0.2, g: 0.7, b: 0.3 },
      warning: { r: 0.9, g: 0.7, b: 0.1 },
      error: { r: 0.9, g: 0.2, b: 0.2 },
      info: { r: 0.1, g: 0.6, b: 0.9 },

      // Surface colors
      surface: { r: 1, g: 1, b: 1 },
      surfaceVariant: { r: 0.95, g: 0.95, b: 0.97 },
      background: { r: 0.98, g: 0.98, b: 1 },

      // Content colors
      onPrimary: { r: 1, g: 1, b: 1 },
      onSecondary: { r: 1, g: 1, b: 1 },
      onSurface: { r: 0.1, g: 0.1, b: 0.1 },
      onSurfaceVariant: { r: 0.3, g: 0.3, b: 0.35 },
      onBackground: { r: 0.1, g: 0.1, b: 0.1 },

      // State colors
      disabled: { r: 0.6, g: 0.6, b: 0.65 },
      outline: { r: 0.7, g: 0.7, b: 0.75 },
    },
    grayScale: {
      gray50: { r: 0.98, g: 0.98, b: 0.98 },
      gray100: { r: 0.96, g: 0.96, b: 0.96 },
      gray200: { r: 0.9, g: 0.9, b: 0.9 },
      gray300: { r: 0.8, g: 0.8, b: 0.8 },
      gray400: { r: 0.6, g: 0.6, b: 0.6 },
      gray500: { r: 0.5, g: 0.5, b: 0.5 },
      gray600: { r: 0.4, g: 0.4, b: 0.4 },
      gray700: { r: 0.3, g: 0.3, b: 0.3 },
      gray800: { r: 0.2, g: 0.2, b: 0.2 },
      gray900: { r: 0.1, g: 0.1, b: 0.1 },
      gray950: { r: 0.05, g: 0.05, b: 0.05 },
    },
    brand: {
      main: { r: 0.2, g: 0.4, b: 0.8 },
    }
  }),

  /**
   * カスタムColorPaletteを作成
   */
  create: (params: {
    id: string
    name?: string
    semantic: Partial<SemanticColors>
    grayScale?: Partial<GrayScale>
    brand?: BrandColors
    albedo?: AlbedoColors
    custom?: Record<string, Srgb>
  }): ColorPalette => {
    const defaultPalette = $ColorPalette.createDefault()

    return {
      id: params.id,
      name: params.name,
      semantic: {
        ...defaultPalette.semantic,
        ...params.semantic,
      },
      grayScale: {
        ...defaultPalette.grayScale,
        ...(params.grayScale || {}),
      },
      brand: params.brand || defaultPalette.brand,
      albedo: params.albedo,
      custom: params.custom,
      metadata: {
        createdAt: new Date().toISOString(),
      }
    }
  },

  /**
   * 特定の色を取得
   */
  getColor: (palette: ColorPalette, path: string): Srgb | undefined => {
    const parts = path.split('.')
    let current: any = palette

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return undefined
      }
    }

    // Srgbオブジェクトかチェック
    if (current && typeof current === 'object' && 'r' in current && 'g' in current && 'b' in current) {
      return current as Srgb
    }

    return undefined
  },

  /**
   * パレットをマージ
   */
  merge: (base: ColorPalette, override: Partial<ColorPalette>): ColorPalette => {
    return {
      ...base,
      ...override,
      semantic: {
        ...base.semantic,
        ...(override.semantic || {}),
      },
      grayScale: {
        ...base.grayScale,
        ...(override.grayScale || {}),
      },
      brand: override.brand || base.brand,
      albedo: override.albedo || base.albedo,
      custom: {
        ...base.custom,
        ...override.custom,
      },
    }
  }
}