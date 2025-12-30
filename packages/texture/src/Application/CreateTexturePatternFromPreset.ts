import type { SurfacePreset, TexturePattern, RGBA } from '../Domain'
import {
  createSolidSpec,
  createStripeSpec,
  createGridSpec,
  createPolkaDotSpec,
  createCheckerSpec,
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
  }
}

/**
 * Create TexturePatterns from SurfacePresets
 */
export const createTexturePatternsFromPresets = (presets: SurfacePreset[]): TexturePattern[] =>
  presets.map(createTexturePatternFromPreset)
