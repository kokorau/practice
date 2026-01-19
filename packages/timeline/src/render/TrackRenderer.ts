import type { Ms } from '../Unit'
import type { Envelope } from '../Envelope'
import type { Generator } from '../Generator'

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
   * Render an envelope curve.
   * @param context - Canvas rendering context
   * @param envelope - Envelope data with control points
   * @param duration - Total duration to render (x-axis scale)
   */
  renderEnvelope(context: RenderContext, envelope: Envelope, duration: Ms): void

  /**
   * Render a generator waveform.
   * @param context - Canvas rendering context
   * @param generator - Generator configuration
   * @param duration - Total duration to render (x-axis scale)
   */
  renderGenerator(context: RenderContext, generator: Generator, duration: Ms): void
}
