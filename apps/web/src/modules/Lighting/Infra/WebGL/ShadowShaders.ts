/**
 * Pre-defined shadow shader GLSL functions
 * Each shader implements: float applyShadow(float baseShadow, vec3 hitPoint, vec2 screenUV, float shadowDistance)
 *
 * With PCF enabled (shadowBlur > 0):
 * - baseShadow: 0.0 to 1.0 based on PCF sampling (0 = full shadow, 1 = no shadow)
 * - The shader can use baseShadow directly for CSS-like edge blur
 *
 * Without PCF (shadowBlur = 0):
 * - baseShadow: always 0.0 (point is in shadow)
 */

/**
 * Simple PCF shadow - uses baseShadow from PCF sampling directly
 * Works best with shadowBlur > 0 for CSS box-shadow-like effect
 * @param minShadow - minimum shadow intensity (default: 0.3)
 */
export const createPCFShadowShader = (minShadow = 0.3) => `
  float applyShadow(float baseShadow, vec3 hitPoint, vec2 screenUV, float shadowDistance) {
    // baseShadow is 0-1 from PCF, map to minShadow-1.0 range
    return mix(${minShadow.toFixed(4)}, 1.0, baseShadow);
  }
`

/**
 * Noise shadow - adds fine noise texture to shadows
 */
export const noiseShadowShader = `
  float applyShadow(float baseShadow, vec3 hitPoint, vec2 screenUV, float shadowDistance) {
    float n = noise(screenUV * 500.0 + hitPoint.xy * 1.0);
    return 0.3 + n * 0.2;
  }
`

/**
 * Soft shadow - distance-based blur effect
 * Closer shadows are sharper, farther shadows are softer
 * @param softness - controls how quickly shadows blur with distance (default: 0.1)
 * @param minShadow - minimum shadow intensity (default: 0.3)
 */
export const createSoftShadowShader = (softness = 0.1, minShadow = 0.3) => `
  float applyShadow(float baseShadow, vec3 hitPoint, vec2 screenUV, float shadowDistance) {
    // Shadow intensity decreases (gets lighter) with distance
    float blur = 1.0 - exp(-shadowDistance * ${softness.toFixed(4)});
    return mix(${minShadow.toFixed(4)}, 1.0, blur);
  }
`

/**
 * PCF shadow with noise - combines PCF edge blur with noise texture
 */
export const createPCFNoiseShadowShader = (minShadow = 0.2, noiseAmount = 0.1) => `
  float applyShadow(float baseShadow, vec3 hitPoint, vec2 screenUV, float shadowDistance) {
    // Use PCF baseShadow for edge softness
    float shadow = mix(${minShadow.toFixed(4)}, 1.0, baseShadow);

    // Add noise texture
    float n = noise(screenUV * 500.0 + hitPoint.xy);
    shadow += n * ${noiseAmount.toFixed(4)} * (1.0 - baseShadow);

    return clamp(shadow, 0.0, 1.0);
  }
`

/**
 * Soft shadow with noise - combines distance blur with noise texture
 */
export const createSoftNoiseShadowShader = (softness = 0.1, minShadow = 0.2, noiseAmount = 0.15) => `
  float applyShadow(float baseShadow, vec3 hitPoint, vec2 screenUV, float shadowDistance) {
    // Distance-based blur
    float blur = 1.0 - exp(-shadowDistance * ${softness.toFixed(4)});
    float shadow = mix(${minShadow.toFixed(4)}, 1.0, blur);

    // Add noise that increases with distance (farther = more noise)
    float n = noise(screenUV * 500.0 + hitPoint.xy);
    shadow += n * ${noiseAmount.toFixed(4)} * blur;

    return clamp(shadow, 0.0, 1.0);
  }
`
