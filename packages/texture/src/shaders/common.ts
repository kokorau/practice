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
 * depthMapType: 0=linear, 1=circular, 2=radial, 3=perlin (perlin is handled separately)
 */
export const depthMapUtils = /* wgsl */ `
const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;

// Linear depth: gradient along angle direction
fn linearDepth(uv: vec2f, angle: f32) -> f32 {
  let angleRad = (angle - 90.0) * PI / 180.0;
  let dir = vec2f(cos(angleRad), sin(angleRad));
  let centered = uv - vec2f(0.5, 0.5);
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
      return linearDepth(uv, linearAngle);
    }
  }
}
`
