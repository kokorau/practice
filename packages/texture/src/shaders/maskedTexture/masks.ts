/**
 * Mask SDF Functions (WGSL)
 *
 * 各マスク形状のSigned Distance Functionを定義。
 * マスク付きテクスチャシェーダーで再利用される。
 */

/** Circle mask SDF function */
export const circleMaskFn = /* wgsl */ `
fn circleMaskSDF(uv: vec2f, centerX: f32, centerY: f32, radius: f32, aspectRatio: f32) -> f32 {
  let center = vec2f(centerX, centerY);
  var delta = uv - center;

  if (aspectRatio > 1.0) {
    delta.x *= aspectRatio;
  } else {
    delta.y /= aspectRatio;
  }

  let dist = length(delta);
  return dist - radius;
}
`

/** Wave utilities for blob deformation */
export const waveUtils = /* wgsl */ `
fn hash11(p: f32) -> f32 {
  return fract(sin(p * 127.1) * 43758.5453);
}

fn smoothBlob(angle: f32, seed: f32, waves: u32) -> f32 {
  var value = 0.0;
  var totalWeight = 0.0;

  for (var i = 0u; i < waves; i++) {
    let fi = f32(i);
    let freq = fi + 2.0;
    let phase = hash11(seed + fi * 17.3) * 6.283;
    let weight = 1.0 / (fi + 1.0);

    value += sin(angle * freq + phase) * weight;
    totalWeight += weight;
  }

  return value / totalWeight;
}
`

/** Blob mask SDF function */
export const blobMaskFn = /* wgsl */ `
fn blobMaskSDF(uv: vec2f, centerX: f32, centerY: f32, baseRadius: f32, amplitude: f32, octaves: u32, seed: f32, aspectRatio: f32) -> f32 {
  let center = vec2f(centerX, centerY);
  var delta = uv - center;

  if (aspectRatio > 1.0) {
    delta.x *= aspectRatio;
  } else {
    delta.y /= aspectRatio;
  }

  let angle = atan2(delta.y, delta.x);
  let waveValue = smoothBlob(angle, seed, octaves);
  let radius = baseRadius * (1.0 + waveValue * amplitude);
  let dist = length(delta);

  return dist - radius;
}
`

/** Rect mask SDF function with per-corner radii */
export const rectMaskFn = /* wgsl */ `
fn sdRoundedRectMasked(p: vec2f, halfSize: vec2f, radii: vec4f) -> f32 {
  var r: f32;
  if (p.x < 0.0) {
    if (p.y < 0.0) {
      r = radii.x;
    } else {
      r = radii.w;
    }
  } else {
    if (p.y < 0.0) {
      r = radii.y;
    } else {
      r = radii.z;
    }
  }

  let q = abs(p) - halfSize + r;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

fn rectMaskSDF(
  uv: vec2f,
  left: f32, right: f32, top: f32, bottom: f32,
  radiusTL: f32, radiusTR: f32, radiusBL: f32, radiusBR: f32,
  aspectRatio: f32
) -> f32 {
  let center = vec2f((left + right) / 2.0, (top + bottom) / 2.0);
  let halfSize = vec2f((right - left) / 2.0, (bottom - top) / 2.0);

  var p = uv - center;
  var correctedHalfSize = halfSize;
  var radii = vec4f(radiusTL, radiusTR, radiusBR, radiusBL);

  if (aspectRatio > 1.0) {
    p.x *= aspectRatio;
    correctedHalfSize.x *= aspectRatio;
    radii *= aspectRatio;
  } else {
    p.y /= aspectRatio;
    correctedHalfSize.y /= aspectRatio;
    radii /= aspectRatio;
  }

  let maxRadius = min(correctedHalfSize.x, correctedHalfSize.y);
  radii = min(radii, vec4f(maxRadius));

  return sdRoundedRectMasked(p, correctedHalfSize, radii);
}
`
