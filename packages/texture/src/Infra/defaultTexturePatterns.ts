import type { TexturePattern } from '../Domain'
import type { GetDefaultTexturePatterns } from '../Application'
import {
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
} from '../shaders'

/**
 * Default texture patterns for background layer
 */
const defaultTexturePatterns: TexturePattern[] = [
  {
    label: 'Solid',
    createSpec: (c1) => createSolidSpec({ color: c1 }),
  },
  {
    label: 'Diagonal 45°',
    createSpec: (c1, c2) =>
      createStripeSpec({ width1: 20, width2: 20, angle: Math.PI / 4, color1: c1, color2: c2 }),
  },
  {
    label: 'Horizontal',
    createSpec: (c1, c2) =>
      createStripeSpec({ width1: 15, width2: 15, angle: 0, color1: c1, color2: c2 }),
  },
  {
    label: 'Vertical',
    createSpec: (c1, c2) =>
      createStripeSpec({ width1: 10, width2: 10, angle: Math.PI / 2, color1: c1, color2: c2 }),
  },
  {
    label: 'Horizontal Thin',
    createSpec: (c1, c2) =>
      createStripeSpec({ width1: 2, width2: 40, angle: 0, color1: c1, color2: c2 }),
  },
  {
    label: 'Vertical Thin',
    createSpec: (c1, c2) =>
      createStripeSpec({ width1: 2, width2: 40, angle: Math.PI / 2, color1: c1, color2: c2 }),
  },
  {
    label: 'Grid',
    createSpec: (c1, c2) =>
      createGridSpec({ lineWidth: 2, cellSize: 30, lineColor: c1, bgColor: c2 }),
  },
  {
    label: 'Grid Wide',
    createSpec: (c1, c2) =>
      createGridSpec({ lineWidth: 2, cellSize: 60, lineColor: c1, bgColor: c2 }),
  },
  {
    label: 'Polka Dot',
    createSpec: (c1, c2) =>
      createPolkaDotSpec({ dotRadius: 10, spacing: 40, rowOffset: 0.5, dotColor: c1, bgColor: c2 }),
  },
  {
    label: 'Dot Orthogonal',
    createSpec: (c1, c2) =>
      createPolkaDotSpec({ dotRadius: 1.5, spacing: 12, rowOffset: 0, dotColor: c1, bgColor: c2 }),
  },
  {
    label: 'Checker',
    createSpec: (c1, c2) => createCheckerSpec({ cellSize: 30, angle: 0, color1: c1, color2: c2 }),
  },
  {
    label: 'Diamond',
    createSpec: (c1, c2) =>
      createCheckerSpec({ cellSize: 30, angle: Math.PI / 4, color1: c1, color2: c2 }),
  },
]

/**
 * Get default texture patterns for background layer
 */
export const getDefaultTexturePatterns: GetDefaultTexturePatterns = () => defaultTexturePatterns
