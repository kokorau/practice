import type { ColorPalette } from './ColorPalette'
import { $ColorPalette } from './ColorPalette'
import type { Srgb } from '../../../Color/Domain/ValueObject'

/**
 * Material Design 3 inspired palette
 */
export const createMaterial3Palette = (primaryColor: Srgb): ColorPalette => {
  return $ColorPalette.create({
    id: 'material3',
    name: 'Material Design 3',
    semantic: {
      primary: primaryColor,
      secondary: { r: primaryColor.r * 0.8, g: primaryColor.g * 0.9, b: primaryColor.b * 0.95 },
      tertiary: { r: primaryColor.r * 0.9, g: primaryColor.g * 0.8, b: primaryColor.b * 0.7 },
      success: { r: 0.2, g: 0.7, b: 0.4 },
      warning: { r: 1, g: 0.75, b: 0 },
      error: { r: 0.7, g: 0, b: 0.13 },
      info: { r: 0.13, g: 0.59, b: 0.95 },

      surface: { r: 1, g: 1, b: 1 },
      surfaceVariant: { r: 0.89, g: 0.91, b: 0.94 },
      background: { r: 0.98, g: 0.98, b: 0.98 },

      onPrimary: { r: 1, g: 1, b: 1 },
      onSecondary: { r: 1, g: 1, b: 1 },
      onTertiary: { r: 1, g: 1, b: 1 },
      onSurface: { r: 0.11, g: 0.11, b: 0.11 },
      onSurfaceVariant: { r: 0.27, g: 0.29, b: 0.31 },
      onBackground: { r: 0.11, g: 0.11, b: 0.11 },

      disabled: { r: 0.38, g: 0.38, b: 0.38 },
      outline: { r: 0.46, g: 0.46, b: 0.46 },
      shadow: { r: 0, g: 0, b: 0 },
    },
    brand: {
      main: primaryColor,
      accent: { r: primaryColor.g, g: primaryColor.b, b: primaryColor.r },
    },
  })
}

/**
 * Dark mode palette
 */
export const createDarkPalette = (): ColorPalette => {
  return $ColorPalette.create({
    id: 'dark',
    name: 'Dark Mode',
    semantic: {
      primary: { r: 0.5, g: 0.7, b: 1 },
      secondary: { r: 0.7, g: 0.5, b: 1 },
      success: { r: 0.4, g: 0.9, b: 0.5 },
      warning: { r: 1, g: 0.8, b: 0.3 },
      error: { r: 1, g: 0.4, b: 0.4 },
      info: { r: 0.3, g: 0.8, b: 1 },

      surface: { r: 0.12, g: 0.12, b: 0.14 },
      surfaceVariant: { r: 0.16, g: 0.16, b: 0.18 },
      background: { r: 0.08, g: 0.08, b: 0.1 },

      onPrimary: { r: 0.1, g: 0.1, b: 0.1 },
      onSecondary: { r: 0.1, g: 0.1, b: 0.1 },
      onSurface: { r: 0.9, g: 0.9, b: 0.9 },
      onSurfaceVariant: { r: 0.7, g: 0.7, b: 0.7 },
      onBackground: { r: 0.9, g: 0.9, b: 0.9 },

      disabled: { r: 0.4, g: 0.4, b: 0.4 },
      outline: { r: 0.3, g: 0.3, b: 0.3 },
    },
    grayScale: {
      gray50: { r: 0.1, g: 0.1, b: 0.1 },
      gray100: { r: 0.15, g: 0.15, b: 0.15 },
      gray200: { r: 0.2, g: 0.2, b: 0.2 },
      gray300: { r: 0.3, g: 0.3, b: 0.3 },
      gray400: { r: 0.4, g: 0.4, b: 0.4 },
      gray500: { r: 0.5, g: 0.5, b: 0.5 },
      gray600: { r: 0.6, g: 0.6, b: 0.6 },
      gray700: { r: 0.7, g: 0.7, b: 0.7 },
      gray800: { r: 0.8, g: 0.8, b: 0.8 },
      gray900: { r: 0.9, g: 0.9, b: 0.9 },
      gray950: { r: 0.95, g: 0.95, b: 0.95 },
    },
    brand: {
      main: { r: 0.5, g: 0.7, b: 1 },
    }
  })
}

/**
 * Pastel palette
 */
export const createPastelPalette = (): ColorPalette => {
  return $ColorPalette.create({
    id: 'pastel',
    name: 'Pastel',
    semantic: {
      primary: { r: 0.8, g: 0.7, b: 0.95 },
      secondary: { r: 0.95, g: 0.8, b: 0.8 },
      tertiary: { r: 0.8, g: 0.95, b: 0.9 },
      success: { r: 0.7, g: 0.9, b: 0.7 },
      warning: { r: 1, g: 0.9, b: 0.6 },
      error: { r: 1, g: 0.7, b: 0.7 },
      info: { r: 0.7, g: 0.85, b: 1 },

      surface: { r: 1, g: 0.98, b: 0.98 },
      surfaceVariant: { r: 0.98, g: 0.96, b: 0.98 },
      background: { r: 1, g: 0.99, b: 0.98 },

      onPrimary: { r: 0.2, g: 0.15, b: 0.3 },
      onSecondary: { r: 0.3, g: 0.15, b: 0.15 },
      onTertiary: { r: 0.15, g: 0.3, b: 0.25 },
      onSurface: { r: 0.2, g: 0.2, b: 0.25 },
      onSurfaceVariant: { r: 0.3, g: 0.3, b: 0.35 },
      onBackground: { r: 0.15, g: 0.15, b: 0.2 },

      disabled: { r: 0.5, g: 0.5, b: 0.55 },
      outline: { r: 0.6, g: 0.6, b: 0.65 },
    },
    brand: {
      main: { r: 0.8, g: 0.7, b: 0.95 },
      accent: { r: 0.95, g: 0.8, b: 0.8 },
    },
    albedo: {
      base: { r: 0.9, g: 0.85, b: 0.9 },
      highlights: { r: 1, g: 0.98, b: 0.98 },
      midtones: { r: 0.85, g: 0.8, b: 0.85 },
      shadows: { r: 0.6, g: 0.55, b: 0.65 },
    }
  })
}

/**
 * High contrast palette for accessibility
 */
export const createHighContrastPalette = (): ColorPalette => {
  return $ColorPalette.create({
    id: 'high-contrast',
    name: 'High Contrast',
    semantic: {
      primary: { r: 0, g: 0.3, b: 0.8 },
      secondary: { r: 0.6, g: 0, b: 0.7 },
      success: { r: 0, g: 0.6, b: 0.2 },
      warning: { r: 0.9, g: 0.6, b: 0 },
      error: { r: 0.8, g: 0, b: 0 },
      info: { r: 0, g: 0.5, b: 0.9 },

      surface: { r: 1, g: 1, b: 1 },
      surfaceVariant: { r: 0.98, g: 0.98, b: 0.98 },
      background: { r: 1, g: 1, b: 1 },

      onPrimary: { r: 1, g: 1, b: 1 },
      onSecondary: { r: 1, g: 1, b: 1 },
      onSurface: { r: 0, g: 0, b: 0 },
      onSurfaceVariant: { r: 0.1, g: 0.1, b: 0.1 },
      onBackground: { r: 0, g: 0, b: 0 },

      disabled: { r: 0.5, g: 0.5, b: 0.5 },
      outline: { r: 0, g: 0, b: 0 },
    },
    grayScale: {
      gray50: { r: 0.98, g: 0.98, b: 0.98 },
      gray100: { r: 0.94, g: 0.94, b: 0.94 },
      gray200: { r: 0.85, g: 0.85, b: 0.85 },
      gray300: { r: 0.7, g: 0.7, b: 0.7 },
      gray400: { r: 0.5, g: 0.5, b: 0.5 },
      gray500: { r: 0.4, g: 0.4, b: 0.4 },
      gray600: { r: 0.3, g: 0.3, b: 0.3 },
      gray700: { r: 0.2, g: 0.2, b: 0.2 },
      gray800: { r: 0.1, g: 0.1, b: 0.1 },
      gray900: { r: 0.05, g: 0.05, b: 0.05 },
      gray950: { r: 0, g: 0, b: 0 },
    },
    brand: {
      main: { r: 0, g: 0, b: 0 },
    }
  })
}