import { $SemanticColorPalette, type SemanticColorPalette } from '../Domain'

/**
 * Create a default light theme palette
 */
export const createDefaultLightPalette = (): SemanticColorPalette => {
  return $SemanticColorPalette.create({
    context: {
      canvas: {
        surface: 'oklch(0.98 0.005 260)',
        tintSurface: 'oklch(0.97 0.01 260)',
        title: 'oklch(0.20 0.02 260)',
        body: 'oklch(0.30 0.02 260)',
        meta: 'oklch(0.50 0.02 260)',
        linkText: 'oklch(0.45 0.15 250)',
        border: 'oklch(0.85 0.01 260)',
        divider: 'oklch(0.90 0.01 260)',
        accent: 'oklch(0.55 0.20 250)',
      },
      sectionNeutral: {
        surface: 'oklch(0.98 0.005 260)',
        tintSurface: 'oklch(0.96 0.01 260)',
        title: 'oklch(0.20 0.02 260)',
        body: 'oklch(0.30 0.02 260)',
        meta: 'oklch(0.50 0.02 260)',
        linkText: 'oklch(0.45 0.15 250)',
        border: 'oklch(0.85 0.01 260)',
        divider: 'oklch(0.90 0.01 260)',
        accent: 'oklch(0.55 0.20 250)',
      },
      sectionTint: {
        surface: 'oklch(0.95 0.02 260)',
        tintSurface: 'oklch(0.92 0.02 260)',
        title: 'oklch(0.20 0.02 260)',
        body: 'oklch(0.30 0.02 260)',
        meta: 'oklch(0.50 0.02 260)',
        linkText: 'oklch(0.45 0.15 250)',
        border: 'oklch(0.82 0.02 260)',
        divider: 'oklch(0.88 0.01 260)',
        accent: 'oklch(0.55 0.20 250)',
      },
      sectionContrast: {
        surface: 'oklch(0.20 0.02 260)',
        tintSurface: 'oklch(0.25 0.02 260)',
        title: 'oklch(0.95 0.01 260)',
        body: 'oklch(0.88 0.01 260)',
        meta: 'oklch(0.70 0.02 260)',
        linkText: 'oklch(0.70 0.15 250)',
        border: 'oklch(0.35 0.02 260)',
        divider: 'oklch(0.30 0.02 260)',
        accent: 'oklch(0.75 0.15 250)',
      },
    },
    component: {
      card: {
        surface: 'oklch(1.00 0 0)',
        tintSurface: 'oklch(0.96 0.02 250)',
        title: 'oklch(0.20 0.02 260)',
        body: 'oklch(0.30 0.02 260)',
        meta: 'oklch(0.50 0.02 260)',
        linkText: 'oklch(0.45 0.15 250)',
        border: 'oklch(0.85 0.02 260)',
        divider: 'oklch(0.90 0.01 260)',
        accent: 'oklch(0.55 0.20 250)',
      },
      cardFlat: {
        surface: 'transparent',
        tintSurface: 'oklch(0.95 0.01 260)',
        title: 'oklch(0.20 0.02 260)',
        body: 'oklch(0.30 0.02 260)',
        meta: 'oklch(0.50 0.02 260)',
        linkText: 'oklch(0.45 0.15 250)',
        border: 'oklch(0.80 0.02 260)',
        divider: 'oklch(0.88 0.01 260)',
        accent: 'oklch(0.55 0.15 250)',
      },
      action: {
        surface: {
          default: 'oklch(0.55 0.20 250)',
          hover: 'oklch(0.50 0.22 250)',
          active: 'oklch(0.45 0.24 250)',
          disabled: 'oklch(0.80 0.02 260)',
        },
        tintSurface: {
          default: 'oklch(0.92 0.04 250)',
          hover: 'oklch(0.88 0.06 250)',
          active: 'oklch(0.85 0.08 250)',
          disabled: 'oklch(0.92 0.01 260)',
        },
        border: {
          default: 'oklch(0.55 0.20 250)',
          hover: 'oklch(0.50 0.22 250)',
          active: 'oklch(0.45 0.24 250)',
          disabled: 'oklch(0.75 0.02 260)',
        },
        title: {
          default: 'oklch(0.98 0.01 260)',
          hover: 'oklch(0.98 0.01 260)',
          active: 'oklch(0.98 0.01 260)',
          disabled: 'oklch(0.60 0.02 260)',
        },
        linkText: {
          default: 'oklch(0.98 0.01 260)',
          hover: 'oklch(0.98 0.01 260)',
          active: 'oklch(0.98 0.01 260)',
          disabled: 'oklch(0.60 0.02 260)',
        },
      },
      actionQuiet: {
        surface: {
          default: 'transparent',
          hover: 'oklch(0.95 0.02 260)',
          active: 'oklch(0.92 0.03 260)',
          disabled: 'transparent',
        },
        tintSurface: {
          default: 'oklch(0.95 0.01 260)',
          hover: 'oklch(0.92 0.02 260)',
          active: 'oklch(0.88 0.03 260)',
          disabled: 'oklch(0.95 0.005 260)',
        },
        border: {
          default: 'oklch(0.75 0.02 260)',
          hover: 'oklch(0.65 0.04 260)',
          active: 'oklch(0.55 0.06 260)',
          disabled: 'oklch(0.85 0.01 260)',
        },
        title: {
          default: 'oklch(0.35 0.02 260)',
          hover: 'oklch(0.25 0.02 260)',
          active: 'oklch(0.20 0.02 260)',
          disabled: 'oklch(0.60 0.02 260)',
        },
        linkText: {
          default: 'oklch(0.45 0.15 250)',
          hover: 'oklch(0.40 0.18 250)',
          active: 'oklch(0.35 0.20 250)',
          disabled: 'oklch(0.60 0.05 250)',
        },
      },
    },
  })
}

/**
 * Create a default dark theme palette
 */
export const createDefaultDarkPalette = (): SemanticColorPalette => {
  return $SemanticColorPalette.create({
    context: {
      canvas: {
        surface: 'oklch(0.15 0.02 260)',
        tintSurface: 'oklch(0.18 0.02 260)',
        title: 'oklch(0.95 0.01 260)',
        body: 'oklch(0.85 0.01 260)',
        meta: 'oklch(0.60 0.02 260)',
        linkText: 'oklch(0.70 0.15 250)',
        border: 'oklch(0.30 0.02 260)',
        divider: 'oklch(0.25 0.02 260)',
        accent: 'oklch(0.65 0.18 250)',
      },
      sectionNeutral: {
        surface: 'oklch(0.15 0.02 260)',
        tintSurface: 'oklch(0.20 0.02 260)',
        title: 'oklch(0.95 0.01 260)',
        body: 'oklch(0.85 0.01 260)',
        meta: 'oklch(0.60 0.02 260)',
        linkText: 'oklch(0.70 0.15 250)',
        border: 'oklch(0.30 0.02 260)',
        divider: 'oklch(0.25 0.02 260)',
        accent: 'oklch(0.65 0.18 250)',
      },
      sectionTint: {
        surface: 'oklch(0.20 0.03 260)',
        tintSurface: 'oklch(0.25 0.02 260)',
        title: 'oklch(0.95 0.01 260)',
        body: 'oklch(0.85 0.01 260)',
        meta: 'oklch(0.60 0.02 260)',
        linkText: 'oklch(0.70 0.15 250)',
        border: 'oklch(0.35 0.02 260)',
        divider: 'oklch(0.30 0.02 260)',
        accent: 'oklch(0.65 0.18 250)',
      },
      sectionContrast: {
        surface: 'oklch(0.95 0.01 260)',
        tintSurface: 'oklch(0.92 0.01 260)',
        title: 'oklch(0.20 0.02 260)',
        body: 'oklch(0.30 0.02 260)',
        meta: 'oklch(0.50 0.02 260)',
        linkText: 'oklch(0.45 0.15 250)',
        border: 'oklch(0.80 0.01 260)',
        divider: 'oklch(0.85 0.01 260)',
        accent: 'oklch(0.50 0.20 250)',
      },
    },
    component: {
      card: {
        surface: 'oklch(0.22 0.02 260)',
        tintSurface: 'oklch(0.25 0.03 250)',
        title: 'oklch(0.95 0.01 260)',
        body: 'oklch(0.85 0.01 260)',
        meta: 'oklch(0.60 0.02 260)',
        linkText: 'oklch(0.70 0.15 250)',
        border: 'oklch(0.35 0.02 260)',
        divider: 'oklch(0.30 0.02 260)',
        accent: 'oklch(0.65 0.18 250)',
      },
      cardFlat: {
        surface: 'transparent',
        tintSurface: 'oklch(0.20 0.02 260)',
        title: 'oklch(0.95 0.01 260)',
        body: 'oklch(0.85 0.01 260)',
        meta: 'oklch(0.60 0.02 260)',
        linkText: 'oklch(0.70 0.15 250)',
        border: 'oklch(0.35 0.02 260)',
        divider: 'oklch(0.28 0.02 260)',
        accent: 'oklch(0.65 0.15 250)',
      },
      action: {
        surface: {
          default: 'oklch(0.65 0.18 250)',
          hover: 'oklch(0.70 0.20 250)',
          active: 'oklch(0.60 0.22 250)',
          disabled: 'oklch(0.30 0.02 260)',
        },
        tintSurface: {
          default: 'oklch(0.30 0.05 250)',
          hover: 'oklch(0.35 0.07 250)',
          active: 'oklch(0.28 0.08 250)',
          disabled: 'oklch(0.22 0.01 260)',
        },
        border: {
          default: 'oklch(0.65 0.18 250)',
          hover: 'oklch(0.70 0.20 250)',
          active: 'oklch(0.60 0.22 250)',
          disabled: 'oklch(0.35 0.02 260)',
        },
        title: {
          default: 'oklch(0.98 0.01 260)',
          hover: 'oklch(0.98 0.01 260)',
          active: 'oklch(0.98 0.01 260)',
          disabled: 'oklch(0.50 0.02 260)',
        },
        linkText: {
          default: 'oklch(0.98 0.01 260)',
          hover: 'oklch(0.98 0.01 260)',
          active: 'oklch(0.98 0.01 260)',
          disabled: 'oklch(0.50 0.02 260)',
        },
      },
      actionQuiet: {
        surface: {
          default: 'transparent',
          hover: 'oklch(0.25 0.02 260)',
          active: 'oklch(0.28 0.03 260)',
          disabled: 'transparent',
        },
        tintSurface: {
          default: 'oklch(0.22 0.01 260)',
          hover: 'oklch(0.28 0.02 260)',
          active: 'oklch(0.32 0.03 260)',
          disabled: 'oklch(0.20 0.005 260)',
        },
        border: {
          default: 'oklch(0.40 0.02 260)',
          hover: 'oklch(0.50 0.04 260)',
          active: 'oklch(0.55 0.06 260)',
          disabled: 'oklch(0.30 0.01 260)',
        },
        title: {
          default: 'oklch(0.85 0.01 260)',
          hover: 'oklch(0.90 0.01 260)',
          active: 'oklch(0.95 0.01 260)',
          disabled: 'oklch(0.50 0.02 260)',
        },
        linkText: {
          default: 'oklch(0.70 0.15 250)',
          hover: 'oklch(0.75 0.18 250)',
          active: 'oklch(0.80 0.20 250)',
          disabled: 'oklch(0.50 0.05 250)',
        },
      },
    },
  })
}
