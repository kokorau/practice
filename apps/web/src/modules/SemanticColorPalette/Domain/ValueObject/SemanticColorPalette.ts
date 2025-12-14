/**
 * Semantic color tokens for design-forward websites.
 *
 * Naming rule:
 *   color.<surface>.<role>.<state?>
 *
 * - surface: where the color lives (context / background plane)
 * - role: what the color is used for on that surface
 * - state: optional interaction state (default/hover/active/disabled)
 */

/**
 * Canvas surface tokens.
 * The page "ground". The farthest back layer.
 * - Light mode: usually pure/near-white or very low chroma tint.
 * - Dark mode: deep neutral.
 */
export interface CanvasTokens {
  /** Title text placed on the page background (headline / key labels). */
  readonly titleText: string
  /** Body text placed on the page background (paragraphs). */
  readonly bodyText: string
  /** Meta text placed on the page background (captions, meta). */
  readonly metaText: string
  /** Structural border/outline on canvas context (rare; mainly layout edges). */
  readonly border: string
  /** Decorative divider lines on canvas context (section separators, rules). */
  readonly divider: string
  /** Primary action color for CTA buttons on canvas. */
  readonly action: string
  /** Quieter action color for secondary buttons on canvas. */
  readonly actionQuiet: string
  /**
   * A gentle tinted fill used on canvas (highlight bands, soft background accents).
   * Use to avoid "everything is flat white" in light mode without feeling UI-ish.
   */
  readonly tintSurface: string
  /**
   * Link color for inline anchors on canvas (blog-like pages, editorial).
   * Often a calmer variant than accent to avoid over-shouting.
   */
  readonly linkText: string
}

/**
 * Section surface tokens.
 * A wide "underlay" for grouping content.
 * Used to create rhythm and section switching.
 */
export interface SectionTokens {
  readonly titleText: string
  readonly bodyText: string
  readonly metaText: string
  readonly border: string
  readonly divider: string
  /** Primary action color for CTA buttons on section. */
  readonly action: string
  /** Quieter action color for secondary buttons on section. */
  readonly actionQuiet: string
  /** Tinted section background fill (bands, panels, callouts). */
  readonly tintSurface: string
  /** Inline link color inside section content. */
  readonly linkText: string
}

/**
 * Card surface tokens.
 * A contained / emphasized card (the "stand-out" card).
 * This is the card you *want to pop* (via surface contrast and/or elevation).
 */
export interface CardTokens {
  readonly titleText: string
  readonly bodyText: string
  readonly metaText: string
  readonly border: string
  readonly divider: string
  /**
   * Primary action color used within the card.
   * CTA button fill, strong highlights, key numbers, tags.
   */
  readonly action: string
  /**
   * Quieter action color for secondary buttons, less prominent actions.
   */
  readonly actionQuiet: string
  /** Light tint fill used inside card (badges, subtle highlights, nested blocks). */
  readonly tintSurface: string
  /** Inline link color inside card content (article card, teaser). */
  readonly linkText: string
}

/**
 * CardFlat surface tokens.
 * A blended / quiet card (the "fade into layout" card).
 * - Often same or near-same as section/canvas surface.
 * - Differentiation comes from border/divider and spacing, not heavy fill.
 */
export interface CardFlatTokens {
  readonly titleText: string
  readonly bodyText: string
  readonly metaText: string
  /**
   * Important for cardFlat:
   * border is often the main way to show structure without "adding color".
   */
  readonly border: string
  readonly divider: string
  /**
   * Primary action color, typically used sparingly in flat cards.
   */
  readonly action: string
  /**
   * Quieter action color for secondary buttons, less prominent actions.
   */
  readonly actionQuiet: string
  /** Very soft tint for quiet callouts inside a flat card. */
  readonly tintSurface: string
  /** Inline link color inside cardFlat content. */
  readonly linkText: string
}

/**
 * Interactive surface tokens.
 * The "action plane": should read as clickable.
 * Interactive surfaces (buttons, links-as-buttons, chips).
 */
export interface InteractiveTokens {
  /**
   * Text on interactive elements (button label).
   * Often differs from canvas/section text due to contrast needs.
   */
  readonly titleText: string
  /**
   * Primary action color for interactive elements.
   * Typical usage:
   * - button background
   * - active states
   * - primary CTA
   */
  readonly action: string
  /**
   * Quieter action color for secondary buttons, less prominent actions.
   */
  readonly actionQuiet: string
  /** Tinted fill used for hover backgrounds, subtle chips, soft buttons. */
  readonly tintSurface: string
  /** Link color when used as interaction (non-button links, nav links). */
  readonly linkText: string
}

/**
 * Semantic Color Palette
 * Complete set of semantic color tokens for design-forward websites.
 */
export interface SemanticColorPalette {
  readonly canvas: CanvasTokens
  readonly section: SectionTokens
  readonly card: CardTokens
  readonly cardFlat: CardFlatTokens
  readonly interactive: InteractiveTokens
}

/**
 * Input type for creating SemanticColorPalette (mutable version)
 */
export type SemanticColorPaletteInput = {
  canvas: {
    titleText: string
    bodyText: string
    metaText: string
    border: string
    divider: string
    action: string
    actionQuiet: string
    tintSurface: string
    linkText: string
  }
  section: {
    titleText: string
    bodyText: string
    metaText: string
    border: string
    divider: string
    action: string
    actionQuiet: string
    tintSurface: string
    linkText: string
  }
  card: {
    titleText: string
    bodyText: string
    metaText: string
    border: string
    divider: string
    action: string
    actionQuiet: string
    tintSurface: string
    linkText: string
  }
  cardFlat: {
    titleText: string
    bodyText: string
    metaText: string
    border: string
    divider: string
    action: string
    actionQuiet: string
    tintSurface: string
    linkText: string
  }
  interactive: {
    titleText: string
    action: string
    actionQuiet: string
    tintSurface: string
    linkText: string
  }
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
      canvas: Object.freeze({ ...input.canvas }),
      section: Object.freeze({ ...input.section }),
      card: Object.freeze({ ...input.card }),
      cardFlat: Object.freeze({ ...input.cardFlat }),
      interactive: Object.freeze({ ...input.interactive }),
    })
  },

  /**
   * Create a default light theme palette
   */
  createDefaultLight: (): SemanticColorPalette => {
    return $SemanticColorPalette.create({
      canvas: {
        titleText: 'oklch(0.20 0.02 260)',
        bodyText: 'oklch(0.30 0.02 260)',
        metaText: 'oklch(0.50 0.02 260)',
        border: 'oklch(0.85 0.01 260)',
        divider: 'oklch(0.90 0.01 260)',
        action: 'oklch(0.55 0.20 250)',
        actionQuiet: 'oklch(0.65 0.10 250)',
        tintSurface: 'oklch(0.97 0.01 260)',
        linkText: 'oklch(0.45 0.15 250)',
      },
      section: {
        titleText: 'oklch(0.20 0.02 260)',
        bodyText: 'oklch(0.30 0.02 260)',
        metaText: 'oklch(0.50 0.02 260)',
        border: 'oklch(0.82 0.01 260)',
        divider: 'oklch(0.88 0.01 260)',
        action: 'oklch(0.55 0.20 250)',
        actionQuiet: 'oklch(0.65 0.10 250)',
        tintSurface: 'oklch(0.94 0.02 260)',
        linkText: 'oklch(0.45 0.15 250)',
      },
      card: {
        titleText: 'oklch(0.20 0.02 260)',
        bodyText: 'oklch(0.30 0.02 260)',
        metaText: 'oklch(0.50 0.02 260)',
        border: 'oklch(0.85 0.02 260)',
        divider: 'oklch(0.90 0.01 260)',
        action: 'oklch(0.55 0.20 250)',
        actionQuiet: 'oklch(0.65 0.10 250)',
        tintSurface: 'oklch(0.96 0.02 250)',
        linkText: 'oklch(0.45 0.15 250)',
      },
      cardFlat: {
        titleText: 'oklch(0.20 0.02 260)',
        bodyText: 'oklch(0.30 0.02 260)',
        metaText: 'oklch(0.50 0.02 260)',
        border: 'oklch(0.80 0.02 260)',
        divider: 'oklch(0.88 0.01 260)',
        action: 'oklch(0.55 0.15 250)',
        actionQuiet: 'oklch(0.65 0.08 250)',
        tintSurface: 'oklch(0.95 0.01 260)',
        linkText: 'oklch(0.45 0.15 250)',
      },
      interactive: {
        titleText: 'oklch(0.98 0.01 260)',
        action: 'oklch(0.55 0.20 250)',
        actionQuiet: 'oklch(0.65 0.10 250)',
        tintSurface: 'oklch(0.92 0.04 250)',
        linkText: 'oklch(0.45 0.18 250)',
      },
    })
  },

  /**
   * Create a default dark theme palette
   */
  createDefaultDark: (): SemanticColorPalette => {
    return $SemanticColorPalette.create({
      canvas: {
        titleText: 'oklch(0.95 0.01 260)',
        bodyText: 'oklch(0.85 0.01 260)',
        metaText: 'oklch(0.60 0.02 260)',
        border: 'oklch(0.30 0.02 260)',
        divider: 'oklch(0.25 0.02 260)',
        action: 'oklch(0.65 0.18 250)',
        actionQuiet: 'oklch(0.55 0.10 250)',
        tintSurface: 'oklch(0.18 0.02 260)',
        linkText: 'oklch(0.70 0.15 250)',
      },
      section: {
        titleText: 'oklch(0.95 0.01 260)',
        bodyText: 'oklch(0.85 0.01 260)',
        metaText: 'oklch(0.60 0.02 260)',
        border: 'oklch(0.32 0.02 260)',
        divider: 'oklch(0.28 0.02 260)',
        action: 'oklch(0.65 0.18 250)',
        actionQuiet: 'oklch(0.55 0.10 250)',
        tintSurface: 'oklch(0.22 0.02 260)',
        linkText: 'oklch(0.70 0.15 250)',
      },
      card: {
        titleText: 'oklch(0.95 0.01 260)',
        bodyText: 'oklch(0.85 0.01 260)',
        metaText: 'oklch(0.60 0.02 260)',
        border: 'oklch(0.35 0.02 260)',
        divider: 'oklch(0.30 0.02 260)',
        action: 'oklch(0.65 0.18 250)',
        actionQuiet: 'oklch(0.55 0.10 250)',
        tintSurface: 'oklch(0.25 0.03 250)',
        linkText: 'oklch(0.70 0.15 250)',
      },
      cardFlat: {
        titleText: 'oklch(0.95 0.01 260)',
        bodyText: 'oklch(0.85 0.01 260)',
        metaText: 'oklch(0.60 0.02 260)',
        border: 'oklch(0.35 0.02 260)',
        divider: 'oklch(0.28 0.02 260)',
        action: 'oklch(0.65 0.15 250)',
        actionQuiet: 'oklch(0.55 0.08 250)',
        tintSurface: 'oklch(0.20 0.02 260)',
        linkText: 'oklch(0.70 0.15 250)',
      },
      interactive: {
        titleText: 'oklch(0.98 0.01 260)',
        action: 'oklch(0.65 0.18 250)',
        actionQuiet: 'oklch(0.55 0.10 250)',
        tintSurface: 'oklch(0.30 0.05 250)',
        linkText: 'oklch(0.72 0.18 250)',
      },
    })
  },
}
