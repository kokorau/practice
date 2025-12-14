// Mesh Rendering Shader
// Renders triangle meshes with vertex colors and transparency

struct Uniforms {
  mvp: mat4x4f,           // Model-View-Projection matrix
  opacity: f32,           // Global opacity (0-1)
  _padding: vec3f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec3f,
  @location(1) color: vec3f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.mvp * vec4f(input.position, 1.0);
  output.color = input.color;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return vec4f(input.color, uniforms.opacity);
}
