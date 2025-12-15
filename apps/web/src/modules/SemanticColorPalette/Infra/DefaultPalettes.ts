import { $SemanticColorPalette, type SemanticColorPalette } from '../Domain'

/**
 * Palette entry with id, name, and palette
 */
export type PaletteEntry = {
  id: string
  name: string
  palette: SemanticColorPalette
}

/**
 * Create a default light theme palette
 */
export const createDefaultLightPalette = (): SemanticColorPalette => {
  return $SemanticColorPalette.create({
    context: {
      canvas: {
        surface: 'oklch(0.98 0.005 260)',
        ink: {
          title: 'oklch(0.20 0.02 260)',
          body: 'oklch(0.30 0.02 260)',
          meta: 'oklch(0.50 0.02 260)',
          linkText: 'oklch(0.45 0.15 250)',
          border: 'oklch(0.85 0.01 260)',
          divider: 'oklch(0.90 0.01 260)',
        },
      },
      sectionNeutral: {
        surface: 'oklch(0.98 0.005 260)',
        ink: {
          title: 'oklch(0.20 0.02 260)',
          body: 'oklch(0.30 0.02 260)',
          meta: 'oklch(0.50 0.02 260)',
          linkText: 'oklch(0.45 0.15 250)',
          border: 'oklch(0.85 0.01 260)',
          divider: 'oklch(0.90 0.01 260)',
        },
      },
      sectionTint: {
        surface: 'oklch(0.95 0.02 260)',
        ink: {
          title: 'oklch(0.20 0.02 260)',
          body: 'oklch(0.30 0.02 260)',
          meta: 'oklch(0.50 0.02 260)',
          linkText: 'oklch(0.45 0.15 250)',
          border: 'oklch(0.82 0.02 260)',
          divider: 'oklch(0.88 0.01 260)',
        },
      },
      sectionContrast: {
        surface: 'oklch(0.50 0.18 250)',
        ink: {
          title: 'oklch(0.98 0.01 260)',
          body: 'oklch(0.92 0.02 260)',
          meta: 'oklch(0.80 0.04 260)',
          linkText: 'oklch(0.95 0.02 260)',
          border: 'oklch(0.40 0.14 250)',
          divider: 'oklch(0.45 0.15 250)',
        },
      },
    },
    component: {
      card: {
        surface: 'oklch(0.92 0.06 250)',
        ink: {
          title: 'oklch(0.20 0.02 260)',
          body: 'oklch(0.30 0.02 260)',
          meta: 'oklch(0.50 0.02 260)',
          linkText: 'oklch(0.45 0.15 250)',
          border: 'oklch(0.82 0.08 250)',
          divider: 'oklch(0.85 0.05 250)',
        },
      },
      cardFlat: {
        surface: 'oklch(0.99 0.002 260)',
        ink: {
          title: 'oklch(0.20 0.02 260)',
          body: 'oklch(0.30 0.02 260)',
          meta: 'oklch(0.50 0.02 260)',
          linkText: 'oklch(0.45 0.15 250)',
          border: 'oklch(0.88 0.01 260)',
          divider: 'oklch(0.90 0.01 260)',
        },
      },
      action: {
        surface: {
          default: 'oklch(0.55 0.20 250)',
          hover: 'oklch(0.50 0.22 250)',
          active: 'oklch(0.45 0.24 250)',
          disabled: 'oklch(0.80 0.02 260)',
        },
        ink: {
          title: {
            default: 'oklch(0.98 0.01 260)',
            hover: 'oklch(0.98 0.01 260)',
            active: 'oklch(0.98 0.01 260)',
            disabled: 'oklch(0.60 0.02 260)',
          },
          body: {
            default: 'oklch(0.95 0.01 260)',
            hover: 'oklch(0.95 0.01 260)',
            active: 'oklch(0.95 0.01 260)',
            disabled: 'oklch(0.55 0.02 260)',
          },
          meta: {
            default: 'oklch(0.90 0.02 260)',
            hover: 'oklch(0.90 0.02 260)',
            active: 'oklch(0.90 0.02 260)',
            disabled: 'oklch(0.50 0.02 260)',
          },
          linkText: {
            default: 'oklch(0.98 0.01 260)',
            hover: 'oklch(0.98 0.01 260)',
            active: 'oklch(0.98 0.01 260)',
            disabled: 'oklch(0.60 0.02 260)',
          },
          border: {
            default: 'oklch(0.55 0.20 250)',
            hover: 'oklch(0.50 0.22 250)',
            active: 'oklch(0.45 0.24 250)',
            disabled: 'oklch(0.75 0.02 260)',
          },
          divider: {
            default: 'oklch(0.55 0.20 250)',
            hover: 'oklch(0.50 0.22 250)',
            active: 'oklch(0.45 0.24 250)',
            disabled: 'oklch(0.75 0.02 260)',
          },
        },
      },
      actionQuiet: {
        surface: {
          default: 'transparent',
          hover: 'oklch(0.95 0.02 260)',
          active: 'oklch(0.92 0.03 260)',
          disabled: 'transparent',
        },
        ink: {
          title: {
            default: 'oklch(0.35 0.02 260)',
            hover: 'oklch(0.25 0.02 260)',
            active: 'oklch(0.20 0.02 260)',
            disabled: 'oklch(0.60 0.02 260)',
          },
          body: {
            default: 'oklch(0.40 0.02 260)',
            hover: 'oklch(0.30 0.02 260)',
            active: 'oklch(0.25 0.02 260)',
            disabled: 'oklch(0.55 0.02 260)',
          },
          meta: {
            default: 'oklch(0.50 0.02 260)',
            hover: 'oklch(0.40 0.02 260)',
            active: 'oklch(0.35 0.02 260)',
            disabled: 'oklch(0.60 0.02 260)',
          },
          linkText: {
            default: 'oklch(0.45 0.15 250)',
            hover: 'oklch(0.40 0.18 250)',
            active: 'oklch(0.35 0.20 250)',
            disabled: 'oklch(0.60 0.05 250)',
          },
          border: {
            default: 'oklch(0.75 0.02 260)',
            hover: 'oklch(0.65 0.04 260)',
            active: 'oklch(0.55 0.06 260)',
            disabled: 'oklch(0.85 0.01 260)',
          },
          divider: {
            default: 'oklch(0.80 0.01 260)',
            hover: 'oklch(0.70 0.02 260)',
            active: 'oklch(0.60 0.03 260)',
            disabled: 'oklch(0.88 0.01 260)',
          },
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
        ink: {
          title: 'oklch(0.95 0.01 260)',
          body: 'oklch(0.85 0.01 260)',
          meta: 'oklch(0.60 0.02 260)',
          linkText: 'oklch(0.70 0.15 250)',
          border: 'oklch(0.30 0.02 260)',
          divider: 'oklch(0.25 0.02 260)',
        },
      },
      sectionNeutral: {
        surface: 'oklch(0.15 0.02 260)',
        ink: {
          title: 'oklch(0.95 0.01 260)',
          body: 'oklch(0.85 0.01 260)',
          meta: 'oklch(0.60 0.02 260)',
          linkText: 'oklch(0.70 0.15 250)',
          border: 'oklch(0.30 0.02 260)',
          divider: 'oklch(0.25 0.02 260)',
        },
      },
      sectionTint: {
        surface: 'oklch(0.20 0.03 260)',
        ink: {
          title: 'oklch(0.95 0.01 260)',
          body: 'oklch(0.85 0.01 260)',
          meta: 'oklch(0.60 0.02 260)',
          linkText: 'oklch(0.70 0.15 250)',
          border: 'oklch(0.35 0.02 260)',
          divider: 'oklch(0.30 0.02 260)',
        },
      },
      sectionContrast: {
        surface: 'oklch(0.55 0.16 250)',
        ink: {
          title: 'oklch(0.98 0.01 260)',
          body: 'oklch(0.92 0.02 260)',
          meta: 'oklch(0.80 0.04 260)',
          linkText: 'oklch(0.95 0.02 260)',
          border: 'oklch(0.45 0.12 250)',
          divider: 'oklch(0.50 0.13 250)',
        },
      },
    },
    component: {
      card: {
        surface: 'oklch(0.28 0.06 250)',
        ink: {
          title: 'oklch(0.95 0.01 260)',
          body: 'oklch(0.85 0.01 260)',
          meta: 'oklch(0.60 0.02 260)',
          linkText: 'oklch(0.70 0.15 250)',
          border: 'oklch(0.35 0.08 250)',
          divider: 'oklch(0.32 0.05 250)',
        },
      },
      cardFlat: {
        surface: 'oklch(0.20 0.01 260)',
        ink: {
          title: 'oklch(0.95 0.01 260)',
          body: 'oklch(0.85 0.01 260)',
          meta: 'oklch(0.60 0.02 260)',
          linkText: 'oklch(0.70 0.15 250)',
          border: 'oklch(0.28 0.01 260)',
          divider: 'oklch(0.25 0.01 260)',
        },
      },
      action: {
        surface: {
          default: 'oklch(0.65 0.18 250)',
          hover: 'oklch(0.70 0.20 250)',
          active: 'oklch(0.60 0.22 250)',
          disabled: 'oklch(0.30 0.02 260)',
        },
        ink: {
          title: {
            default: 'oklch(0.98 0.01 260)',
            hover: 'oklch(0.98 0.01 260)',
            active: 'oklch(0.98 0.01 260)',
            disabled: 'oklch(0.50 0.02 260)',
          },
          body: {
            default: 'oklch(0.92 0.01 260)',
            hover: 'oklch(0.92 0.01 260)',
            active: 'oklch(0.92 0.01 260)',
            disabled: 'oklch(0.45 0.02 260)',
          },
          meta: {
            default: 'oklch(0.85 0.02 260)',
            hover: 'oklch(0.85 0.02 260)',
            active: 'oklch(0.85 0.02 260)',
            disabled: 'oklch(0.40 0.02 260)',
          },
          linkText: {
            default: 'oklch(0.98 0.01 260)',
            hover: 'oklch(0.98 0.01 260)',
            active: 'oklch(0.98 0.01 260)',
            disabled: 'oklch(0.50 0.02 260)',
          },
          border: {
            default: 'oklch(0.65 0.18 250)',
            hover: 'oklch(0.70 0.20 250)',
            active: 'oklch(0.60 0.22 250)',
            disabled: 'oklch(0.35 0.02 260)',
          },
          divider: {
            default: 'oklch(0.65 0.18 250)',
            hover: 'oklch(0.70 0.20 250)',
            active: 'oklch(0.60 0.22 250)',
            disabled: 'oklch(0.35 0.02 260)',
          },
        },
      },
      actionQuiet: {
        surface: {
          default: 'transparent',
          hover: 'oklch(0.25 0.02 260)',
          active: 'oklch(0.28 0.03 260)',
          disabled: 'transparent',
        },
        ink: {
          title: {
            default: 'oklch(0.85 0.01 260)',
            hover: 'oklch(0.90 0.01 260)',
            active: 'oklch(0.95 0.01 260)',
            disabled: 'oklch(0.50 0.02 260)',
          },
          body: {
            default: 'oklch(0.80 0.01 260)',
            hover: 'oklch(0.85 0.01 260)',
            active: 'oklch(0.90 0.01 260)',
            disabled: 'oklch(0.45 0.02 260)',
          },
          meta: {
            default: 'oklch(0.65 0.02 260)',
            hover: 'oklch(0.70 0.02 260)',
            active: 'oklch(0.75 0.02 260)',
            disabled: 'oklch(0.40 0.02 260)',
          },
          linkText: {
            default: 'oklch(0.70 0.15 250)',
            hover: 'oklch(0.75 0.18 250)',
            active: 'oklch(0.80 0.20 250)',
            disabled: 'oklch(0.50 0.05 250)',
          },
          border: {
            default: 'oklch(0.40 0.02 260)',
            hover: 'oklch(0.50 0.04 260)',
            active: 'oklch(0.55 0.06 260)',
            disabled: 'oklch(0.30 0.01 260)',
          },
          divider: {
            default: 'oklch(0.35 0.01 260)',
            hover: 'oklch(0.45 0.02 260)',
            active: 'oklch(0.50 0.03 260)',
            disabled: 'oklch(0.28 0.01 260)',
          },
        },
      },
    },
  })
}

/**
 * Get all available palette entries
 */
export const getPaletteEntries = (): PaletteEntry[] => [
  { id: 'default-light', name: 'Default Light', palette: createDefaultLightPalette() },
  { id: 'default-dark', name: 'Default Dark', palette: createDefaultDarkPalette() },
]
