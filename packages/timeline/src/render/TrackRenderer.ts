import type { Ms } from '../Unit'
import type { DslTrack } from '../Track'

/**
 * Canvas rendering context with device pixel ratio support.
 */
export interface RenderContext {
  ctx: CanvasRenderingContext2D
  /** Logical width in CSS pixels */
  width: number
  /** Logical height in CSS pixels */
  height: number
  /** Device pixel ratio for high-DPI displays */
  dpr: number
}

/**
 * Port interface for rendering tracks to canvas.
 * Implementations handle the actual drawing logic.
 */
export interface TrackRenderer {
  /**
   * Render a DSL-based track waveform.
   * Samples the DSL expression over the duration and draws the resulting curve.
   * @param context - Canvas rendering context
   * @param track - DSL track with expression
   * @param duration - Total duration to render (x-axis scale)
   */
  renderTrack(context: RenderContext, track: DslTrack, duration: Ms): void
}
