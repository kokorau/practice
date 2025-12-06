import type { Oklch } from '../../Color/Domain/ValueObject/Oklch'
import type { FilterPreset } from '../Domain/ValueObject/FilterPreset'
import type { LightSource } from '../Domain/ValueObject/LightSource'
import type { ColorSystemResult, PaletteOutput } from '../Domain/ValueObject/PaletteOutput'
import type { RenderedColor, RenderedPalette } from '../Domain/ValueObject/RenderedColor'
import type { SemanticPalette } from '../Domain/ValueObject/SemanticPalette'

/**
 * Port for rendering OKLCH colors with light source and filter.
 *
 * This abstraction allows swapping rendering implementations:
 * - v0: Simple color temperature shift + LUT application
 * - Future: Spectral-based rendering, ACEScg pipeline, etc.
 */
export type ColorRenderer = {
  /**
   * Render a single OKLCH color with the given light source and filter.
   */
  render(oklch: Oklch, lightSource: LightSource, filter: FilterPreset): RenderedColor

  /**
   * Render an entire semantic palette.
   */
  renderPalette(
    semantic: SemanticPalette,
    lightSource: LightSource,
    filter: FilterPreset
  ): RenderedPalette
}

/**
 * Port for palette generation.
 * Handles the flow: BrandColor → PaletteOutput
 */
export type PaletteGenerator = {
  /**
   * Create a full palette from a brand color hex and accent color.
   */
  createPalette(brandColorHex: string, accentColorHex: string): PaletteOutput
}

/**
 * Port for CSS export.
 */
export type CssExporter = {
  /**
   * Export to CSS custom properties.
   */
  toCssVariables(palette: RenderedPalette): string

  /**
   * Export to JSON format.
   */
  toJSON(palette: RenderedPalette): Record<string, unknown>
}

/**
 * Aggregate port for the entire site simulation.
 */
export type SiteSimulatorService = {
  readonly renderer: ColorRenderer
  readonly paletteGenerator: PaletteGenerator
  readonly exporter: CssExporter

  /**
   * One-shot: Generate and render a palette from brand color.
   */
  simulate(
    brandColorHex: string,
    accentColorHex: string,
    lightSource: LightSource,
    filter: FilterPreset
  ): ColorSystemResult
}
