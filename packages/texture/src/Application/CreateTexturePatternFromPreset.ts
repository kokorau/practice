import type { SurfacePreset, TexturePattern, RGBA, Viewport } from '../Domain'
import { DEFAULT_GRADIENT_GRAIN_CURVE_POINTS } from '../Domain'
import {
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
  createLinearGradientSpec,
  createGradientGrainLinearSpec,
  createGradientGrainCircularSpec,
  createGradientGrainRadialSpec,
  createGradientGrainPerlinSpec,
  createGradientGrainCurlSpec,
  createGradientGrainSimplexSpec,
  createTriangleSpec,
  createHexagonSpec,
  createAsanohaSpec,
  createSeigaihaSpec,
  createWaveSpec,
  createScalesSpec,
  createOgeeSpec,
  createSunburstSpec,
  createPaperTextureSpec,
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
        params,
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
        params,
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
        params,
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
        params,
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
        params,
      }
    case 'linearGradient': {
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA, viewport?: Viewport) =>
          createLinearGradientSpec({
            angle: params.angle,
            centerX: params.centerX,
            centerY: params.centerY,
            stops: [
              { color: c1, position: 0 },
              { color: c2, position: 1 },
            ],
          }, viewport ?? { width: 1920, height: 1080 }),
        params,
      }
    }
    case 'gradientGrainLinear': {
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA, viewport?: Viewport) =>
          createGradientGrainLinearSpec({
            angle: params.angle,
            centerX: params.centerX,
            centerY: params.centerY,
            colorA: c1,
            colorB: c2,
            seed: params.seed,
            sparsity: params.sparsity,
            curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
          }, viewport ?? { width: 1920, height: 1080 }),
        params,
      }
    }
    case 'gradientGrainCircular': {
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA, viewport?: Viewport) =>
          createGradientGrainCircularSpec({
            centerX: params.centerX,
            centerY: params.centerY,
            circularInvert: params.circularInvert,
            colorA: c1,
            colorB: c2,
            seed: params.seed,
            sparsity: params.sparsity,
            curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
          }, viewport ?? { width: 1920, height: 1080 }),
        params,
      }
    }
    case 'gradientGrainRadial': {
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA, viewport?: Viewport) =>
          createGradientGrainRadialSpec({
            centerX: params.centerX,
            centerY: params.centerY,
            radialStartAngle: params.radialStartAngle,
            radialSweepAngle: params.radialSweepAngle,
            colorA: c1,
            colorB: c2,
            seed: params.seed,
            sparsity: params.sparsity,
            curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
          }, viewport ?? { width: 1920, height: 1080 }),
        params,
      }
    }
    case 'gradientGrainPerlin': {
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA, viewport?: Viewport) =>
          createGradientGrainPerlinSpec({
            perlinScale: params.perlinScale,
            perlinOctaves: params.perlinOctaves,
            perlinContrast: params.perlinContrast,
            perlinOffset: params.perlinOffset,
            colorA: c1,
            colorB: c2,
            seed: params.seed,
            sparsity: params.sparsity,
            curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
          }, viewport ?? { width: 1920, height: 1080 }),
        params,
      }
    }
    case 'gradientGrainCurl': {
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA, viewport?: Viewport) =>
          createGradientGrainCurlSpec({
            perlinScale: params.perlinScale,
            perlinOctaves: params.perlinOctaves,
            perlinContrast: params.perlinContrast,
            perlinOffset: params.perlinOffset,
            curlIntensity: params.curlIntensity,
            colorA: c1,
            colorB: c2,
            seed: params.seed,
            sparsity: params.sparsity,
            curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
          }, viewport ?? { width: 1920, height: 1080 }),
        params,
      }
    }
    case 'gradientGrainSimplex': {
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA, viewport?: Viewport) =>
          createGradientGrainSimplexSpec({
            simplexScale: params.simplexScale,
            simplexOctaves: params.simplexOctaves,
            simplexContrast: params.simplexContrast,
            simplexOffset: params.simplexOffset,
            colorA: c1,
            colorB: c2,
            seed: params.seed,
            sparsity: params.sparsity,
            curvePoints: [...DEFAULT_GRADIENT_GRAIN_CURVE_POINTS],
          }, viewport ?? { width: 1920, height: 1080 }),
        params,
      }
    }
    case 'triangle':
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA) =>
          createTriangleSpec({
            size: params.size,
            angle: params.angle,
            color1: c1,
            color2: c2,
          }),
        params,
      }
    case 'hexagon':
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA) =>
          createHexagonSpec({
            size: params.size,
            angle: params.angle,
            color1: c1,
            color2: c2,
          }),
        params,
      }
    case 'asanoha':
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA) =>
          createAsanohaSpec({
            size: params.size,
            lineWidth: params.lineWidth,
            lineColor: c1,
            bgColor: c2,
          }),
        params,
      }
    case 'seigaiha':
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA) =>
          createSeigaihaSpec({
            radius: params.radius,
            rings: params.rings,
            lineWidth: params.lineWidth,
            lineColor: c1,
            bgColor: c2,
          }),
        params,
      }
    case 'wave':
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA) =>
          createWaveSpec({
            amplitude: params.amplitude,
            wavelength: params.wavelength,
            thickness: params.thickness,
            angle: params.angle,
            color1: c1,
            color2: c2,
          }),
        params,
      }
    case 'scales':
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA) =>
          createScalesSpec({
            size: params.size,
            overlap: params.overlap,
            angle: params.angle,
            color1: c1,
            color2: c2,
          }),
        params,
      }
    case 'ogee':
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA) =>
          createOgeeSpec({
            width: params.width,
            height: params.height,
            lineWidth: params.lineWidth,
            lineColor: c1,
            bgColor: c2,
          }),
        params,
      }
    case 'sunburst':
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA, viewport?: Viewport) =>
          createSunburstSpec({
            rays: params.rays,
            centerX: params.centerX,
            centerY: params.centerY,
            twist: params.twist,
            color1: c1,
            color2: c2,
            viewportWidth: viewport?.width ?? 1920,
            viewportHeight: viewport?.height ?? 1080,
          }),
        params,
      }
    case 'paperTexture':
      return {
        label,
        createSpec: (c1: RGBA, _c2: RGBA, viewport?: Viewport) =>
          createPaperTextureSpec({
            color: c1,
            fiberScale: params.fiberScale,
            fiberStrength: params.fiberStrength,
            fiberWarp: params.fiberWarp,
            grainDensity: params.grainDensity,
            grainSize: params.grainSize,
            bumpStrength: params.bumpStrength,
            lightAngle: params.lightAngle,
            seed: params.seed,
          }, viewport ?? { width: 1920, height: 1080 }),
        params,
      }
  }
}

/**
 * Create TexturePatterns from SurfacePresets
 */
export const createTexturePatternsFromPresets = (presets: SurfacePreset[]): TexturePattern[] =>
  presets.map(createTexturePatternFromPreset)
