import type {
  Viewport,
  TexturePatternParams,
  SolidPatternParams,
  StripePatternParams,
  GridPatternParams,
  PolkaDotPatternParams,
  CircleMaskPatternParams,
  RectMaskPatternParams,
  CircleStripePatternParams,
  CircleGridPatternParams,
  CirclePolkaDotPatternParams,
  RectStripePatternParams,
  RectGridPatternParams,
  RectPolkaDotPatternParams,
  BlobStripePatternParams,
  BlobGridPatternParams,
  BlobPolkaDotPatternParams,
  VignettePatternParams,
  ChromaticAberrationPatternParams,
} from '../Domain'

// ============================================================
// Simple Texture Uniforms (no viewport dependency)
// ============================================================

const createSolidUniforms = (p: SolidPatternParams): ArrayBuffer => {
  return new Float32Array(p.color).buffer
}

const createStripeUniforms = (p: StripePatternParams): ArrayBuffer => {
  return new Float32Array([
    ...p.color1,
    ...p.color2,
    p.width1,
    p.width2,
    p.angle,
    0, // padding
  ]).buffer
}

const createGridUniforms = (p: GridPatternParams): ArrayBuffer => {
  return new Float32Array([
    ...p.lineColor,
    ...p.bgColor,
    p.lineWidth,
    p.cellSize,
    0, // padding
    0, // padding
  ]).buffer
}

const createPolkaDotUniforms = (p: PolkaDotPatternParams): ArrayBuffer => {
  return new Float32Array([
    ...p.dotColor,
    ...p.bgColor,
    p.dotRadius,
    p.spacing,
    p.rowOffset,
    0, // padding
  ]).buffer
}

// ============================================================
// Mask Uniforms (viewport dependent)
// ============================================================

const createCircleMaskUniforms = (
  p: CircleMaskPatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const aspectRatio = viewport.width / viewport.height
  return new Float32Array([
    ...p.innerColor,
    ...p.outerColor,
    p.centerX,
    p.centerY,
    p.radius,
    aspectRatio,
    viewport.width,
    viewport.height,
  ]).buffer
}

const createRectMaskUniforms = (
  p: RectMaskPatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const aspectRatio = viewport.width / viewport.height
  return new Float32Array([
    ...p.innerColor,
    ...p.outerColor,
    p.left,
    p.right,
    p.top,
    p.bottom,
    p.radiusTopLeft,
    p.radiusTopRight,
    p.radiusBottomLeft,
    p.radiusBottomRight,
    aspectRatio,
    viewport.width,
    viewport.height,
    0, // padding
  ]).buffer
}

// ============================================================
// Masked Texture Uniforms (viewport dependent)
// ============================================================

const createCircleStripeUniforms = (
  p: CircleStripePatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const aspectRatio = viewport.width / viewport.height
  return new Float32Array([
    ...p.color1,
    ...p.color2,
    p.mask.centerX,
    p.mask.centerY,
    p.mask.radius,
    aspectRatio,
    p.texture.width1,
    p.texture.width2,
    p.texture.angle,
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
    0, // padding
  ]).buffer
}

const createCircleGridUniforms = (
  p: CircleGridPatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const aspectRatio = viewport.width / viewport.height
  return new Float32Array([
    ...p.color1,
    ...p.color2,
    p.mask.centerX,
    p.mask.centerY,
    p.mask.radius,
    aspectRatio,
    p.texture.lineWidth,
    p.texture.cellSize,
    viewport.width,
    viewport.height,
  ]).buffer
}

const createCirclePolkaDotUniforms = (
  p: CirclePolkaDotPatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const aspectRatio = viewport.width / viewport.height
  return new Float32Array([
    ...p.color1,
    ...p.color2,
    p.mask.centerX,
    p.mask.centerY,
    p.mask.radius,
    aspectRatio,
    p.texture.dotRadius,
    p.texture.spacing,
    p.texture.rowOffset,
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
    0, // padding
  ]).buffer
}

const createRectStripeUniforms = (
  p: RectStripePatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const aspectRatio = viewport.width / viewport.height
  return new Float32Array([
    ...p.color1,
    ...p.color2,
    p.mask.left,
    p.mask.right,
    p.mask.top,
    p.mask.bottom,
    p.mask.radiusTopLeft,
    p.mask.radiusTopRight,
    p.mask.radiusBottomLeft,
    p.mask.radiusBottomRight,
    aspectRatio,
    p.texture.width1,
    p.texture.width2,
    p.texture.angle,
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
  ]).buffer
}

const createRectGridUniforms = (
  p: RectGridPatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const aspectRatio = viewport.width / viewport.height
  return new Float32Array([
    ...p.color1,
    ...p.color2,
    p.mask.left,
    p.mask.right,
    p.mask.top,
    p.mask.bottom,
    p.mask.radiusTopLeft,
    p.mask.radiusTopRight,
    p.mask.radiusBottomLeft,
    p.mask.radiusBottomRight,
    aspectRatio,
    p.texture.lineWidth,
    p.texture.cellSize,
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
    0, // padding
  ]).buffer
}

const createRectPolkaDotUniforms = (
  p: RectPolkaDotPatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const aspectRatio = viewport.width / viewport.height
  return new Float32Array([
    ...p.color1,
    ...p.color2,
    p.mask.left,
    p.mask.right,
    p.mask.top,
    p.mask.bottom,
    p.mask.radiusTopLeft,
    p.mask.radiusTopRight,
    p.mask.radiusBottomLeft,
    p.mask.radiusBottomRight,
    aspectRatio,
    p.texture.dotRadius,
    p.texture.spacing,
    p.texture.rowOffset,
    viewport.width,
    viewport.height,
    0, // padding
    0, // padding
  ]).buffer
}

const createBlobStripeUniforms = (
  p: BlobStripePatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const aspectRatio = viewport.width / viewport.height
  const data = new ArrayBuffer(80)
  const floatView = new Float32Array(data)
  const uintView = new Uint32Array(data)

  floatView[0] = p.color1[0]
  floatView[1] = p.color1[1]
  floatView[2] = p.color1[2]
  floatView[3] = p.color1[3]
  floatView[4] = p.color2[0]
  floatView[5] = p.color2[1]
  floatView[6] = p.color2[2]
  floatView[7] = p.color2[3]
  floatView[8] = p.mask.centerX
  floatView[9] = p.mask.centerY
  floatView[10] = p.mask.baseRadius
  floatView[11] = p.mask.amplitude
  uintView[12] = p.mask.octaves
  floatView[13] = p.mask.seed
  floatView[14] = aspectRatio
  floatView[15] = p.texture.width1
  floatView[16] = p.texture.width2
  floatView[17] = p.texture.angle
  floatView[18] = viewport.width
  floatView[19] = viewport.height

  return data
}

const createBlobGridUniforms = (
  p: BlobGridPatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const aspectRatio = viewport.width / viewport.height
  const data = new ArrayBuffer(80)
  const floatView = new Float32Array(data)
  const uintView = new Uint32Array(data)

  floatView[0] = p.color1[0]
  floatView[1] = p.color1[1]
  floatView[2] = p.color1[2]
  floatView[3] = p.color1[3]
  floatView[4] = p.color2[0]
  floatView[5] = p.color2[1]
  floatView[6] = p.color2[2]
  floatView[7] = p.color2[3]
  floatView[8] = p.mask.centerX
  floatView[9] = p.mask.centerY
  floatView[10] = p.mask.baseRadius
  floatView[11] = p.mask.amplitude
  uintView[12] = p.mask.octaves
  floatView[13] = p.mask.seed
  floatView[14] = aspectRatio
  floatView[15] = p.texture.lineWidth
  floatView[16] = p.texture.cellSize
  floatView[17] = viewport.width
  floatView[18] = viewport.height
  floatView[19] = 0 // padding

  return data
}

const createBlobPolkaDotUniforms = (
  p: BlobPolkaDotPatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const aspectRatio = viewport.width / viewport.height
  const data = new ArrayBuffer(80)
  const floatView = new Float32Array(data)
  const uintView = new Uint32Array(data)

  floatView[0] = p.color1[0]
  floatView[1] = p.color1[1]
  floatView[2] = p.color1[2]
  floatView[3] = p.color1[3]
  floatView[4] = p.color2[0]
  floatView[5] = p.color2[1]
  floatView[6] = p.color2[2]
  floatView[7] = p.color2[3]
  floatView[8] = p.mask.centerX
  floatView[9] = p.mask.centerY
  floatView[10] = p.mask.baseRadius
  floatView[11] = p.mask.amplitude
  uintView[12] = p.mask.octaves
  floatView[13] = p.mask.seed
  floatView[14] = aspectRatio
  floatView[15] = p.texture.dotRadius
  floatView[16] = p.texture.spacing
  floatView[17] = p.texture.rowOffset
  floatView[18] = viewport.width
  floatView[19] = viewport.height

  return data
}

// ============================================================
// Filter Uniforms (viewport dependent)
// ============================================================

const createVignetteUniforms = (
  p: VignettePatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(48)
  const view = new DataView(uniforms)

  view.setFloat32(0, p.color[0], true)
  view.setFloat32(4, p.color[1], true)
  view.setFloat32(8, p.color[2], true)
  view.setFloat32(12, p.color[3], true)
  view.setFloat32(16, p.intensity, true)
  view.setFloat32(20, p.radius, true)
  view.setFloat32(24, p.softness, true)
  view.setFloat32(28, 0, true) // padding
  view.setFloat32(32, viewport.width, true)
  view.setFloat32(36, viewport.height, true)
  view.setFloat32(40, 0, true) // padding
  view.setFloat32(44, 0, true) // padding

  return uniforms
}

const createChromaticAberrationUniforms = (
  p: ChromaticAberrationPatternParams,
  viewport: Viewport
): ArrayBuffer => {
  const uniforms = new ArrayBuffer(16)
  const view = new DataView(uniforms)

  view.setFloat32(0, p.intensity, true)
  view.setFloat32(4, p.angle, true)
  view.setFloat32(8, viewport.width, true)
  view.setFloat32(12, viewport.height, true)

  return uniforms
}

// ============================================================
// Main Factory Function
// ============================================================

/**
 * Create uniform buffer data from pattern params and viewport.
 * Returns ArrayBuffer ready for GPU upload.
 */
export const createUniforms = (
  params: TexturePatternParams,
  viewport: Viewport
): ArrayBuffer => {
  switch (params.type) {
    // Simple textures
    case 'solid':
      return createSolidUniforms(params)
    case 'stripe':
      return createStripeUniforms(params)
    case 'grid':
      return createGridUniforms(params)
    case 'polkaDot':
      return createPolkaDotUniforms(params)

    // Masks
    case 'circleMask':
      return createCircleMaskUniforms(params, viewport)
    case 'rectMask':
      return createRectMaskUniforms(params, viewport)

    // Masked textures
    case 'circleStripe':
      return createCircleStripeUniforms(params, viewport)
    case 'circleGrid':
      return createCircleGridUniforms(params, viewport)
    case 'circlePolkaDot':
      return createCirclePolkaDotUniforms(params, viewport)
    case 'rectStripe':
      return createRectStripeUniforms(params, viewport)
    case 'rectGrid':
      return createRectGridUniforms(params, viewport)
    case 'rectPolkaDot':
      return createRectPolkaDotUniforms(params, viewport)
    case 'blobStripe':
      return createBlobStripeUniforms(params, viewport)
    case 'blobGrid':
      return createBlobGridUniforms(params, viewport)
    case 'blobPolkaDot':
      return createBlobPolkaDotUniforms(params, viewport)

    // Filters
    case 'vignette':
      return createVignetteUniforms(params, viewport)
    case 'chromaticAberration':
      return createChromaticAberrationUniforms(params, viewport)

    default:
      throw new Error(`Unknown pattern type: ${(params as { type: string }).type}`)
  }
}
