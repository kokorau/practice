// ============================================
// Post-processing functions
// ============================================

// R2 sequence constants (plastic constant based)
const R2_A1: f32 = 0.7548776662466927; // 1 / phi2
const R2_A2: f32 = 0.5698402909980532; // 1 / phi2^2

// R2 low-discrepancy sequence for blue noise approximation
// Based on: http://extremelearning.com.au/unreasonable-effectiveness-of-quasirandom-sequences/
fn r2Sequence(index: f32) -> vec2f {
  return fract(vec2f(R2_A1, R2_A2) * index);
}

// Hash for spatial variation
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
}

// Blue noise approximation using R2 sequence with spatial scrambling
fn blueNoise(pixelCoord: vec2f, seed: f32) -> f32 {
  // Get pixel index with seed offset
  let index = pixelCoord.x + pixelCoord.y * 1920.0 + seed * 7919.0;

  // R2 sequence gives low-discrepancy distribution
  let r2 = r2Sequence(index);

  // Spatial scrambling to break any remaining pattern
  let spatialHash = hash(pixelCoord * 0.1 + vec2f(seed));

  // Combine R2 with spatial hash for blue noise characteristics
  return fract(r2.x + r2.y + spatialHash) * 2.0 - 1.0;
}

// Triangular PDF blue noise (better perceptual distribution)
fn triangularBlueNoise(pixelCoord: vec2f, seed: f32) -> f32 {
  let n1 = blueNoise(pixelCoord, seed);
  let n2 = blueNoise(pixelCoord, seed + 1.0);
  // Triangular distribution: sum of two uniform = triangular
  return (n1 + n2) * 0.5;
}

// Mono grain using blue noise
fn applyGrain(color: vec3f, uv: vec2f) -> vec3f {
  if (uniforms.grainAmount < 0.0001) {
    return color;
  }

  let pixelCoord = floor(uv * uniforms.resolution / uniforms.grainScale);
  let seed = uniforms.grainSeed;

  // Use triangular blue noise for smoother grain
  let noise = triangularBlueNoise(pixelCoord, seed);

  // Apply grain with intensity
  return color + vec3f(noise * uniforms.grainAmount * 0.1);
}

// Blue noise dither approximation (using hash-based noise)
// For better quality, use an actual blue noise texture
fn applyDither(color: vec3f, uv: vec2f) -> vec3f {
  if (uniforms.ditherAmount < 0.0001) {
    return color;
  }

  // Generate blue-noise-like pattern using interleaved gradient noise
  let pixelCoord = uv * uniforms.resolution;
  let frame = uniforms.grainSeed;
  let magic = vec3f(0.06711056, 0.00583715, 52.9829189);
  let noise = fract(magic.z * fract(dot(pixelCoord + vec2f(frame), magic.xy)));

  let dither = (noise - 0.5) * uniforms.ditherAmount * 0.02;
  return color + vec3f(dither);
}
