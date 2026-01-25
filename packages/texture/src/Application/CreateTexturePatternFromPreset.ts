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
 *
 * Note: Uses type assertions for dynamic schema-based params.
 * Runtime validation is handled by SurfaceRegistry schemas.
 */
export const createTexturePatternFromPreset = (preset: SurfacePreset): TexturePattern | undefined => {
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
            width1: params.width1 as number,
            width2: params.width2 as number,
            angle: params.angle as number,
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
            lineWidth: params.lineWidth as number,
            cellSize: params.cellSize as number,
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
            dotRadius: params.dotRadius as number,
            spacing: params.spacing as number,
            rowOffset: params.rowOffset as number,
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
            cellSize: params.cellSize as number,
            angle: params.angle as number,
            color1: c1,
            color2: c2,
          }),
        params,
      }
    case 'linearGradient': {
      // Support for multi-stop gradients via params.stops (RGBA array)
      // Falls back to c1/c2 if stops not provided
      const hasCustomStops = Array.isArray(params.stops) && params.stops.length >= 2
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA, viewport?: Viewport) => {
          const stops = hasCustomStops
            ? (params.stops as Array<{ color: RGBA; position: number }>)
            : [
                { color: c1, position: 0 },
                { color: c2, position: 1 },
              ]
          return createLinearGradientSpec({
            angle: params.angle as number,
            centerX: params.centerX as number,
            centerY: params.centerY as number,
            stops,
          }, viewport ?? { width: 1920, height: 1080 })
        },
        params,
      }
    }
    case 'gradientGrainLinear': {
      return {
        label,
        createSpec: (c1: RGBA, c2: RGBA, viewport?: Viewport) =>
          createGradientGrainLinearSpec({
            angle: params.angle as number,
            centerX: params.centerX as number,
            centerY: params.centerY as number,
            colorA: c1,
            colorB: c2,
            seed: params.seed as number,
            sparsity: params.sparsity as number,
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
            centerX: params.centerX as number,
            centerY: params.centerY as number,
            circularInvert: params.circularInvert as boolean | undefined,
            colorA: c1,
            colorB: c2,
            seed: params.seed as number,
            sparsity: params.sparsity as number,
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
            centerX: params.centerX as number,
            centerY: params.centerY as number,
            radialStartAngle: params.radialStartAngle as number,
            radialSweepAngle: params.radialSweepAngle as number,
            colorA: c1,
            colorB: c2,
            seed: params.seed as number,
            sparsity: params.sparsity as number,
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
            perlinScale: params.perlinScale as number,
            perlinOctaves: params.perlinOctaves as number,
            perlinContrast: params.perlinContrast as number,
            perlinOffset: params.perlinOffset as number,
            colorA: c1,
            colorB: c2,
            seed: params.seed as number,
            sparsity: params.sparsity as number,
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
            perlinScale: params.perlinScale as number,
            perlinOctaves: params.perlinOctaves as number,
            perlinContrast: params.perlinContrast as number,
            perlinOffset: params.perlinOffset as number,
            curlIntensity: params.curlIntensity as number,
            colorA: c1,
            colorB: c2,
            seed: params.seed as number,
            sparsity: params.sparsity as number,
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
            simplexScale: params.simplexScale as number,
            simplexOctaves: params.simplexOctaves as number,
            simplexContrast: params.simplexContrast as number,
            simplexOffset: params.simplexOffset as number,
            colorA: c1,
            colorB: c2,
            seed: params.seed as number,
            sparsity: params.sparsity as number,
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
            size: params.size as number,
            angle: params.angle as number,
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
            size: params.size as number,
            angle: params.angle as number,
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
            size: params.size as number,
            lineWidth: params.lineWidth as number,
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
            radius: params.radius as number,
            rings: params.rings as number,
            lineWidth: params.lineWidth as number,
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
            amplitude: params.amplitude as number,
            wavelength: params.wavelength as number,
            thickness: params.thickness as number,
            angle: params.angle as number,
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
            size: params.size as number,
            overlap: params.overlap as number,
            angle: params.angle as number,
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
            width: params.width as number,
            height: params.height as number,
            lineWidth: params.lineWidth as number,
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
            rays: params.rays as number,
            centerX: params.centerX as number,
            centerY: params.centerY as number,
            twist: params.twist as number,
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
            fiberScale: params.fiberScale as number,
            fiberStrength: params.fiberStrength as number,
            fiberWarp: params.fiberWarp as number,
            grainDensity: params.grainDensity as number,
            grainSize: params.grainSize as number,
            bumpStrength: params.bumpStrength as number,
            lightAngle: params.lightAngle as number,
            seed: params.seed as number,
          }, viewport ?? { width: 1920, height: 1080 }),
        params,
      }
    default:
      return undefined
  }
}

/**
 * Create TexturePatterns from SurfacePresets
 */
export const createTexturePatternsFromPresets = (presets: SurfacePreset[]): TexturePattern[] =>
  presets.map(createTexturePatternFromPreset).filter((p): p is TexturePattern => p !== undefined)
