// Point Rendering Shader
// Renders points as billboard quads with circular shape

struct Uniforms {
  mvp: mat4x4f,           // Model-View-Projection matrix
  cameraRight: vec3f,     // Camera right vector (for billboarding)
  _pad0: f32,
  cameraUp: vec3f,        // Camera up vector (for billboarding)
  _pad1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec3f,   // Point center position
  @location(1) color: vec3f,      // Point color
  @location(2) sizeAndCorner: vec3f,  // size, cornerX, cornerY
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) uv: vec2f,  // UV for circle rendering (-1 to 1)
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  let size = input.sizeAndCorner.x;
  let cornerX = input.sizeAndCorner.y;
  let cornerY = input.sizeAndCorner.z;

  // Calculate billboard offset
  let offset = uniforms.cameraRight * cornerX * size * 0.5
             + uniforms.cameraUp * cornerY * size * 0.5;

  let worldPos = input.position + offset;

  var output: VertexOutput;
  output.position = uniforms.mvp * vec4f(worldPos, 1.0);
  output.color = input.color;
  output.uv = vec2f(cornerX, cornerY);
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Discard pixels outside the circle
  let dist = length(input.uv);
  if (dist > 1.0) {
    discard;
  }

  // Smooth edge (anti-aliasing)
  let alpha = 1.0 - smoothstep(0.8, 1.0, dist);

  return vec4f(input.color, alpha);
}
