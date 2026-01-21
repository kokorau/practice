import type { Ms } from '../Unit'
import type { DslTrack } from '../Track'
import type { RenderContext, TrackRenderer } from './TrackRenderer'
import { evaluate, parse } from '@practice/dsl'

/**
 * Default canvas-based implementation of TrackRenderer.
 */
export function createCanvasTrackRenderer(): TrackRenderer {
  return {
    renderTrack(context: RenderContext, track: DslTrack, duration: Ms): void {
      const { ctx, width, height } = context

      ctx.clearRect(0, 0, width, height)

      // Get AST (use cached or parse)
      const ast = track._cachedAst ?? parse(track.expression)

      // Sample the expression over time
      const sampleCount = Math.max(200, Math.floor(width))

      // First pass: determine value range for normalization
      const values: number[] = []
      for (let i = 0; i <= sampleCount; i++) {
        const t = (i / sampleCount) * duration
        const value = evaluate(ast, { t })
        values.push(value)
      }

      const minValue = Math.min(...values)
      const maxValue = Math.max(...values)
      const valueRange = maxValue - minValue

      // Normalize function: map value to 0-1 range (or use as-is if flat)
      const normalize = valueRange > 0.0001
        ? (v: number) => (v - minValue) / valueRange
        : () => 0.5

      // Draw waveform
      ctx.strokeStyle = 'oklch(0.50 0.20 200)'
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()

      for (let i = 0; i <= sampleCount; i++) {
        const x = (i / sampleCount) * width
        const normalizedValue = normalize(values[i]!)
        const y = (1 - normalizedValue) * height

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }

      ctx.stroke()

      // Draw value range indicators (min/max labels)
      ctx.fillStyle = 'oklch(0.55 0.02 260)'
      ctx.font = '9px system-ui'
      ctx.textBaseline = 'top'
      ctx.fillText(maxValue.toFixed(1), 2, 2)
      ctx.textBaseline = 'bottom'
      ctx.fillText(minValue.toFixed(1), 2, height - 2)
    },
  }
}
