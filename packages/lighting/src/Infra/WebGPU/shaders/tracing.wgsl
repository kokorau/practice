// =============================================================================
// Box Helper Functions
// =============================================================================

// Check a single box and update hit info if closer
fn checkBox(boxIndex: u32, rayOrigin: vec3f, rayDir: vec3f, hit: ptr<function, HitInfo>) {
  let box = boxes[boxIndex];
  var result: vec2f;

  if (box.radius > 0.0) {
    result = intersectRoundBox(rayOrigin, rayDir, box);
  } else {
    result = intersectBox(rayOrigin, rayDir, box);
  }

  let t = result.x;
  if (t > 0.0 && t < (*hit).t) {
    (*hit).t = t;
    (*hit).color = box.color;
    (*hit).alpha = box.alpha;
    (*hit).ior = box.ior;

    if (box.radius > 0.0) {
      (*hit).normal = getRoundBoxNormal(box, rayOrigin, rayDir, t);
    } else {
      let localOrigin = box.rotation * (rayOrigin - box.center);
      let localDir = box.rotation * rayDir;
      let localHit = localOrigin + t * localDir;
      (*hit).normal = getBoxNormal(box, localHit, result.y);
    }
  }
}

// Check box for shadow (returns true if hit)
fn checkBoxShadow(boxIndex: u32, shadowOrigin: vec3f, lightDir: vec3f) -> f32 {
  let box = boxes[boxIndex];
  var result: vec2f;

  if (box.radius > 0.0) {
    result = intersectRoundBox(shadowOrigin, lightDir, box);
  } else {
    result = intersectBox(shadowOrigin, lightDir, box);
  }

  return result.x;
}

// =============================================================================
// Ray Tracing Core Functions
// =============================================================================

// Trace primary ray and find closest hit with full material info
fn traceRay(rayOrigin: vec3f, rayDir: vec3f) -> HitInfo {
  var hit: HitInfo;
  hit.t = MAX_DISTANCE;
  hit.color = scene.backgroundColor;
  hit.normal = vec3f(0.0);
  hit.alpha = 1.0;
  hit.ior = AIR_IOR;

  // Always check planes (infinite planes are not in BVH)
  // This is O(N) but planes are usually few
  for (var i = 0u; i < scene.planeCount; i++) {
    let plane = planes[i];
    let t = intersectPlane(rayOrigin, rayDir, plane);

    if (t > 0.0 && t < hit.t) {
      hit.t = t;
      hit.color = plane.color;
      hit.normal = getPlaneNormal(plane, rayDir);
      hit.alpha = plane.alpha;
      hit.ior = plane.ior;
    }
  }

  // Use BVH traversal if available (handles boxes, spheres, capsules)
  if (bvh.useBVH != 0u) {
    traceRayBVH(rayOrigin, rayDir, &hit);
  } else {
    // Fallback: check all objects if BVH is not available
    // Check boxes
    for (var i = 0u; i < scene.boxCount; i++) {
      checkBox(i, rayOrigin, rayDir, &hit);
    }

    // Check capsules
    for (var i = 0u; i < scene.capsuleCount; i++) {
      let capsule = capsules[i];
      let t = intersectCapsule(rayOrigin, rayDir, capsule);

      if (t > 0.0 && t < hit.t) {
        hit.t = t;
        hit.color = capsule.color;
        hit.alpha = capsule.alpha;
        hit.ior = capsule.ior;
        let hitPoint = rayOrigin + t * rayDir;
        hit.normal = getCapsuleNormal(capsule, hitPoint);
      }
    }

    // Check spheres
    for (var i = 0u; i < scene.sphereCount; i++) {
      let sphere = spheres[i];
      let t = intersectSphere(rayOrigin, rayDir, sphere);

      if (t > 0.0 && t < hit.t) {
        hit.t = t;
        hit.color = sphere.color;
        hit.alpha = sphere.alpha;
        hit.ior = sphere.ior;
        let hitPoint = rayOrigin + t * rayDir;
        hit.normal = getSphereNormal(sphere, hitPoint);
      }
    }
  }

  return hit;
}

// =============================================================================
// Shadow Functions
// =============================================================================

// Shadow ray (simplified, returns distance or -1)
fn traceShadow(hitPoint: vec3f, lightDir: vec3f) -> f32 {
  let shadowOrigin = hitPoint + lightDir * SHADOW_OFFSET;

  // Always check planes (infinite planes are not in BVH)
  for (var i = 0u; i < scene.planeCount; i++) {
    let t = intersectPlane(shadowOrigin, lightDir, planes[i]);
    if (t > 0.0) {
      return t;
    }
  }

  // Use BVH traversal if available
  if (bvh.useBVH != 0u) {
    let bvhResult = traceShadowBVH(shadowOrigin, lightDir);
    if (bvhResult > 0.0) {
      return bvhResult;
    }
  } else {
    // Fallback: check all objects if BVH is not available
    // Check boxes
    for (var i = 0u; i < scene.boxCount; i++) {
      let t = checkBoxShadow(i, shadowOrigin, lightDir);
      if (t > 0.0) {
        return t;
      }
    }

    // Check capsules
    for (var i = 0u; i < scene.capsuleCount; i++) {
      let t = intersectCapsule(shadowOrigin, lightDir, capsules[i]);
      if (t > 0.0) {
        return t;
      }
    }

    // Check spheres
    for (var i = 0u; i < scene.sphereCount; i++) {
      let t = intersectSphere(shadowOrigin, lightDir, spheres[i]);
      if (t > 0.0) {
        return t;
      }
    }
  }

  return -1.0;
}

// PCF shadow sampling
fn sampleShadowAt(hitPoint: vec3f, lightDir: vec3f, lightRight: vec3f, lightUp: vec3f, offset: vec2f) -> f32 {
  let offsetPoint = hitPoint + lightRight * offset.x * scene.shadowBlur + lightUp * offset.y * scene.shadowBlur;
  return traceShadow(offsetPoint, lightDir);
}

fn calcShadow(hitPoint: vec3f, lightDir: vec3f) -> f32 {
  if (scene.shadowBlur <= 0.0) {
    let shadowDist = traceShadow(hitPoint, lightDir);
    if (shadowDist > 0.0) {
      return 0.0;
    }
    return 1.0;
  }

  let basis = buildBasis(lightDir);
  let lightRight = basis[0];
  let lightUp = basis[1];

  var hitCount = 0;

  // 3x3 PCF sampling loop
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let offset = vec2f(f32(x), f32(y));
      let d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, offset);
      if (d > 0.0) {
        hitCount++;
      }
    }
  }

  if (hitCount == 0) {
    return 1.0;
  }

  return 1.0 - f32(hitCount) / f32(PCF_SAMPLE_COUNT);
}
