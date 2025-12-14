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
