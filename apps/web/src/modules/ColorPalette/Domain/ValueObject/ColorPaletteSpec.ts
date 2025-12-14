import type { Srgb } from '@practice/color'

export type ColorPair = {
  color: Srgb
  onColor: Srgb
}

export type BrandColors = {
  brand: ColorPair
  primary: ColorPair
  secondary: ColorPair
  accent: ColorPair
}

export type SurfaceColors = {
  background: ColorPair
  card: ColorPair
  popover: ColorPair
  muted: ColorPair
}

export type ColorPaletteSpec = {
  id: string
  name: string
  brand: BrandColors
  surface: SurfaceColors
  isDark: boolean
}
