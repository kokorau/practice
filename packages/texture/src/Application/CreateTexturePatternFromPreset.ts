import type { SurfacePreset, TexturePattern, RGBA, Viewport } from '../Domain'
import {
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
  createGradientGrainSpec,
} from '../shaders'

/**
 * Create a TexturePattern from a SurfacePreset
 * Converts preset params into a createSpec function
 */
export const createTexturePatternFromPreset = (preset: SurfacePreset): TexturePattern => {
  const { label, params } = preset

  switch (params.type) {
    case 'solid':
      return {
        label,
        createSpec: (c1: RGBA) => createSolidSpec({ color: c1 }),
      }
    case 'stripe':
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA) =>
          createStripeSpec({
            width1: params.width1,
            width2: params.width2,
            angle: params.angle,
            color1: c1,
            color2: c2,
          }),
      }
    case 'grid':
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA) =>
          createGridSpec({
            lineWidth: params.lineWidth,
            cellSize: params.cellSize,
            lineColor: c1,
            bgColor: c2,
          }),
      }
    case 'polkaDot':
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA) =>
          createPolkaDotSpec({
            dotRadius: params.dotRadius,
            spacing: params.spacing,
            rowOffset: params.rowOffset,
            dotColor: c1,
            bgColor: c2,
          }),
      }
    case 'checker':
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA) =>
          createCheckerSpec({
            cellSize: params.cellSize,
            angle: params.angle,
            color1: c1,
            color2: c2,
          }),
      }
    case 'gradientGrain': {
      const defaultCurvePoints = [0, 1/36, 4/36, 9/36, 16/36, 25/36, 1]
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA, viewport?: Viewport) =>
          createGradientGrainSpec({
            depthMapType: params.depthMapType,
            angle: params.angle,
            centerX: params.centerX,
            centerY: params.centerY,
            radialStartAngle: params.radialStartAngle,
            radialSweepAngle: params.radialSweepAngle,
            perlinScale: params.perlinScale,
            perlinOctaves: params.perlinOctaves,
            perlinContrast: params.perlinContrast,
            perlinOffset: params.perlinOffset,
            colorA: c1,
            colorB: c2,
            seed: params.seed,
            sparsity: params.sparsity,
            curvePoints: defaultCurvePoints,
          }, viewport ?? { width: 1920, height: 1080 }),
      }
    }
  }
}

/**
 * Create TexturePatterns from SurfacePresets
 */
export const createTexturePatternsFromPresets = (presets: SurfacePreset[]): TexturePattern[] =>
  presets.map(createTexturePatternFromPreset)
