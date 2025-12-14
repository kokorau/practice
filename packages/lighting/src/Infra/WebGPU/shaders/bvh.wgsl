// =============================================================================
// BVH Traversal Functions
// =============================================================================

const BVH_MAX_STACK_SIZE: u32 = 32u;

/**
 * Ray-AABB intersection test
 * Returns hit distance, or -1.0 if no intersection
 */
fn intersectAABB(rayOrigin: vec3f, rayDirInv: vec3f, aabbMin: vec3f, aabbMax: vec3f) -> f32 {
  let t1 = (aabbMin - rayOrigin) * rayDirInv;
  let t2 = (aabbMax - rayOrigin) * rayDirInv;

  let tMin = min(t1, t2);
  let tMax = max(t1, t2);

  let tNear = max(max(tMin.x, tMin.y), tMin.z);
  let tFar = min(min(tMax.x, tMax.y), tMax.z);

  if (tNear > tFar || tFar < 0.0) {
    return -1.0;
  }

  if (tNear > 0.0) {
    return tNear;
  }
  return tFar;
}

/**
 * Test intersection with a single object based on type
 * Updates hit info if closer hit found
 */
fn testObjectIntersection(
  objectIndex: i32,
  objectType: u32,
  rayOrigin: vec3f,
  rayDir: vec3f,
  hit: ptr<function, HitInfo>
) {
  if (objectIndex < 0) { return; }

  let idx = u32(objectIndex);

  // DEBUG: Test only BOX type, skip switch for now
  if (objectType == OBJ_TYPE_BOX) {
    checkBox(idx, rayOrigin, rayDir, hit);
    return;
  }
  if (objectType == OBJ_TYPE_SPHERE) {
    let sphere = spheres[idx];
    let t = intersectSphere(rayOrigin, rayDir, sphere);
    if (t > 0.0 && t < (*hit).t) {
      (*hit).t = t;
      (*hit).color = sphere.color;
      (*hit).alpha = sphere.alpha;
      (*hit).ior = sphere.ior;
      let hitPoint = rayOrigin + t * rayDir;
      (*hit).normal = getSphereNormal(sphere, hitPoint);
    }
    return;
  }
  if (objectType == OBJ_TYPE_PLANE) {
    let plane = planes[idx];
    let t = intersectPlane(rayOrigin, rayDir, plane);
    if (t > 0.0 && t < (*hit).t) {
      (*hit).t = t;
      (*hit).color = plane.color;
      (*hit).alpha = plane.alpha;
      (*hit).ior = plane.ior;
      (*hit).normal = getPlaneNormal(plane, rayDir);
    }
    return;
  }
}

/**
 * Test shadow intersection with a single object based on type
 * Returns hit distance, or -1.0 if no intersection
 */
fn testShadowIntersection(
  objectIndex: i32,
  objectType: u32,
  shadowOrigin: vec3f,
  lightDir: vec3f
) -> f32 {
  if (objectIndex < 0) { return -1.0; }

  let idx = u32(objectIndex);

  switch (objectType) {
    case OBJ_TYPE_BOX: {
      return checkBoxShadow(idx, shadowOrigin, lightDir);
    }
    case OBJ_TYPE_SPHERE: {
      return intersectSphere(shadowOrigin, lightDir, spheres[idx]);
    }
    case OBJ_TYPE_PLANE: {
      return intersectPlane(shadowOrigin, lightDir, planes[idx]);
    }
    default: {
      return -1.0;
    }
  }
}

/**
 * BVH traversal for primary rays
 * Uses stack-based traversal with distance ordering
 */
fn traceRayBVH(rayOrigin: vec3f, rayDir: vec3f, hit: ptr<function, HitInfo>) {
  if (bvh.useBVH == 0u || bvh.nodeCount == 0u) {
    return;
  }

  let rayDirInv = safeInverse(rayDir);

  var stack: array<u32, BVH_MAX_STACK_SIZE>;
  var stackPtr: u32 = 0u;

  stack[stackPtr] = 0u;
  stackPtr++;

  while (stackPtr > 0u) {
    stackPtr--;
    let nodeIdx = stack[stackPtr];
    let node = bvhNodes[nodeIdx];

    let aabbT = intersectAABB(rayOrigin, rayDirInv, node.aabbMin, node.aabbMax);
    if (aabbT < 0.0 || aabbT >= (*hit).t) {
      continue;
    }

    // Leaf node
    if (node.leftChild < 0) {
      testObjectIntersection(node.objectIndex, node.objectType, rayOrigin, rayDir, hit);
      continue;
    }

    // Internal node: push children with distance ordering (closer node last = processed first)
    let leftNode = bvhNodes[u32(node.leftChild)];
    let rightNode = bvhNodes[u32(node.rightChild)];
    let leftT = intersectAABB(rayOrigin, rayDirInv, leftNode.aabbMin, leftNode.aabbMax);
    let rightT = intersectAABB(rayOrigin, rayDirInv, rightNode.aabbMin, rightNode.aabbMax);

    if (stackPtr < BVH_MAX_STACK_SIZE - 1u) {
      if (leftT >= 0.0 && rightT >= 0.0) {
        // Both children hit - push farther first, closer last
        if (leftT < rightT) {
          stack[stackPtr] = u32(node.rightChild);
          stackPtr++;
          stack[stackPtr] = u32(node.leftChild);
          stackPtr++;
        } else {
          stack[stackPtr] = u32(node.leftChild);
          stackPtr++;
          stack[stackPtr] = u32(node.rightChild);
          stackPtr++;
        }
      } else if (leftT >= 0.0) {
        stack[stackPtr] = u32(node.leftChild);
        stackPtr++;
      } else if (rightT >= 0.0) {
        stack[stackPtr] = u32(node.rightChild);
        stackPtr++;
      }
    }
  }
}

/**
 * BVH traversal for shadow rays
 * Returns hit distance on first hit (any-hit optimization)
 */
fn traceShadowBVH(shadowOrigin: vec3f, lightDir: vec3f) -> f32 {
  if (bvh.useBVH == 0u || bvh.nodeCount == 0u) {
    return -1.0;
  }

  let rayDirInv = safeInverse(lightDir);

  var stack: array<u32, BVH_MAX_STACK_SIZE>;
  var stackPtr: u32 = 0u;

  stack[stackPtr] = 0u;
  stackPtr++;

  while (stackPtr > 0u) {
    stackPtr--;
    let nodeIdx = stack[stackPtr];
    let node = bvhNodes[nodeIdx];

    let aabbT = intersectAABB(shadowOrigin, rayDirInv, node.aabbMin, node.aabbMax);
    if (aabbT < 0.0) {
      continue;
    }

    // Leaf node
    if (node.leftChild < 0) {
      let t = testShadowIntersection(node.objectIndex, node.objectType, shadowOrigin, lightDir);
      if (t > 0.0) {
        return t; // Early out on first hit
      }
      continue;
    }

    // Push both children (no ordering needed for shadow - any hit is sufficient)
    if (stackPtr < BVH_MAX_STACK_SIZE - 1u) {
      stack[stackPtr] = u32(node.leftChild);
      stackPtr++;
      stack[stackPtr] = u32(node.rightChild);
      stackPtr++;
    }
  }

  return -1.0;
}
