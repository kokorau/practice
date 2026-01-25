import type { SurfacePreset } from '../Domain'
import type { GetSurfacePresets, SurfacePresetRepository } from '../Application'
import { createInMemorySurfacePresetRepository } from '../Application'

/**
 * Default surface presets
 * Shared pattern definitions for background and midground layers
 */
const defaultSurfacePresets: SurfacePreset[] = [
  { label: 'Solid', params: { id: 'solid' } },
  { label: 'Diagonal 45°', params: { id: 'stripe', width1: 20, width2: 20, angle: Math.PI / 4 } },
  { label: 'Horizontal', params: { id: 'stripe', width1: 15, width2: 15, angle: 0 } },
  { label: 'Vertical', params: { id: 'stripe', width1: 10, width2: 10, angle: Math.PI / 2 } },
  { label: 'Horizontal Thin', params: { id: 'stripe', width1: 2, width2: 40, angle: 0 } },
  { label: 'Vertical Thin', params: { id: 'stripe', width1: 2, width2: 40, angle: Math.PI / 2 } },
  { label: 'Grid', params: { id: 'grid', lineWidth: 2, cellSize: 30 } },
  { label: 'Grid Wide', params: { id: 'grid', lineWidth: 2, cellSize: 60 } },
  { label: 'Polka Dot', params: { id: 'polkaDot', dotRadius: 10, spacing: 40, rowOffset: 0.5 } },
  { label: 'Dot Orthogonal', params: { id: 'polkaDot', dotRadius: 1.5, spacing: 12, rowOffset: 0 } },
  { label: 'Checker', params: { id: 'checker', cellSize: 30, angle: 0 } },
  { label: 'Diamond', params: { id: 'checker', cellSize: 30, angle: Math.PI / 4 } },
  // Smooth gradients (no grain)
  {
    label: 'Gradient Linear',
    params: {
      id: 'linearGradient',
      angle: 90,
      centerX: 0.5,
      centerY: 0.5,
    },
  },
  {
    label: 'Gradient Diagonal',
    params: {
      id: 'linearGradient',
      angle: 45,
      centerX: 0.5,
      centerY: 0.5,
    },
  },
  {
    label: 'Gradient Horizontal',
    params: {
      id: 'linearGradient',
      angle: 0,
      centerX: 0.5,
      centerY: 0.5,
    },
  },
  // Circular gradient (center outward)
  {
    label: 'Circular',
    params: {
      id: 'circularGradient',
      centerX: 0.5,
      centerY: 0.5,
      circularInvert: false,
    },
  },
  {
    label: 'Circular Invert',
    params: {
      id: 'circularGradient',
      centerX: 0.5,
      centerY: 0.5,
      circularInvert: true,
    },
  },
  // Conic gradient (angle-based)
  {
    label: 'Conic',
    params: {
      id: 'conicGradient',
      centerX: 0.5,
      centerY: 0.5,
      startAngle: 0,
      sweepAngle: 360,
    },
  },
  {
    label: 'Conic Half',
    params: {
      id: 'conicGradient',
      centerX: 0.5,
      centerY: 0.5,
      startAngle: 0,
      sweepAngle: 180,
    },
  },
  // Repeat linear gradient
  {
    label: 'Repeat Linear',
    params: {
      id: 'repeatLinearGradient',
      angle: 90,
      centerX: 0.5,
      centerY: 0.5,
      repeat: 3,
    },
  },
  {
    label: 'Repeat Diagonal',
    params: {
      id: 'repeatLinearGradient',
      angle: 45,
      centerX: 0.5,
      centerY: 0.5,
      repeat: 5,
    },
  },
  // Perlin gradient (smooth noise)
  {
    label: 'Perlin',
    params: {
      id: 'perlinGradient',
      scale: 4,
      octaves: 4,
      seed: 12345,
      contrast: 1,
      offset: 0,
    },
  },
  {
    label: 'Perlin Fine',
    params: {
      id: 'perlinGradient',
      scale: 8,
      octaves: 6,
      seed: 42,
      contrast: 1.2,
      offset: 0,
    },
  },
  // Curl gradient (flow-like patterns)
  {
    label: 'Curl',
    params: {
      id: 'curlGradient',
      scale: 4,
      octaves: 4,
      seed: 12345,
      contrast: 1,
      offset: 0,
      intensity: 1,
    },
  },
  {
    label: 'Curl Flow',
    params: {
      id: 'curlGradient',
      scale: 3,
      octaves: 5,
      seed: 777,
      contrast: 1.2,
      offset: 0,
      intensity: 1.5,
    },
  },
  // Gradient grain patterns
  {
    label: 'Grain Linear',
    params: {
      id: 'gradientGrainLinear',
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
      id: 'gradientGrainCircular',
      centerX: 0.5,
      centerY: 0.5,
      seed: 12345,
      sparsity: 0.75,
    },
  },
  {
    label: 'Grain Radial',
    params: {
      id: 'gradientGrainRadial',
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
      id: 'gradientGrainPerlin',
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
      id: 'gradientGrainCurl',
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
      id: 'gradientGrainCurl',
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
      id: 'gradientGrainCurl',
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
      id: 'gradientGrainSimplex',
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
      id: 'gradientGrainSimplex',
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
      id: 'gradientGrainSimplex',
      simplexScale: 6,
      simplexOctaves: 5,
      simplexContrast: 1.2,
      simplexOffset: 0,
      seed: 99,
      sparsity: 0.7,
    },
  },
  { label: 'Triangle', params: { id: 'triangle', size: 30, angle: 0 } },
  { label: 'Triangle Rotated', params: { id: 'triangle', size: 30, angle: Math.PI / 6 } },
  { label: 'Hexagon', params: { id: 'hexagon', size: 20, angle: 0 } },
  { label: 'Hexagon Rotated', params: { id: 'hexagon', size: 20, angle: Math.PI / 6 } },
  // Textile patterns
  { label: '麻の葉', params: { id: 'asanoha', size: 40, lineWidth: 1 } },
  { label: '青海波', params: { id: 'seigaiha', radius: 30, rings: 3, lineWidth: 1 } },
  { label: 'Wave', params: { id: 'wave', amplitude: 10, wavelength: 40, thickness: 8, angle: 0 } },
  { label: 'Wave Vertical', params: { id: 'wave', amplitude: 10, wavelength: 40, thickness: 8, angle: Math.PI / 2 } },
  { label: 'Scales', params: { id: 'scales', size: 24, overlap: 0.5, angle: 0 } },
  { label: 'Ogee', params: { id: 'ogee', width: 40, height: 60, lineWidth: 2 } },
  { label: 'Sunburst', params: { id: 'sunburst', rays: 12, centerX: 0.5, centerY: 0.5, twist: 0 } },
  { label: 'Spiral', params: { id: 'sunburst', rays: 8, centerX: 0.5, centerY: 0.5, twist: 0.5 } },
  // Paper textures
  {
    label: 'Paper Smooth',
    params: {
      id: 'paperTexture',
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
      id: 'paperTexture',
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
      id: 'paperTexture',
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
 * Get default surface presets (async)
 */
export const getSurfacePresets: GetSurfacePresets = async () => defaultSurfacePresets

/**
 * Default surface preset repository
 */
export const surfacePresetRepository: SurfacePresetRepository =
  createInMemorySurfacePresetRepository(defaultSurfacePresets)
