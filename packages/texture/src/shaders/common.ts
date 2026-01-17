/** フルスクリーン三角形の頂点シェーダー */
export const fullscreenVertex = /* wgsl */ `
@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}
`

/** アンチエイリアス用ユーティリティ関数 */
export const aaUtils = /* wgsl */ `
// アンチエイリアス用のスムーズステップ（1pxのエッジ）
fn aaStep(edge: f32, x: f32) -> f32 {
  return smoothstep(edge - 0.5, edge + 0.5, x);
}

// 2色間のアンチエイリアス補間
fn aaMix(color1: vec4f, color2: vec4f, edge: f32, x: f32) -> vec4f {
  let t = aaStep(edge, x);
  return mix(color1, color2, t);
}
`

/** 負のモジュロ対応ユーティリティ関数 */
export const moduloUtils = /* wgsl */ `
// 負の値でも正しく動作するモジュロ（スカラー版）
fn safeModulo(x: f32, period: f32) -> f32 {
  return ((x % period) + period) % period;
}

// 負の値でも正しく動作するモジュロ（ベクトル版）
fn safeModulo2(v: vec2f, period: f32) -> vec2f {
  return ((v % period) + period) % period;
}
`

/** マスク用ブレンドステート（アルファブレンド） */
export const maskBlendState: GPUBlendState = {
  color: {
    srcFactor: 'src-alpha',
    dstFactor: 'one-minus-src-alpha',
    operation: 'add',
  },
  alpha: {
    srcFactor: 'one',
    dstFactor: 'one-minus-src-alpha',
    operation: 'add',
  },
}

// ============================================================
// Noise Utilities
// ============================================================

/** ハッシュ関数（2D → 1D） */
export const hash21 = /* wgsl */ `
fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`

/** ハッシュ関数（2D → 2D） */
export const hash22 = /* wgsl */ `
fn hash22(p: vec2f) -> vec2f {
  var p3 = fract(vec3f(p.x, p.y, p.x) * vec3f(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
`

/**
 * Interleaved Gradient Noise (IGN)
 * ブルーノイズ的な分布を持つ高速ノイズ
 * Reference: Jorge Jimenez, "Next Generation Post Processing in Call of Duty"
 */
export const interleavedGradientNoise = /* wgsl */ `
fn interleavedGradientNoise(pos: vec2f, seed: f32) -> f32 {
  let magic = vec3f(0.06711056, 0.00583715, 52.9829189);
  let p = pos + seed * 5.588238;
  return fract(magic.z * fract(dot(p, magic.xy)));
}
`

/**
 * Value Noise（格子点補間ノイズ）
 * hash21 が必要
 */
export const valueNoise = /* wgsl */ `
fn valueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);  // smoothstep

  let a = hash21(i);
  let b = hash21(i + vec2f(1.0, 0.0));
  let c = hash21(i + vec2f(0.0, 1.0));
  let d = hash21(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`

/**
 * fBm (Fractal Brownian Motion)
 * valueNoise が必要、オクターブ数は固定（4）
 */
export const fbm = /* wgsl */ `
fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * valueNoise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
`

/** ノイズユーティリティをまとめたもの（hash21 + IGN + valueNoise） */
export const noiseUtils = /* wgsl */ `
${hash21}
${interleavedGradientNoise}
${valueNoise}
`

// ============================================================
// OKLAB Color Space Utilities (for perceptually correct interpolation)
// ============================================================

/**
 * OKLAB color space interpolation utilities
 * sRGB → Linear RGB → OKLAB → mix → OKLAB → Linear RGB → sRGB
 * This produces perceptually correct gradients without muddy midtones.
 *
 * Reference: Björn Ottosson, "A perceptual color space for image processing"
 * https://bottosson.github.io/posts/oklab/
 */
export const oklabUtils = /* wgsl */ `
// sRGB to Linear RGB (remove gamma)
fn srgbToLinear(c: f32) -> f32 {
  if (c <= 0.04045) {
    return c / 12.92;
  }
  return pow((c + 0.055) / 1.055, 2.4);
}

fn srgbToLinearVec3(c: vec3f) -> vec3f {
  return vec3f(srgbToLinear(c.r), srgbToLinear(c.g), srgbToLinear(c.b));
}

// Linear RGB to sRGB (apply gamma)
fn linearToSrgb(c: f32) -> f32 {
  if (c <= 0.0031308) {
    return c * 12.92;
  }
  return 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

fn linearToSrgbVec3(c: vec3f) -> vec3f {
  return vec3f(linearToSrgb(c.r), linearToSrgb(c.g), linearToSrgb(c.b));
}

// Linear RGB to OKLAB
fn linearRgbToOklab(c: vec3f) -> vec3f {
  let l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  let m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  let s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

  let l_ = pow(l, 1.0 / 3.0);
  let m_ = pow(m, 1.0 / 3.0);
  let s_ = pow(s, 1.0 / 3.0);

  return vec3f(
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  );
}

// OKLAB to Linear RGB
fn oklabToLinearRgb(c: vec3f) -> vec3f {
  let l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  let m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  let s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;

  let l = l_ * l_ * l_;
  let m = m_ * m_ * m_;
  let s = s_ * s_ * s_;

  return vec3f(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

// Mix two sRGB colors in OKLAB space (perceptually correct interpolation)
fn mixOklab(colorA: vec3f, colorB: vec3f, t: f32) -> vec3f {
  // Convert sRGB to OKLAB
  let labA = linearRgbToOklab(srgbToLinearVec3(colorA));
  let labB = linearRgbToOklab(srgbToLinearVec3(colorB));

  // Mix in OKLAB space
  let labMixed = mix(labA, labB, t);

  // Convert back to sRGB
  return linearToSrgbVec3(oklabToLinearRgb(labMixed));
}

// Mix two sRGB vec4f colors in OKLAB space (preserving alpha)
fn mixOklabVec4(colorA: vec4f, colorB: vec4f, t: f32) -> vec4f {
  let rgb = mixOklab(colorA.rgb, colorB.rgb, t);
  let alpha = mix(colorA.a, colorB.a, t);
  return vec4f(rgb, alpha);
}
`

// ============================================================
// Depth Map Utilities
// ============================================================

/** 深度マップタイプ */
export type DepthMapType = 'linear' | 'circular' | 'radial' | 'perlin'

/** 深度マップタイプをシェーダー用の数値に変換 */
export function depthMapTypeToNumber(type: DepthMapType): number {
  switch (type) {
    case 'linear': return 0
    case 'circular': return 1
    case 'radial': return 2
    case 'perlin': return 3
    default: return 0
  }
}

/**
 * 深度計算関数（WGSL）
 * depthMapType: 0=linear, 1=circular, 2=radial, 3=perlin
 */
export const depthMapUtils = /* wgsl */ `
const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;

// Hash function for noise
fn depthHash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Value noise for perlin depth
fn depthValueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  let a = depthHash21(i);
  let b = depthHash21(i + vec2f(1.0, 0.0));
  let c = depthHash21(i + vec2f(0.0, 1.0));
  let d = depthHash21(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// fBm for perlin depth
fn depthFbm(p: vec2f, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * depthValueNoise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Linear depth: gradient along angle direction
fn linearDepth(uv: vec2f, angle: f32, center: vec2f) -> f32 {
  let angleRad = (angle - 90.0) * PI / 180.0;
  let dir = vec2f(cos(angleRad), sin(angleRad));
  let centered = uv - center;
  let projected = dot(centered, dir);
  return clamp(projected + 0.5, 0.0, 1.0);
}

// Circular depth: distance from center
fn circularDepth(uv: vec2f, center: vec2f, aspect: f32, invert: f32) -> f32 {
  let diff = uv - center;
  let adjustedDiff = vec2f(diff.x * aspect, diff.y);
  let maxDist = length(vec2f(0.5 * aspect, 0.5));
  let dist = length(adjustedDiff);
  var t = clamp(dist / maxDist, 0.0, 1.0);
  if (invert > 0.5) {
    t = 1.0 - t;
  }
  return t;
}

// Radial depth: angle from center
fn radialDepth(uv: vec2f, center: vec2f, startAngle: f32, sweepAngle: f32) -> f32 {
  let diff = uv - center;
  var angle = atan2(diff.y, diff.x);
  if (angle < 0.0) {
    angle = angle + TWO_PI;
  }
  let startRad = startAngle * PI / 180.0;
  angle = angle - startRad;
  if (angle < 0.0) {
    angle = angle + TWO_PI;
  }
  if (angle > TWO_PI) {
    angle = angle - TWO_PI;
  }
  let sweepRad = sweepAngle * PI / 180.0;
  return clamp(angle / sweepRad, 0.0, 1.0);
}

// Perlin noise depth
fn perlinDepth(uv: vec2f, scale: f32, octaves: i32, seed: f32, contrast: f32, offset: f32) -> f32 {
  let noisePos = uv * scale + vec2f(seed * 0.1, seed * 0.073);
  var noise = depthFbm(noisePos, octaves);
  noise = (noise - 0.5) * contrast + 0.5 + offset;
  return clamp(noise, 0.0, 1.0);
}

// Unified depth function based on type
fn calculateDepth(
  uv: vec2f,
  depthType: f32,
  linearAngle: f32,
  center: vec2f,
  aspect: f32,
  circularInvert: f32,
  radialStartAngle: f32,
  radialSweepAngle: f32
) -> f32 {
  let typeInt = i32(depthType);
  switch(typeInt) {
    case 1: {
      return circularDepth(uv, center, aspect, circularInvert);
    }
    case 2: {
      return radialDepth(uv, center, radialStartAngle, radialSweepAngle);
    }
    default: {
      return linearDepth(uv, linearAngle, center);
    }
  }
}

// Extended depth function with perlin support
fn calculateDepthEx(
  uv: vec2f,
  depthType: f32,
  linearAngle: f32,
  center: vec2f,
  aspect: f32,
  circularInvert: f32,
  radialStartAngle: f32,
  radialSweepAngle: f32,
  perlinScale: f32,
  perlinOctaves: f32,
  perlinSeed: f32,
  perlinContrast: f32,
  perlinOffset: f32
) -> f32 {
  let typeInt = i32(depthType);
  switch(typeInt) {
    case 1: {
      return circularDepth(uv, center, aspect, circularInvert);
    }
    case 2: {
      return radialDepth(uv, center, radialStartAngle, radialSweepAngle);
    }
    case 3: {
      return perlinDepth(uv, perlinScale, i32(perlinOctaves), perlinSeed, perlinContrast, perlinOffset);
    }
    default: {
      return linearDepth(uv, linearAngle, center);
    }
  }
}
`
