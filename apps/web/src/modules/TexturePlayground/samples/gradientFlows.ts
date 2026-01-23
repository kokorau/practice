import type { SampleDefinition, SampleParams, ParamDef } from '../SampleDefinition'
import type { Viewport, TextureRenderSpec, DepthMapType } from '@practice/texture'
import {
  createLinearDepthMapSpec,
  createCircularDepthMapSpec,
  createRadialDepthMapSpec,
  createPerlinDepthMapSpec,
  createNoiseMapSpec,
  createIntensityCurveSpec,
  createGradientNoiseMapSpec,
  createGradientGrainLinearSpec,
  createGradientGrainCircularSpec,
  createGradientGrainRadialSpec,
  createGradientGrainPerlinSpec,
  createLinearGradientSpec,
} from '@practice/texture'

// HEX to RGBA (0-1)
function hexToRgba(hex: string): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0, 1]
  return [
    parseInt(result[1]!, 16) / 255,
    parseInt(result[2]!, 16) / 255,
    parseInt(result[3]!, 16) / 255,
    1,
  ]
}

// Default curve points (parabola: x²)
const defaultCurvePoints = [0, 1 / 36, 4 / 36, 9 / 36, 16 / 36, 25 / 36, 1]

// Depth type options
const depthTypeOptions = [
  { value: 'linear', label: 'Linear' },
  { value: 'circular', label: 'Circular' },
  { value: 'radial', label: 'Radial' },
  { value: 'perlin', label: 'Perlin Noise' },
]

// Common depth params
const commonDepthParams: ParamDef[] = [
  { key: 'depthType', label: 'Type', type: 'select', options: depthTypeOptions, default: 'linear' },
  { key: 'angle', label: 'Angle', type: 'slider', min: 0, max: 360, step: 1, default: 90 },
  { key: 'centerX', label: 'Center X', type: 'slider', min: 0, max: 1, step: 0.01, default: 0.5 },
  { key: 'centerY', label: 'Center Y', type: 'slider', min: 0, max: 1, step: 0.01, default: 0.5 },
]

// Create depth map spec based on type
function createDepthSpec(params: Record<string, unknown>, viewport: Viewport): TextureRenderSpec {
  const depthType = params.depthType as DepthMapType
  const centerX = params.centerX as number
  const centerY = params.centerY as number
  const angle = params.angle as number

  switch (depthType) {
    case 'circular':
      return createCircularDepthMapSpec({ centerX, centerY, invert: false }, viewport)
    case 'radial':
      return createRadialDepthMapSpec({
        centerX,
        centerY,
        startAngle: 0,
        sweepAngle: 360,
      }, viewport)
    case 'perlin':
      return createPerlinDepthMapSpec({
        scale: 4,
        octaves: 4,
        seed: 12345,
        contrast: 1,
        offset: 0,
      }, viewport)
    case 'linear':
    default:
      return createLinearDepthMapSpec({ angle, centerX, centerY }, viewport)
  }
}

// Get depth params for composite functions
function getDepthParams(params: SampleParams) {
  const depth = params.depth!
  return {
    depthMapType: depth.depthType as DepthMapType,
    angle: depth.angle as number,
    centerX: depth.centerX as number,
    centerY: depth.centerY as number,
    circularInvert: false,
    radialStartAngle: 0,
    radialSweepAngle: 360,
    perlinScale: 4,
    perlinOctaves: 4,
    perlinSeed: (params.noise?.seed as number) ?? 12345,
    perlinContrast: 1,
    perlinOffset: 0,
  }
}

/** Linear Gradient + Grain: Full composition flow */
export const LinearGradientGrain: SampleDefinition = {
  id: 'linear-gradient-grain',
  name: 'Gradient + Grain',
  description: 'Depth + curve + noise composition',
  category: 'gradient',
  nodes: [
    {
      id: 'depth',
      badge: 'A',
      label: 'Depth Map',
      row: 0,
      params: commonDepthParams,
      createSpec: createDepthSpec,
    },
    {
      id: 'noise',
      badge: 'B',
      label: 'Noise',
      row: 0,
      params: [
        { key: 'seed', label: 'Seed', type: 'number', default: 12345 },
      ],
      createSpec: (params, viewport) =>
        createNoiseMapSpec({ seed: params.seed as number }, viewport),
    },
    {
      id: 'curve',
      badge: 'C',
      label: 'Intensity Curve',
      row: 0,
      params: [
        { key: 'points', label: 'Curve', type: 'curve', default: defaultCurvePoints },
      ],
      createSpec: null, // Curve rendered by CurveEditor
    },
    {
      id: 'curvedDepth',
      badge: 'D',
      label: 'Curved Depth',
      row: 1,
      params: [],
      createSpec: (_params, viewport) => {
        // This node doesn't have its own params, it uses depth + curve
        return createIntensityCurveSpec({
          depthMapType: 'linear',
          angle: 90,
          centerX: 0.5,
          centerY: 0.5,
          circularInvert: false,
          radialStartAngle: 0,
          radialSweepAngle: 360,
          perlinScale: 4,
          perlinOctaves: 4,
          perlinSeed: 12345,
          perlinContrast: 1,
          perlinOffset: 0,
          curvePoints: defaultCurvePoints,
        }, viewport)
      },
    },
    {
      id: 'gradient',
      badge: 'E',
      label: 'Gradient',
      row: 2,
      params: [
        { key: 'colorA', label: 'Color A', type: 'color', default: '#ff6b6b' },
        { key: 'colorB', label: 'Color B', type: 'color', default: '#4ecdc4' },
      ],
      createSpec: (params, viewport) =>
        createLinearGradientSpec({
          depthMapType: 'linear',
          angle: 90,
          centerX: 0.5,
          centerY: 0.5,
          circularInvert: false,
          radialStartAngle: 0,
          radialSweepAngle: 360,
          perlinScale: 4,
          perlinOctaves: 4,
          perlinSeed: 12345,
          perlinContrast: 1,
          perlinOffset: 0,
          stops: [
            { color: hexToRgba(params.colorA as string), position: 0 },
            { color: hexToRgba(params.colorB as string), position: 1 },
          ],
        }, viewport),
    },
    {
      id: 'depthNoise',
      badge: 'F',
      label: 'Depth + Noise',
      row: 2,
      params: [
        { key: 'sparsity', label: 'Sparsity', type: 'slider', min: 0, max: 0.99, step: 0.01, default: 0.75 },
      ],
      createSpec: (params, viewport) =>
        createGradientNoiseMapSpec({
          depthMapType: 'linear',
          angle: 90,
          centerX: 0.5,
          centerY: 0.5,
          circularInvert: false,
          radialStartAngle: 0,
          radialSweepAngle: 360,
          perlinScale: 4,
          perlinOctaves: 4,
          perlinSeed: 12345,
          perlinContrast: 1,
          perlinOffset: 0,
          seed: 12345,
          sparsity: params.sparsity as number,
          curvePoints: defaultCurvePoints,
        }, viewport),
    },
  ],
  connections: [
    { from: 'depth', to: 'curvedDepth' },
    { from: 'curve', to: 'curvedDepth' },
    { from: 'noise', to: 'depthNoise' },
    { from: 'curvedDepth', to: 'depthNoise' },
    { from: 'depth', to: 'gradient' },
    { from: 'gradient', to: 'output' },
    { from: 'depthNoise', to: 'output' },
  ],
  createOutputSpec: (params, viewport) => {
    const depthParams = getDepthParams(params)
    const gradientParams = params.gradient!
    const noiseParams = params.noise!
    const depthNoiseParams = params.depthNoise!
    const curveParams = params.curve!

    const colorA = hexToRgba(gradientParams.colorA as string)
    const colorB = hexToRgba(gradientParams.colorB as string)
    const seed = noiseParams.seed as number
    const sparsity = depthNoiseParams.sparsity as number
    const curvePoints = curveParams.points as number[]

    switch (depthParams.depthMapType) {
      case 'circular':
        return createGradientGrainCircularSpec({
          centerX: depthParams.centerX,
          centerY: depthParams.centerY,
          circularInvert: depthParams.circularInvert,
          colorA, colorB, seed, sparsity, curvePoints,
        }, viewport)
      case 'radial':
        return createGradientGrainRadialSpec({
          centerX: depthParams.centerX,
          centerY: depthParams.centerY,
          radialStartAngle: depthParams.radialStartAngle,
          radialSweepAngle: depthParams.radialSweepAngle,
          colorA, colorB, seed, sparsity, curvePoints,
        }, viewport)
      case 'perlin':
        return createGradientGrainPerlinSpec({
          perlinScale: depthParams.perlinScale,
          perlinOctaves: depthParams.perlinOctaves,
          perlinContrast: depthParams.perlinContrast,
          perlinOffset: depthParams.perlinOffset,
          colorA, colorB, seed, sparsity, curvePoints,
        }, viewport)
      case 'linear':
      default:
        return createGradientGrainLinearSpec({
          angle: depthParams.angle,
          centerX: depthParams.centerX,
          centerY: depthParams.centerY,
          colorA, colorB, seed, sparsity, curvePoints,
        }, viewport)
    }
  },
}

export const GradientFlowSamples: SampleDefinition[] = [
  LinearGradientGrain,
]
