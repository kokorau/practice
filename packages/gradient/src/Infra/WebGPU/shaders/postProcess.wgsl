// ============================================
// Post-processing functions
// ============================================

// Simple hash for grain generation
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
}

// Mono grain (same noise value for RGB)
fn applyGrain(color: vec3f, uv: vec2f) -> vec3f {
  if (uniforms.grainAmount < 0.0001) {
    return color;
  }

  let grainUV = uv * uniforms.resolution / uniforms.grainScale;
  let seed = uniforms.grainSeed;
  let noise = hash(grainUV + vec2f(seed)) * 2.0 - 1.0;

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
