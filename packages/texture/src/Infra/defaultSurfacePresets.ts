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
    label: 'Grain Linear',
    params: {
      type: 'gradientGrainLinear',
      angle: 90,
      centerX: 0.5,
      centerY: 0.5,
      seed: 12345,
      sparsity: 0.75,
    },
  },
  {
    label: 'Grain Circular',
    params: {
      type: 'gradientGrainCircular',
      centerX: 0.5,
      centerY: 0.5,
      seed: 12345,
      sparsity: 0.75,
    },
  },
  {
    label: 'Grain Radial',
    params: {
      type: 'gradientGrainRadial',
      centerX: 0.5,
      centerY: 0.5,
      radialStartAngle: 0,
      radialSweepAngle: 360,
      seed: 12345,
      sparsity: 0.75,
    },
  },
  {
    label: 'Grain Perlin',
    params: {
      type: 'gradientGrainPerlin',
      perlinScale: 4,
      perlinOctaves: 4,
      perlinContrast: 1,
      perlinOffset: 0,
      seed: 12345,
      sparsity: 0.75,
    },
  },
  {
    label: 'Grain Curl',
    params: {
      type: 'gradientGrainCurl',
      perlinScale: 4,
      perlinOctaves: 4,
      perlinContrast: 1,
      perlinOffset: 0,
      curlIntensity: 1,
      seed: 12345,
      sparsity: 0.75,
    },
  },
  {
    label: 'Grain Curl Flow',
    params: {
      type: 'gradientGrainCurl',
      perlinScale: 3,
      perlinOctaves: 5,
      perlinContrast: 1.2,
      perlinOffset: 0,
      curlIntensity: 1.5,
      seed: 777,
      sparsity: 0.7,
    },
  },
  {
    label: 'Grain Curl Soft',
    params: {
      type: 'gradientGrainCurl',
      perlinScale: 2,
      perlinOctaves: 3,
      perlinContrast: 0.8,
      perlinOffset: 0.1,
      curlIntensity: 0.8,
      seed: 42,
      sparsity: 0.8,
    },
  },
  {
    label: 'Grain Simplex',
    params: {
      type: 'gradientGrainSimplex',
      simplexScale: 4,
      simplexOctaves: 4,
      simplexContrast: 1,
      simplexOffset: 0,
      seed: 12345,
      sparsity: 0.75,
    },
  },
  {
    label: 'Grain Simplex Soft',
    params: {
      type: 'gradientGrainSimplex',
      simplexScale: 3,
      simplexOctaves: 3,
      simplexContrast: 0.8,
      simplexOffset: 0.1,
      seed: 42,
      sparsity: 0.8,
    },
  },
  {
    label: 'Grain Simplex Dense',
    params: {
      type: 'gradientGrainSimplex',
      simplexScale: 6,
      simplexOctaves: 5,
      simplexContrast: 1.2,
      simplexOffset: 0,
      seed: 99,
      sparsity: 0.7,
    },
  },
  { label: 'Triangle', params: { type: 'triangle', size: 30, angle: 0 } },
  { label: 'Triangle Rotated', params: { type: 'triangle', size: 30, angle: Math.PI / 6 } },
  { label: 'Hexagon', params: { type: 'hexagon', size: 20, angle: 0 } },
  { label: 'Hexagon Rotated', params: { type: 'hexagon', size: 20, angle: Math.PI / 6 } },
  // Textile patterns
  { label: '麻の葉', params: { type: 'asanoha', size: 40, lineWidth: 1 } },
  { label: '青海波', params: { type: 'seigaiha', radius: 30, rings: 3, lineWidth: 1 } },
  { label: 'Wave', params: { type: 'wave', amplitude: 10, wavelength: 40, thickness: 8, angle: 0 } },
  { label: 'Wave Vertical', params: { type: 'wave', amplitude: 10, wavelength: 40, thickness: 8, angle: Math.PI / 2 } },
  { label: 'Scales', params: { type: 'scales', size: 24, overlap: 0.5, angle: 0 } },
  { label: 'Ogee', params: { type: 'ogee', width: 40, height: 60, lineWidth: 2 } },
  { label: 'Sunburst', params: { type: 'sunburst', rays: 12, centerX: 0.5, centerY: 0.5, twist: 0 } },
  { label: 'Spiral', params: { type: 'sunburst', rays: 8, centerX: 0.5, centerY: 0.5, twist: 0.5 } },
  // Paper textures
  {
    label: 'Paper Smooth',
    params: {
      type: 'paperTexture',
      fiberScale: 25,
      fiberStrength: 0.4,
      fiberWarp: 0.08,
      grainDensity: 0.2,
      grainSize: 1.2,
      bumpStrength: 0.02,
      lightAngle: 135,
      seed: 12345,
    },
  },
  {
    label: 'Paper Rough',
    params: {
      type: 'paperTexture',
      fiberScale: 15,
      fiberStrength: 0.7,
      fiberWarp: 0.15,
      grainDensity: 0.5,
      grainSize: 2.0,
      bumpStrength: 0.05,
      lightAngle: 135,
      seed: 54321,
    },
  },
  {
    label: 'Paper Kraft',
    params: {
      type: 'paperTexture',
      fiberScale: 12,
      fiberStrength: 0.3,
      fiberWarp: 0.12,
      grainDensity: 0.7,
      grainSize: 2.5,
      bumpStrength: 0.04,
      lightAngle: 120,
      seed: 99999,
    },
  },
]

/**
 * Get default surface presets
 */
export const getSurfacePresets: GetSurfacePresets = () => defaultSurfacePresets
