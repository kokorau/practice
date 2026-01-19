import type { Ms } from '../Unit'
import type { Envelope } from '../Envelope'
import type { Generator } from '../Generator'
import type { RenderContext, TrackRenderer } from './TrackRenderer'
import { evaluateGenerator } from '../evaluate'

/**
 * Default canvas-based implementation of TrackRenderer.
 */
export function createCanvasTrackRenderer(): TrackRenderer {
  return {
    renderEnvelope(context: RenderContext, envelope: Envelope, duration: Ms): void {
      const { ctx, width, height } = context

      ctx.clearRect(0, 0, width, height)

      const points = [...envelope.points].sort((a, b) => a.time - b.time)
      if (points.length === 0) return

      // Convert to canvas coordinates
      const toX = (time: number) => (time / duration) * width
      const toY = (value: number) => (1 - value) * height

      // Draw curve
      ctx.strokeStyle = 'oklch(0.50 0.20 250)'
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()

      if (envelope.interpolation === 'Linear') {
        points.forEach((p, i) => {
          const x = toX(p.time)
          const y = toY(p.value)
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
      } else {
        // Bezier interpolation
        if (points.length === 1) {
          const x = toX(points[0]!.time)
          const y = toY(points[0]!.value)
          ctx.moveTo(x, y)
          ctx.lineTo(x, y)
        } else {
          ctx.moveTo(toX(points[0]!.time), toY(points[0]!.value))

          for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i]!
            const p1 = points[i + 1]!

            const x0 = toX(p0.time)
            const y0 = toY(p0.value)
            const x1 = toX(p1.time)
            const y1 = toY(p1.value)

            const cpX = (x0 + x1) / 2
            ctx.bezierCurveTo(cpX, y0, cpX, y1, x1, y1)
          }
        }
      }

      ctx.stroke()

      // Draw control points
      ctx.fillStyle = 'oklch(0.98 0 0)'
      ctx.strokeStyle = 'oklch(0.45 0.22 250)'
      ctx.lineWidth = 1.5

      points.forEach(p => {
        const x = toX(p.time)
        const y = toY(p.value)
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      })
    },

    renderGenerator(context: RenderContext, generator: Generator, duration: Ms): void {
      const { ctx, width, height } = context

      ctx.clearRect(0, 0, width, height)

      const sampleCount = Math.max(200, Math.floor(width))

      ctx.strokeStyle = 'oklch(0.50 0.20 150)'
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()

      for (let i = 0; i <= sampleCount; i++) {
        const t = (i / sampleCount) * duration
        const value = evaluateGenerator(generator, t)
        const x = (i / sampleCount) * width
        const y = (1 - value) * height

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }

      ctx.stroke()
    },
  }
}
