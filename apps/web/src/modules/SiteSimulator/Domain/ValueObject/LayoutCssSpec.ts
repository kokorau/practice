import type { SemanticColorToken } from './SemanticPalette'

/**
 * CSS variable name (e.g., "--color-brand-primary").
 */
export type CssVarName = `--${string}`

/**
 * Mapping from SemanticColorToken to CSS variable name.
 */
export type ColorVariableMap = {
  readonly [token in SemanticColorToken]: CssVarName
}

/**
 * CSS variable values (variable name -> CSS value string).
 */
export type CssVariableValues = Record<CssVarName, string>

/**
 * A single CSS rule (selector + declarations).
 */
export type CssRuleTemplate = {
  /** CSS selector (e.g., '[data-bg-color="brand.primary"]') */
  readonly selector: string

  /** CSS declarations (e.g., { "background-color": "var(--color-brand-primary)" }) */
  readonly declarations: Record<string, string>
}

/**
 * LayoutCssSpec defines the complete CSS specification
 * for the layout system.
 */
export type LayoutCssSpec = {
  /**
   * Theme root selector (e.g., ":root" or ".theme-default")
   */
  readonly themeRootSelector: string

  /**
   * Mapping from SemanticColorToken to CSS variable names.
   */
  readonly colorVarMap: ColorVariableMap

  /**
   * Actual CSS variable values (generated from palette).
   */
  readonly colorVarValues: CssVariableValues

  /**
   * CSS rules that respond to data-* attributes.
   * - Background colors
   * - Text colors
   * - Border colors
   * - Material/thickness/elevation shadows
   */
  readonly rules: ReadonlyArray<CssRuleTemplate>
}

export const $LayoutCssSpec = {
  create: undefined as unknown as (
    themeRootSelector: string,
    colorVarMap: ColorVariableMap,
    colorVarValues: CssVariableValues,
    rules: CssRuleTemplate[]
  ) => LayoutCssSpec,

  toCssString: undefined as unknown as (spec: LayoutCssSpec) => string,
}
