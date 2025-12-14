import type { ColorPalette } from '../../../ColorPalette/Domain/ValueObject'
import type { Srgb } from '@practice/color'

const srgbToCss = (color: Srgb): string => {
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)
  return `${r} ${g} ${b}`
}

export type ColorCssVariables = {
  '--color-base': string
  '--color-on-base': string
  '--color-primary': string
  '--color-on-primary': string
  '--color-secondary': string
  '--color-on-secondary': string
  '--color-brand': string
  '--color-on-brand': string
}

export const generateColorCssVariables = (palette: ColorPalette): ColorCssVariables => ({
  '--color-base': srgbToCss(palette.base),
  '--color-on-base': srgbToCss(palette.onBase),
  '--color-primary': srgbToCss(palette.primary),
  '--color-on-primary': srgbToCss(palette.onPrimary),
  '--color-secondary': srgbToCss(palette.secondary),
  '--color-on-secondary': srgbToCss(palette.onSecondary),
  '--color-brand': srgbToCss(palette.brand),
  '--color-on-brand': srgbToCss(palette.onBrand),
})

export const cssVariablesToStyleString = (vars: ColorCssVariables): string => {
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n')
}
