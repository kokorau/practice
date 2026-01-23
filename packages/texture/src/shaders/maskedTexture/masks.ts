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
// 2D hash function for noise generation
fn blobHash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 2D value noise with smooth interpolation
fn blobValueNoise2D(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  let a = blobHash21(i);
  let b = blobHash21(i + vec2f(1.0, 0.0));
  let c = blobHash21(i + vec2f(0.0, 1.0));
  let d = blobHash21(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Get Fourier coefficient for frequency n, varying smoothly with seed
// Seed is sampled on a circle for seamless 0-100 looping
fn getFourierCoeff(seed: f32, n: u32) -> f32 {
  let tau = 6.283185307;
  let theta = seed * tau / 100.0;

  // Sample on circle in noise space (guarantees seed loop)
  let radius = 2.0;
  let x = cos(theta) * radius + f32(n) * 7.0;  // Offset per frequency
  let y = sin(theta) * radius;

  return blobValueNoise2D(vec2f(x, y)) * 2.0 - 1.0;
}

// Continuous blob deformation using circular noise sampling
// Samples noise on a circular path to ensure seamless wrapping at ±π
fn smoothBlob(angle: f32, seed: f32, waves: u32) -> f32 {
  let noiseRadius = 3.0;
  let seedOffset = seed * 0.1;
  let noiseCoord = vec2f(
    cos(angle) * noiseRadius + seedOffset,
    sin(angle) * noiseRadius + seedOffset * 0.7
  );

  // Use layered noise for more organic shapes
  var value = 0.0;
  var amplitude = 0.5;
  var pos = noiseCoord;
  let octaves = clamp(i32(waves), 1, 4);

  for (var i = 0; i < octaves; i++) {
    value += amplitude * blobValueNoise2D(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }

  // Center around 0 for symmetric deformation
  return (value - 0.5) * 2.0;
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

/** Rect mask SDF function with per-corner radii, rotation, and perspective */
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
  return rectMaskSDFWithTransform(uv, left, right, top, bottom, radiusTL, radiusTR, radiusBL, radiusBR, 0.0, 0.0, 0.0, aspectRatio);
}

fn rectMaskSDFWithTransform(
  uv: vec2f,
  left: f32, right: f32, top: f32, bottom: f32,
  radiusTL: f32, radiusTR: f32, radiusBL: f32, radiusBR: f32,
  rotation: f32, perspectiveX: f32, perspectiveY: f32,
  aspectRatio: f32
) -> f32 {
  let center = vec2f((left + right) / 2.0, (top + bottom) / 2.0);
  let halfSize = vec2f((right - left) / 2.0, (bottom - top) / 2.0);

  var p = uv - center;

  // パース変換: Y位置に応じてX方向をスケール（perspectiveY）
  // perspectiveY > 0: 下に行くほど幅が狭くなる
  if (abs(perspectiveY) > 0.001) {
    let yFactor = (p.y / halfSize.y) * perspectiveY;
    p.x *= 1.0 + yFactor;
  }

  // パース変換: X位置に応じてY方向をスケール（perspectiveX）
  // perspectiveX > 0: 右に行くほど高さが狭くなる
  if (abs(perspectiveX) > 0.001) {
    let xFactor = (p.x / halfSize.x) * perspectiveX;
    p.y *= 1.0 + xFactor;
  }

  // 回転変換（中心周り）
  if (abs(rotation) > 0.001) {
    let rotRad = rotation * 3.14159265359 / 180.0;
    let cosR = cos(rotRad);
    let sinR = sin(rotRad);
    let rotatedP = vec2f(
      p.x * cosR - p.y * sinR,
      p.x * sinR + p.y * cosR
    );
    p = rotatedP;
  }

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

/** Perlin noise utilities for perlin mask */
export const perlinMaskUtils = /* wgsl */ `
fn perlinHash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn perlinValueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  let a = perlinHash21(i);
  let b = perlinHash21(i + vec2f(1.0, 0.0));
  let c = perlinHash21(i + vec2f(0.0, 1.0));
  let d = perlinHash21(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn perlinFbm(p: vec2f, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * perlinValueNoise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
`

/** Perlin noise mask function (thresholded) */
export const perlinMaskFn = /* wgsl */ `
fn perlinMaskValue(uv: vec2f, seed: f32, scale: f32, octaves: i32, threshold: f32) -> f32 {
  let noisePos = uv * scale + vec2f(seed * 0.1, seed * 0.073);
  let noise = perlinFbm(noisePos, octaves);
  // threshold で2値化: noise > threshold なら1（不透過）、それ以外は0（透過）
  return select(0.0, 1.0, noise > threshold);
}
`
