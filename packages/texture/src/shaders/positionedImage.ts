import { fullscreenVertex, maskBlendState } from './common'
import type { TextureRenderSpec, Viewport } from '../Domain'

/**
 * Positioned image shader
 * Renders an image at a specific position with rotation and alpha blending
 */
export const positionedImageShader = /* wgsl */ `
${fullscreenVertex}

@group(0) @binding(0) var imageSampler: sampler;
@group(0) @binding(1) var imageTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: PositionedImageParams;

struct PositionedImageParams {
  // viewport dimensions
  viewportWidth: f32,
  viewportHeight: f32,
  // image dimensions (in viewport pixels)
  imageWidth: f32,
  imageHeight: f32,
  // position (0-1 normalized)
  posX: f32,
  posY: f32,
  // anchor offset (0-1, relative to image size)
  anchorX: f32,
  anchorY: f32,
  // rotation in radians
  rotation: f32,
  // opacity
  opacity: f32,
  // padding for alignment
  _padding1: f32,
  _padding2: f32,
}

@fragment
fn fragmentMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  // Convert fragment position to normalized viewport coordinates (0-1)
  let viewportUv = fragCoord.xy / vec2f(params.viewportWidth, params.viewportHeight);

  // Calculate image center position in normalized coordinates
  let centerX = params.posX;
  let centerY = params.posY;

  // Calculate image size in normalized coordinates
  let imageSizeNorm = vec2f(
    params.imageWidth / params.viewportWidth,
    params.imageHeight / params.viewportHeight
  );

  // Apply anchor offset to get the actual center
  let anchorOffset = vec2f(
    (params.anchorX - 0.5) * imageSizeNorm.x,
    (params.anchorY - 0.5) * imageSizeNorm.y
  );
  let adjustedCenter = vec2f(centerX, centerY) + anchorOffset;

  // Transform fragment position relative to image center
  var relPos = viewportUv - adjustedCenter;

  // Apply rotation around center
  let cosR = cos(params.rotation);
  let sinR = sin(params.rotation);
  let rotatedPos = vec2f(
    relPos.x * cosR + relPos.y * sinR,
    -relPos.x * sinR + relPos.y * cosR
  );

  // Convert to image UV coordinates
  let imageUv = rotatedPos / imageSizeNorm + vec2f(0.5);

  // Check if we're inside the image bounds
  if (imageUv.x < 0.0 || imageUv.x > 1.0 || imageUv.y < 0.0 || imageUv.y > 1.0) {
    discard;
  }

  // Sample the texture
  var color = textureSample(imageTexture, imageSampler, imageUv);

  // Apply opacity
  color.a *= params.opacity;

  return color;
}
`

export interface PositionedImageParams {
  /** X position (0-1 normalized) */
  x: number
  /** Y position (0-1 normalized) */
  y: number
  /** Anchor point X (0=left, 0.5=center, 1=right) */
  anchorX: number
  /** Anchor point Y (0=top, 0.5=center, 1=bottom) */
  anchorY: number
  /** Rotation in radians */
  rotation: number
  /** Opacity (0-1) */
  opacity: number
}

/**
 * Create render spec for positioned image
 */
export function createPositionedImageSpec(
  imageBitmap: ImageBitmap,
  params: PositionedImageParams,
  viewport: Viewport
): TextureRenderSpec & { imageBitmap: ImageBitmap } {
  const data = new Float32Array(12)
  data[0] = viewport.width
  data[1] = viewport.height
  data[2] = imageBitmap.width
  data[3] = imageBitmap.height
  data[4] = params.x
  data[5] = params.y
  data[6] = params.anchorX
  data[7] = params.anchorY
  data[8] = params.rotation
  data[9] = params.opacity
  data[10] = 0 // padding
  data[11] = 0 // padding

  return {
    shader: positionedImageShader,
    uniforms: data.buffer,
    bufferSize: 48, // 12 floats * 4 bytes
    blend: maskBlendState,
    imageBitmap,
  }
}

/**
 * Convert anchor string to numeric values
 */
export function anchorToNumbers(anchor: string): { x: number; y: number } {
  const [vertical, horizontal] = anchor.split('-')

  let x = 0.5
  let y = 0.5

  switch (horizontal) {
    case 'left':
      x = 0
      break
    case 'center':
      x = 0.5
      break
    case 'right':
      x = 1
      break
  }

  switch (vertical) {
    case 'top':
      y = 0
      break
    case 'center':
      y = 0.5
      break
    case 'bottom':
      y = 1
      break
  }

  return { x, y }
}
