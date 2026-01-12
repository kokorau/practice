import type { SurfacePreset } from '../Domain'
import type { GetSurfacePresets } from '../Application'

/**
 * Default surface presets
 * Shared pattern definitions for background and midground layers
 */
const defaultSurfacePresets: SurfacePreset[] = [
  { label: 'Solid', params: { type: 'solid' } },
  { label: 'Diagonal 45°', params: { type: 'stripe', width1: 20, width2: 20, angle: Math.PI / 4 } },
  { label: 'Horizontal', params: { type: 'stripe', width1: 15, width2: 15, angle: 0 } },
  { label: 'Vertical', params: { type: 'stripe', width1: 10, width2: 10, angle: Math.PI / 2 } },
  { label: 'Horizontal Thin', params: { type: 'stripe', width1: 2, width2: 40, angle: 0 } },
  { label: 'Vertical Thin', params: { type: 'stripe', width1: 2, width2: 40, angle: Math.PI / 2 } },
  { label: 'Grid', params: { type: 'grid', lineWidth: 2, cellSize: 30 } },
  { label: 'Grid Wide', params: { type: 'grid', lineWidth: 2, cellSize: 60 } },
  { label: 'Polka Dot', params: { type: 'polkaDot', dotRadius: 10, spacing: 40, rowOffset: 0.5 } },
  { label: 'Dot Orthogonal', params: { type: 'polkaDot', dotRadius: 1.5, spacing: 12, rowOffset: 0 } },
  { label: 'Checker', params: { type: 'checker', cellSize: 30, angle: 0 } },
  { label: 'Diamond', params: { type: 'checker', cellSize: 30, angle: Math.PI / 4 } },
  {
    label: 'Gradient Grain',
    params: {
      type: 'gradientGrain',
      depthMapType: 'linear',
      angle: 90,
      centerX: 0.5,
      centerY: 0.5,
      radialStartAngle: 0,
      radialSweepAngle: 360,
      perlinScale: 4,
      perlinOctaves: 4,
      perlinContrast: 1,
      perlinOffset: 0,
      seed: 12345,
      sparsity: 0.75,
    },
  },
  { label: 'Triangle', params: { type: 'triangle', size: 30, angle: 0 } },
  { label: 'Triangle Rotated', params: { type: 'triangle', size: 30, angle: Math.PI / 6 } },
  { label: 'Hexagon', params: { type: 'hexagon', size: 20, angle: 0 } },
  { label: 'Hexagon Rotated', params: { type: 'hexagon', size: 20, angle: Math.PI / 6 } },
]

/**
 * Get default surface presets
 */
export const getSurfacePresets: GetSurfacePresets = () => defaultSurfacePresets
