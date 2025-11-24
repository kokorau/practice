/**
 * K-means clustering shader for color quantization
 *
 * Phase 1: Assign each pixel to nearest centroid
 * Phase 2: Compute new centroids (sum colors per cluster)
 */

export const kmeansAssignShader = /* wgsl */ `
@group(0) @binding(0) var<storage, read> pixels: array<u32>;
@group(0) @binding(1) var<storage, read> centroids: array<vec3<f32>>;
@group(0) @binding(2) var<storage, read_write> assignments: array<u32>;
@group(0) @binding(3) var<uniform> numCentroids: u32;

fn unpackRgb(packed: u32) -> vec3<f32> {
  let r = f32(packed & 0xFFu);
  let g = f32((packed >> 8u) & 0xFFu);
  let b = f32((packed >> 16u) & 0xFFu);
  return vec3<f32>(r, g, b);
}

fn distance(a: vec3<f32>, b: vec3<f32>) -> f32 {
  let d = a - b;
  return dot(d, d);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= arrayLength(&pixels)) {
    return;
  }

  let pixel = unpackRgb(pixels[idx]);

  var minDist: f32 = 1e10;
  var minIdx: u32 = 0u;

  for (var i: u32 = 0u; i < numCentroids; i = i + 1u) {
    let dist = distance(pixel, centroids[i]);
    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }

  assignments[idx] = minIdx;
}
`

export const kmeansSumShader = /* wgsl */ `
@group(0) @binding(0) var<storage, read> pixels: array<u32>;
@group(0) @binding(1) var<storage, read> assignments: array<u32>;
@group(0) @binding(2) var<storage, read_write> sums: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> counts: array<atomic<u32>>;

fn unpackRgb(packed: u32) -> vec3<u32> {
  let r = packed & 0xFFu;
  let g = (packed >> 8u) & 0xFFu;
  let b = (packed >> 16u) & 0xFFu;
  return vec3<u32>(r, g, b);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= arrayLength(&pixels)) {
    return;
  }

  let pixel = unpackRgb(pixels[idx]);
  let cluster = assignments[idx];

  // Accumulate RGB sums (cluster * 3 + channel)
  atomicAdd(&sums[cluster * 3u], pixel.x);
  atomicAdd(&sums[cluster * 3u + 1u], pixel.y);
  atomicAdd(&sums[cluster * 3u + 2u], pixel.z);
  atomicAdd(&counts[cluster], 1u);
}
`
