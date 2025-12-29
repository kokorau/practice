import type { TexturePattern } from '../Domain'
import type { GetDefaultTexturePatterns } from '../Application'

/**
 * Default texture patterns for background layer
 */
const defaultTexturePatterns: TexturePattern[] = [
  {
    label: 'Solid',
    render: (r, c1) => r.renderSolid({ color: c1 }),
  },
  {
    label: 'Diagonal 45°',
    render: (r, c1, c2) =>
      r.renderStripe({ width1: 20, width2: 20, angle: Math.PI / 4, color1: c1, color2: c2 }),
  },
  {
    label: 'Horizontal',
    render: (r, c1, c2) =>
      r.renderStripe({ width1: 15, width2: 15, angle: 0, color1: c1, color2: c2 }),
  },
  {
    label: 'Vertical',
    render: (r, c1, c2) =>
      r.renderStripe({ width1: 10, width2: 10, angle: Math.PI / 2, color1: c1, color2: c2 }),
  },
  {
    label: 'Grid',
    render: (r, c1, c2) =>
      r.renderGrid({ lineWidth: 2, cellSize: 30, lineColor: c1, bgColor: c2 }),
  },
  {
    label: 'Polka Dot',
    render: (r, c1, c2) =>
      r.renderPolkaDot({ dotRadius: 10, spacing: 40, rowOffset: 0.5, dotColor: c1, bgColor: c2 }),
  },
  {
    label: 'Checker',
    render: (r, c1, c2) => r.renderChecker({ cellSize: 30, angle: 0, color1: c1, color2: c2 }),
  },
  {
    label: 'Diamond',
    render: (r, c1, c2) =>
      r.renderChecker({ cellSize: 30, angle: Math.PI / 4, color1: c1, color2: c2 }),
  },
]

/**
 * Get default texture patterns for background layer
 */
export const getDefaultTexturePatterns: GetDefaultTexturePatterns = () => defaultTexturePatterns
