import { fullscreenVertex } from './common'

/**
 * Image texture shader
 * Samples from an external texture and displays it with cover fit
 */
export const imageShader = /* wgsl */ `
${fullscreenVertex}

@group(0) @binding(0) var imageSampler: sampler;
@group(0) @binding(1) var imageTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: ImageParams;

struct ImageParams {
  // viewport dimensions
  viewportWidth: f32,
  viewportHeight: f32,
  // image dimensions
  imageWidth: f32,
  imageHeight: f32,
}

@fragment
fn fragmentMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let viewportAspect = params.viewportWidth / params.viewportHeight;
  let imageAspect = params.imageWidth / params.imageHeight;

  // Normalize coordinates to 0-1
  var uv = fragCoord.xy / vec2f(params.viewportWidth, params.viewportHeight);

  // Cover fit: scale to fill viewport while maintaining aspect ratio
  if (imageAspect > viewportAspect) {
    // Image is wider - scale by height, crop width
    let scale = viewportAspect / imageAspect;
    uv.x = (uv.x - 0.5) * scale + 0.5;
  } else {
    // Image is taller - scale by width, crop height
    let scale = imageAspect / viewportAspect;
    uv.y = (uv.y - 0.5) * scale + 0.5;
  }

  // Clamp UV to valid range
  uv = clamp(uv, vec2f(0.0), vec2f(1.0));

  return textureSample(imageTexture, imageSampler, uv);
}
`
