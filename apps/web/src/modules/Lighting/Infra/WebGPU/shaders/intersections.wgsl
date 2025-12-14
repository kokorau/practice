// =============================================================================
// Ray-Shape Intersection Functions
// =============================================================================

// -----------------------------------------------------------------------------
// Plane Intersection
// -----------------------------------------------------------------------------

fn getPlaneNormal(plane: Plane, rayDir: vec3f) -> vec3f {
  // Flip normal if ray is hitting from behind
  if (dot(rayDir, plane.normal) > 0.0) {
    return -plane.normal;
  }
  return plane.normal;
}

fn intersectPlane(rayOrigin: vec3f, rayDir: vec3f, plane: Plane) -> f32 {
  let denom = dot(rayDir, plane.normal);
  if (abs(denom) < EPSILON) {
    return -1.0;
  }

  let diff = plane.point - rayOrigin;
  let t = dot(diff, plane.normal) / denom;

  if (t < 0.0) {
    return -1.0;
  }

  // Check bounds if plane has finite size
  if (plane.size.x > 0.0 || plane.size.y > 0.0) {
    let hitPoint = rayOrigin + t * rayDir;
    let localOffset = hitPoint - plane.point;
    let basis = buildBasis(plane.normal);
    let u = dot(localOffset, basis[0]);
    let v = dot(localOffset, basis[1]);

    var halfWidth: f32;
    var halfHeight: f32;
    if (plane.size.x > 0.0) { halfWidth = plane.size.x * 0.5; } else { halfWidth = 1e10; }
    if (plane.size.y > 0.0) { halfHeight = plane.size.y * 0.5; } else { halfHeight = 1e10; }

    if (abs(u) > halfWidth || abs(v) > halfHeight) {
      return -1.0;
    }
  }

  return t;
}

// -----------------------------------------------------------------------------
// Box Intersection (Sharp edges)
// -----------------------------------------------------------------------------

// Ray-OBB intersection (sharp box)
fn intersectBox(rayOrigin: vec3f, rayDir: vec3f, box: Box) -> vec2f {
  // Returns vec2f(t, normalAxis) where normalAxis encodes which face was hit
  let localOrigin = box.rotation * (rayOrigin - box.center);
  let localDir = box.rotation * rayDir;

  let halfSize = box.size * 0.5;
  let invDir = safeInverse(localDir);

  let t1 = (-halfSize - localOrigin) * invDir;
  let t2 = (halfSize - localOrigin) * invDir;

  let tMin = min(t1, t2);
  let tMax = max(t1, t2);

  let tNear = max(max(tMin.x, tMin.y), tMin.z);
  let tFar = min(min(tMax.x, tMax.y), tMax.z);

  if (tNear > tFar || tFar < 0.0) {
    return vec2f(-1.0, 0.0);
  }

  var t: f32;
  if (tNear > 0.0) { t = tNear; } else { t = tFar; }

  // Encode which axis was hit (1=x, 2=y, 3=z)
  let hitPoint = localOrigin + t * localDir;
  let d = abs(hitPoint) - halfSize;
  var axis: f32 = 3.0;
  if (d.x > d.y && d.x > d.z) {
    axis = 1.0;
  } else if (d.y > d.z) {
    axis = 2.0;
  }

  return vec2f(t, axis);
}

fn getBoxNormal(box: Box, localHitPoint: vec3f, axis: f32) -> vec3f {
  var localNormal: vec3f;
  if (axis < 1.5) {
    localNormal = vec3f(sign(localHitPoint.x), 0.0, 0.0);
  } else if (axis < 2.5) {
    localNormal = vec3f(0.0, sign(localHitPoint.y), 0.0);
  } else {
    localNormal = vec3f(0.0, 0.0, sign(localHitPoint.z));
  }
  return normalize(box.rotationInv * localNormal);
}

// -----------------------------------------------------------------------------
// Rounded Box Intersection (Ray marching)
// -----------------------------------------------------------------------------

fn intersectRoundBox(rayOrigin: vec3f, rayDir: vec3f, box: Box) -> vec2f {
  let localOrigin = box.rotation * (rayOrigin - box.center);
  let localDir = normalize(box.rotation * rayDir);
  let halfSize = box.size * 0.5;
  let radius = box.radius;

  // Quick AABB bounds check
  let invDir = safeInverse(localDir);
  let t1 = (-halfSize - radius - localOrigin) * invDir;
  let t2 = (halfSize + radius - localOrigin) * invDir;
  let tMin = min(t1, t2);
  let tMax = max(t1, t2);
  let tNear = max(max(tMin.x, tMin.y), tMin.z);
  let tFar = min(min(tMax.x, tMax.y), tMax.z);

  if (tNear > tFar || tFar < 0.0) {
    return vec2f(-1.0, 0.0);
  }

  // Ray marching
  var t = max(tNear - SHADOW_OFFSET, 0.0);

  for (var i = 0; i < RAY_MARCH_MAX_STEPS; i++) {
    let p = localOrigin + t * localDir;
    let d = sdRoundBox(p, halfSize, radius);

    if (d < RAY_MARCH_MIN_DIST) {
      return vec2f(t, 1.0); // Hit, flag as rounded
    }

    t += d;

    if (t > tFar) {
      break;
    }
  }

  return vec2f(-1.0, 0.0);
}

fn getRoundBoxNormal(box: Box, rayOrigin: vec3f, rayDir: vec3f, t: f32) -> vec3f {
  let localOrigin = box.rotation * (rayOrigin - box.center);
  let localDir = normalize(box.rotation * rayDir);
  let p = localOrigin + t * localDir;
  let localNormal = calcRoundBoxNormal(p, box.size * 0.5, box.radius);
  return normalize(box.rotationInv * localNormal);
}

// -----------------------------------------------------------------------------
// Capsule Intersection
// -----------------------------------------------------------------------------

fn intersectCapsule(rayOrigin: vec3f, rayDir: vec3f, capsule: Capsule) -> f32 {
  let pa = capsule.pointA;
  let pb = capsule.pointB;
  let r = capsule.radius;

  let ba = pb - pa;
  let oa = rayOrigin - pa;

  let baba = dot(ba, ba);
  let bard = dot(ba, rayDir);
  let baoa = dot(ba, oa);
  let rdoa = dot(rayDir, oa);
  let oaoa = dot(oa, oa);

  let a = baba - bard * bard;
  let b = baba * rdoa - baoa * bard;
  let c = baba * oaoa - baoa * baoa - r * r * baba;
  let h = b * b - a * c;

  if (h >= 0.0) {
    let t = (-b - sqrt(h)) / a;
    let y = baoa + t * bard;

    // Cylinder body hit
    if (y > 0.0 && y < baba && t > 0.0) {
      return t;
    }

    // Hemisphere caps
    var oc: vec3f;
    if (y <= 0.0) {
      oc = oa;
    } else {
      oc = rayOrigin - pb;
    }

    let b2 = dot(rayDir, oc);
    let c2 = dot(oc, oc) - r * r;
    let h2 = b2 * b2 - c2;

    if (h2 > 0.0) {
      let t2 = -b2 - sqrt(h2);
      if (t2 > 0.0) {
        return t2;
      }
    }
  }

  return -1.0;
}

fn getCapsuleNormal(capsule: Capsule, hitPoint: vec3f) -> vec3f {
  let ba = capsule.pointB - capsule.pointA;
  let pa = hitPoint - capsule.pointA;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return normalize(pa - h * ba);
}

// -----------------------------------------------------------------------------
// Sphere Intersection
// -----------------------------------------------------------------------------

fn intersectSphere(rayOrigin: vec3f, rayDir: vec3f, sphere: Sphere) -> f32 {
  let oc = rayOrigin - sphere.center;
  let a = dot(rayDir, rayDir);
  let b = 2.0 * dot(oc, rayDir);
  let c = dot(oc, oc) - sphere.radius * sphere.radius;
  let discriminant = b * b - 4.0 * a * c;

  if (discriminant < 0.0) {
    return -1.0;
  }

  let t = (-b - sqrt(discriminant)) / (2.0 * a);
  if (t > 0.0) {
    return t;
  }

  // Check the far intersection
  let t2 = (-b + sqrt(discriminant)) / (2.0 * a);
  if (t2 > 0.0) {
    return t2;
  }

  return -1.0;
}

fn getSphereNormal(sphere: Sphere, hitPoint: vec3f) -> vec3f {
  return normalize(hitPoint - sphere.center);
}
