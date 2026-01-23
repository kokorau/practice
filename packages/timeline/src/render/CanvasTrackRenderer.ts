import type { Ms } from '../Unit'
import type { DslTrack } from '../Track'
import type { RenderContext, TrackRenderer } from './TrackRenderer'
import { evaluate, parse } from '@practice/dsl'
import { evaluateLut } from '@practice/bezier'

/**
 * Default canvas-based implementation of TrackRenderer.
 */
export function createCanvasTrackRenderer(): TrackRenderer {
  return {
    renderTrack(context: RenderContext, track: DslTrack, duration: Ms): void {
      const { ctx, width, height } = context

      ctx.clearRect(0, 0, width, height)

      // Check if track uses bezier path
      const usesBezier = !!track._bezierLut

      // Sample the expression/bezier over time
      const sampleCount = Math.max(200, Math.floor(width))
      const values: number[] = []

      if (usesBezier && track._bezierLut) {
        // Use bezier LUT
        for (let i = 0; i <= sampleCount; i++) {
          const normalizedT = i / sampleCount // 0 to 1
          const value = evaluateLut(track._bezierLut, normalizedT)
          values.push(value)
        }
      } else if (track.expression) {
        // Get AST (use cached or parse)
        const ast = track._cachedAst ?? parse(track.expression)

        for (let i = 0; i <= sampleCount; i++) {
          const t = (i / sampleCount) * duration
          const value = evaluate(ast, { t })
          values.push(value)
        }
      } else {
        // No expression or bezier - draw flat line at 0
        for (let i = 0; i <= sampleCount; i++) {
          values.push(0)
        }
      }

      // Calculate display range based on actual values
      let displayMin = Math.min(...values)
      let displayMax = Math.max(...values)

      // Add padding and ensure minimum range
      const padding = 0.05
      displayMin = Math.min(displayMin - padding, -padding)
      displayMax = Math.max(displayMax + padding, 1 + padding)

      const displayRange = displayMax - displayMin

      // Normalize function: map value to display range
      const normalize = (v: number) => (v - displayMin) / displayRange

      // Draw reference lines for 0 and 1
      ctx.strokeStyle = 'oklch(0.40 0.02 260)'
      ctx.lineWidth = 0.5
      ctx.setLineDash([2, 2])

      // Line at y=0
      const y0 = (1 - normalize(0)) * height
      ctx.beginPath()
      ctx.moveTo(0, y0)
      ctx.lineTo(width, y0)
      ctx.stroke()

      // Line at y=1
      const y1 = (1 - normalize(1)) * height
      ctx.beginPath()
      ctx.moveTo(0, y1)
      ctx.lineTo(width, y1)
      ctx.stroke()

      ctx.setLineDash([])

      // Draw waveform
      ctx.strokeStyle = usesBezier ? 'oklch(0.60 0.25 160)' : 'oklch(0.50 0.20 200)'
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

      // Draw value range indicators
      ctx.fillStyle = 'oklch(0.55 0.02 260)'
      ctx.font = '9px system-ui'
      ctx.textBaseline = 'top'
      ctx.fillText(displayMax > 1.1 ? displayMax.toFixed(1) : '1', 2, 2)
      ctx.textBaseline = 'bottom'
      ctx.fillText(displayMin < -0.1 ? displayMin.toFixed(1) : '0', 2, height - 2)
    },
  }
}
