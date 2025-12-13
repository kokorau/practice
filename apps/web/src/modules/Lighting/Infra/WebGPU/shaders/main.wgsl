// =============================================================================
// Shader Entry Points
// =============================================================================

// -----------------------------------------------------------------------------
// Vertex Shader
// -----------------------------------------------------------------------------

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  // Full-screen quad (2 triangles)
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  // Convert from clip space (-1 to 1) to UV (0 to 1)
  // Note: WebGPU Y is top-down, so flip V
  output.uv = positions[vertexIndex] * 0.5 + 0.5;
  output.uv.y = 1.0 - output.uv.y;
  return output;
}

// -----------------------------------------------------------------------------
// Shading
// -----------------------------------------------------------------------------

// Calculate surface shading (ambient + diffuse with shadows)
fn calcShading(hitPoint: vec3f, surfaceColor: vec3f, normal: vec3f) -> vec3f {
  // Convert to linear space
  let linearSurfaceColor = srgbToLinear(surfaceColor);
  let linearAmbientColor = srgbToLinear(scene.ambientColor);

  // Ambient lighting
  var result = linearSurfaceColor * linearAmbientColor * scene.ambientIntensity;

  // Diffuse from directional lights
  for (var i = 0u; i < scene.lightCount; i++) {
    let light = lights[i];
    let NdotL = max(0.0, dot(normal, light.direction));

    if (NdotL > 0.0) {
      let linearLightColor = srgbToLinear(light.color);
      let shadow = calcShadow(hitPoint, light.direction);
      result += linearSurfaceColor * linearLightColor * light.intensity * NdotL * shadow;
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// Fragment Shader
// -----------------------------------------------------------------------------

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Generate ray from orthographic camera
  let offsetU = input.uv.x - 0.5;
  let offsetV = (1.0 - input.uv.y) - 0.5; // Flip back for ray calculation

  var currentOrigin = scene.camera.position
    + scene.camera.right * offsetU * scene.camera.width
    + scene.camera.up * offsetV * scene.camera.height;
  var currentDir = scene.camera.forward;

  // Accumulated color and transmittance for transparency
  var accumulatedColor = vec3f(0.0);
  var transmittance = 1.0;
  var currentIor = AIR_IOR;  // Track current medium's IOR

  // Iterative ray tracing for transparency/refraction
  for (var bounce = 0; bounce < MAX_BOUNCES; bounce++) {
    let hit = traceRay(currentOrigin, currentDir);

    // No hit - add background and exit
    if (hit.t >= MAX_DISTANCE) {
      accumulatedColor += transmittance * srgbToLinear(scene.backgroundColor);
      break;
    }

    let hitPoint = currentOrigin + hit.t * currentDir;

    // Calculate surface shading
    let surfaceShading = calcShading(hitPoint, hit.color, hit.normal);

    // Opaque surface - add color and exit
    if (hit.alpha >= 1.0) {
      accumulatedColor += transmittance * surfaceShading;
      break;
    }

    // Transparent surface - blend and continue
    let surfaceContribution = hit.alpha;
    accumulatedColor += transmittance * surfaceContribution * surfaceShading;
    transmittance *= (1.0 - surfaceContribution);

    // If transmittance is negligible, stop
    if (transmittance < 0.01) {
      break;
    }

    // Determine if entering or exiting the medium
    let cosTheta = dot(-currentDir, hit.normal);
    let entering = cosTheta > 0.0;

    var refractNormal: vec3f;
    var eta: f32;

    if (entering) {
      // Entering the medium (air -> material)
      refractNormal = hit.normal;
      eta = currentIor / hit.ior;
    } else {
      // Exiting the medium (material -> air)
      refractNormal = -hit.normal;
      eta = hit.ior / AIR_IOR;
    }

    // Calculate refraction
    let refractResult = calcRefraction(currentDir, refractNormal, eta);

    if (refractResult.w > 0.5) {
      // Refraction succeeded
      currentDir = refractResult.xyz;
      currentIor = select(hit.ior, AIR_IOR, entering);
    } else {
      // Total internal reflection - reflect instead
      currentDir = reflect(currentDir, refractNormal);
    }

    // Offset origin to avoid self-intersection
    currentOrigin = hitPoint + currentDir * SHADOW_OFFSET;
  }

  // Convert back to sRGB
  let finalColor = linearToSrgb(accumulatedColor);
  return vec4f(finalColor, 1.0);
}
