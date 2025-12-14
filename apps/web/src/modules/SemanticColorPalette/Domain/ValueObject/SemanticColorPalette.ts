/**
 * Semantic Color System (vNext)
 *
 * Key idea:
 * - Context (Canvas / Section) defines the "place" (non-nestable for Section).
 * - Components (Card / Action) define nested UI objects (nestable).
 * - State belongs to Components and can affect internal roles (e.g. action.title changes on hover).
 *
 * Resolution rule (conceptual):
 * 1) If a node is inside a component, use the nearest component tokens.
 * 2) Otherwise use the nearest context tokens (section -> canvas).
 * 3) Canvas is the implicit base context.
 */

export type ColorValue = string
export type ActionState = 'default' | 'hover' | 'active' | 'disabled'

/** Common text roles used across contexts/components. */
export type TextRoles = {
  /** Headings, card titles, button labels. */
  readonly title: ColorValue
  /** Paragraph text. */
  readonly body: ColorValue
  /** Captions, notes, dates, tags, low-emphasis text. */
  readonly meta: ColorValue
  /** Inline anchors. */
  readonly linkText: ColorValue
}

/** Structural and decorative roles. */
export type LineRoles = {
  /** Structure outlines, separators that define layout. */
  readonly border: ColorValue
  /** Decorative separators / rhythm rules. */
  readonly divider: ColorValue
}

/** Surface roles. */
export type SurfaceRoles = {
  /** The surface fill color itself (the "plate"). */
  readonly surface: ColorValue
  /**
   * A gentle tinted fill used on top of a surface:
   * badges, highlight rows, soft callouts, (and for actions: hover bg, etc.)
   */
  readonly tintSurface: ColorValue
}

/** Context tokens: define places. No states. */
export type ContextTokens = TextRoles &
  LineRoles &
  SurfaceRoles & {
    /** Optional emphasis color available within this context. */
    readonly accent?: ColorValue
  }

/**
 * Component tokens: define nestable objects.
 * Base (stateless) component tokens, good for card-like components.
 */
export type ComponentTokens = TextRoles &
  LineRoles &
  SurfaceRoles & {
    /** Emphasis color used inside the component (CTAs, highlights). */
    readonly accent?: ColorValue
  }

/**
 * Stateful component tokens: per-role state maps.
 * (We avoid making state the 3rd segment globally; it's per-role here.)
 */
export type StatefulComponentTokens = {
  readonly surface: Readonly<Record<ActionState, ColorValue>>
  readonly tintSurface: Readonly<Record<ActionState, ColorValue>>
  readonly border: Readonly<Record<ActionState, ColorValue>>

  readonly title: Readonly<Record<ActionState, ColorValue>>
  readonly linkText: Readonly<Record<ActionState, ColorValue>>

  /**
   * Optional: Some designs change these too, but keep optional to avoid bloat.
   * If you don't need them, omit and fall back to title/linkText.
   */
  readonly body?: Readonly<Record<ActionState, ColorValue>>
  readonly meta?: Readonly<Record<ActionState, ColorValue>>

  /** Emphasis color for the action; may vary by state. */
  readonly accent?: Readonly<Record<ActionState, ColorValue>>

  /** Decorative divider is rarely needed on actions, keep optional. */
  readonly divider?: Readonly<Record<ActionState, ColorValue>>
}

/** --------- The system --------- */

export type ContextTokensCollection = {
  /**
   * Canvas = world / ground / air.
   * Can be omitted in markup; it is assumed as the base context.
   */
  readonly canvas: ContextTokens

  /**
   * Section = chapter / meaningful grouping.
   * NOTE: Section should not nest inside Section.
   */
  /** SectionNeutral: Same or near-same as canvas. */
  readonly sectionNeutral: ContextTokens

  /** Section with gentle mood (colored underlay). */
  readonly sectionTint: ContextTokens

  /** Section with strong transition (hero bands / scene changes). */
  readonly sectionContrast: ContextTokens
}

export type ComponentTokensCollection = {
  /**
   * Card = emphasized / contained object.
   * Can contain other components (e.g. card -> action).
   */
  readonly card: ComponentTokens

  /**
   * CardFlat = quiet / blended object.
   * Primary differentiation comes from border + spacing rather than fill.
   */
  readonly cardFlat: ComponentTokens

  /**
   * Action = emphasized action (CTA).
   * Stateful: label color and bg can change with state.
   */
  readonly action: StatefulComponentTokens

  /**
   * ActionQuiet = quiet action (secondary/ghost/outline).
   * Stateful as well, but tends to rely more on border + tintSurface for affordance.
   */
  readonly actionQuiet: StatefulComponentTokens
}

/**
 * Semantic Color Palette
 * Complete set of semantic color tokens for design-forward websites.
 */
export interface SemanticColorPalette {
  readonly context: ContextTokensCollection
  readonly component: ComponentTokensCollection
}

/**
 * Input types for creating SemanticColorPalette (mutable version)
 */
type ContextTokensInput = {
  surface: ColorValue
  tintSurface: ColorValue
  title: ColorValue
  body: ColorValue
  meta: ColorValue
  linkText: ColorValue
  border: ColorValue
  divider: ColorValue
  accent?: ColorValue
}

type ComponentTokensInput = {
  surface: ColorValue
  tintSurface: ColorValue
  title: ColorValue
  body: ColorValue
  meta: ColorValue
  linkText: ColorValue
  border: ColorValue
  divider: ColorValue
  accent?: ColorValue
}

type StateMap<T> = Record<ActionState, T>

type StatefulComponentTokensInput = {
  surface: StateMap<ColorValue>
  tintSurface: StateMap<ColorValue>
  border: StateMap<ColorValue>
  title: StateMap<ColorValue>
  linkText: StateMap<ColorValue>
  body?: StateMap<ColorValue>
  meta?: StateMap<ColorValue>
  accent?: StateMap<ColorValue>
  divider?: StateMap<ColorValue>
}

export type SemanticColorPaletteInput = {
  context: {
    canvas: ContextTokensInput
    sectionNeutral: ContextTokensInput
    sectionTint: ContextTokensInput
    sectionContrast: ContextTokensInput
  }
  component: {
    card: ComponentTokensInput
    cardFlat: ComponentTokensInput
    action: StatefulComponentTokensInput
    actionQuiet: StatefulComponentTokensInput
  }
}

/**
 * Helper to freeze state maps
 */
const freezeStateMap = <T>(map: StateMap<T>): Readonly<Record<ActionState, T>> =>
  Object.freeze({ ...map })

/**
 * Helper to freeze stateful component tokens
 */
const freezeStatefulComponent = (
  input: StatefulComponentTokensInput
): StatefulComponentTokens => {
  const result: StatefulComponentTokens = {
    surface: freezeStateMap(input.surface),
    tintSurface: freezeStateMap(input.tintSurface),
    border: freezeStateMap(input.border),
    title: freezeStateMap(input.title),
    linkText: freezeStateMap(input.linkText),
  }

  // Add optional properties if present
  if (input.body) {
    ;(result as { body: Readonly<Record<ActionState, ColorValue>> }).body =
      freezeStateMap(input.body)
  }
  if (input.meta) {
    ;(result as { meta: Readonly<Record<ActionState, ColorValue>> }).meta =
      freezeStateMap(input.meta)
  }
  if (input.accent) {
    ;(result as { accent: Readonly<Record<ActionState, ColorValue>> }).accent =
      freezeStateMap(input.accent)
  }
  if (input.divider) {
    ;(result as { divider: Readonly<Record<ActionState, ColorValue>> }).divider =
      freezeStateMap(input.divider)
  }

  return Object.freeze(result)
}

/**
 * SemanticColorPalette Factory
 */
export const $SemanticColorPalette = {
  /**
   * Create a readonly SemanticColorPalette from input
   */
  create: (input: SemanticColorPaletteInput): SemanticColorPalette => {
    return Object.freeze({
      context: Object.freeze({
        canvas: Object.freeze({ ...input.context.canvas }),
        sectionNeutral: Object.freeze({ ...input.context.sectionNeutral }),
        sectionTint: Object.freeze({ ...input.context.sectionTint }),
        sectionContrast: Object.freeze({ ...input.context.sectionContrast }),
      }),
      component: Object.freeze({
        card: Object.freeze({ ...input.component.card }),
        cardFlat: Object.freeze({ ...input.component.cardFlat }),
        action: freezeStatefulComponent(input.component.action),
        actionQuiet: freezeStatefulComponent(input.component.actionQuiet),
      }),
    })
  },

  /**
   * Create a default light theme palette
   */
  createDefaultLight: (): SemanticColorPalette => {
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
  },

  /**
   * Create a default dark theme palette
   */
  createDefaultDark: (): SemanticColorPalette => {
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
  },
}
