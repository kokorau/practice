/**
 * WGSL Compute Shader for Histogram calculation
 * OKLAB luminance を GPU で計算
 */

export const histogramShader = /* wgsl */ `
// 入力: RGBA画像データ
@group(0) @binding(0) var<storage, read> pixels: array<u32>;
// 出力: R, G, B, Luminance のヒストグラム (各256ビン)
@group(0) @binding(1) var<storage, read_write> histogramR: array<atomic<u32>, 256>;
@group(0) @binding(2) var<storage, read_write> histogramG: array<atomic<u32>, 256>;
@group(0) @binding(3) var<storage, read_write> histogramB: array<atomic<u32>, 256>;
@group(0) @binding(4) var<storage, read_write> histogramL: array<atomic<u32>, 256>;

// sRGB to Linear
fn srgbToLinear(c: f32) -> f32 {
  let s = c / 255.0;
  if (s <= 0.04045) {
    return s / 12.92;
  }
  return pow((s + 0.055) / 1.055, 2.4);
}

// OKLAB Lightness (0-255)
fn oklabLightness(r: f32, g: f32, b: f32) -> u32 {
  // sRGB to Linear
  let lr = srgbToLinear(r);
  let lg = srgbToLinear(g);
  let lb = srgbToLinear(b);

  // Linear RGB to LMS
  let l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  let m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  let s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  // LMS to OKLAB (cube root)
  let l_ = pow(max(l, 0.0), 1.0/3.0);
  let m_ = pow(max(m, 0.0), 1.0/3.0);
  let s_ = pow(max(s, 0.0), 1.0/3.0);

  // OKLAB L
  let L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;

  return u32(clamp(L * 255.0, 0.0, 255.0));
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  let pixelCount = arrayLength(&pixels);

  if (idx >= pixelCount) {
    return;
  }

  // RGBA packed as u32 (little endian: ABGR)
  let packed = pixels[idx];
  let r = f32(packed & 0xFFu);
  let g = f32((packed >> 8u) & 0xFFu);
  let b = f32((packed >> 16u) & 0xFFu);

  // Histogram bins
  let binR = u32(r);
  let binG = u32(g);
  let binB = u32(b);
  let binL = oklabLightness(r, g, b);

  // Atomic increment
  atomicAdd(&histogramR[binR], 1u);
  atomicAdd(&histogramG[binG], 1u);
  atomicAdd(&histogramB[binB], 1u);
  atomicAdd(&histogramL[binL], 1u);
}
`
