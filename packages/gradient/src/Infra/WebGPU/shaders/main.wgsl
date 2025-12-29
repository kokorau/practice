// ============================================
// Shader entry points
// ============================================

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  // Full-screen quad (2 triangles, 6 vertices)
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);

  // Convert clip space (-1 to 1) to UV (0 to 1)
  output.uv = positions[vertexIndex] * 0.5 + 0.5;
  // Flip Y for standard texture coordinates
  output.uv.y = 1.0 - output.uv.y;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Apply domain warp
  let warpedUV = applyWarp(input.uv);

  // Blend colors in OKLab space
  var color = blendColors(warpedUV);

  // Apply post-processing
  color = vec4f(applyGrain(color.rgb, input.uv), color.a);
  color = vec4f(applyDither(color.rgb, input.uv), color.a);

  return color;
}
