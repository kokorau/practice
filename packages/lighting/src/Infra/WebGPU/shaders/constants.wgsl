// =============================================================================
// Constants
// =============================================================================

const EPSILON: f32 = 1e-6;           // General epsilon for comparisons
const SHADOW_OFFSET: f32 = 0.001;    // Offset to avoid self-shadowing
const MAX_DISTANCE: f32 = 1e10;      // Maximum ray distance
const SDF_EPSILON: f32 = 0.0001;     // Epsilon for SDF normal calculation
const RAY_MARCH_MAX_STEPS: i32 = 128; // Maximum steps for ray marching
const RAY_MARCH_MIN_DIST: f32 = 0.0001; // Minimum distance for ray march hit
const GAMMA: f32 = 2.2;              // sRGB gamma value
const INV_GAMMA: f32 = 1.0 / 2.2;    // Inverse gamma for linear to sRGB
const SAFE_INV_EPSILON: f32 = 1e-8;  // Epsilon for safe division
const PCF_SAMPLE_COUNT: i32 = 9;     // 3x3 PCF samples
const MAX_BOUNCES: i32 = 4;          // Maximum ray bounces for transparency/refraction
const AIR_IOR: f32 = 1.0;            // Index of refraction for air

// =============================================================================
// SSAA Jitter Patterns (sub-pixel offsets in range [-0.5, 0.5])
// =============================================================================

const MAX_SSAA_SAMPLES: u32 = 16u;

// 4-sample rotated grid pattern (good coverage for 4x SSAA)
const JITTER_4: array<vec2f, 4> = array<vec2f, 4>(
  vec2f(-0.125, -0.375),
  vec2f( 0.375, -0.125),
  vec2f(-0.375,  0.125),
  vec2f( 0.125,  0.375)
);

// 8-sample pattern (8-rook)
const JITTER_8: array<vec2f, 8> = array<vec2f, 8>(
  vec2f(-0.375, -0.4375),
  vec2f( 0.125, -0.3125),
  vec2f(-0.125, -0.1875),
  vec2f( 0.375, -0.0625),
  vec2f(-0.3125, 0.0625),
  vec2f( 0.1875, 0.1875),
  vec2f(-0.0625, 0.3125),
  vec2f( 0.4375, 0.4375)
);

// 16-sample pattern (4x4 jittered grid)
const JITTER_16: array<vec2f, 16> = array<vec2f, 16>(
  vec2f(-0.375, -0.375), vec2f(-0.125, -0.375), vec2f( 0.125, -0.375), vec2f( 0.375, -0.375),
  vec2f(-0.375, -0.125), vec2f(-0.125, -0.125), vec2f( 0.125, -0.125), vec2f( 0.375, -0.125),
  vec2f(-0.375,  0.125), vec2f(-0.125,  0.125), vec2f( 0.125,  0.125), vec2f( 0.375,  0.125),
  vec2f(-0.375,  0.375), vec2f(-0.125,  0.375), vec2f( 0.125,  0.375), vec2f( 0.375,  0.375)
);

// Get jitter offset for a given sample index and sample count
fn getJitterOffset(sampleIndex: u32, sampleCount: u32) -> vec2f {
  if (sampleCount <= 1u) {
    return vec2f(0.0, 0.0);
  } else if (sampleCount <= 4u) {
    return JITTER_4[sampleIndex % 4u];
  } else if (sampleCount <= 8u) {
    return JITTER_8[sampleIndex % 8u];
  } else {
    return JITTER_16[sampleIndex % 16u];
  }
}
