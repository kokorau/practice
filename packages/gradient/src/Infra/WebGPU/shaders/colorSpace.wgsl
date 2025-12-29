// ============================================
// Color space conversion functions
// ============================================

// Display P3 (linear) to OKLab
fn p3ToOklab(p3: vec3f) -> vec3f {
  // P3 -> XYZ D65
  let xyz = DISPLAY_P3_TO_XYZ * p3;

  // XYZ -> LMS
  let lms = XYZ_TO_LMS * xyz;

  // LMS -> LMS' (cube root)
  let lms_ = sign(lms) * pow(abs(lms), vec3f(1.0 / 3.0));

  // LMS' -> OKLab
  return vec3f(
    0.2104542553 * lms_.x + 0.7936177850 * lms_.y - 0.0040720468 * lms_.z,
    1.9779984951 * lms_.x - 2.4285922050 * lms_.y + 0.4505937099 * lms_.z,
    0.0259040371 * lms_.x + 0.7827717662 * lms_.y - 0.8086757660 * lms_.z
  );
}

// OKLab to Display P3 (linear)
fn oklabToP3(lab: vec3f) -> vec3f {
  // OKLab -> LMS'
  let lms_ = vec3f(
    lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z,
    lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z,
    lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z
  );

  // LMS' -> LMS (cube)
  let lms = lms_ * lms_ * lms_;

  // LMS -> XYZ D65
  let xyz = LMS_TO_XYZ * lms;

  // XYZ -> P3
  return XYZ_TO_DISPLAY_P3 * xyz;
}

// Clamp to P3 gamut (simple clip)
fn clampP3(p3: vec3f) -> vec3f {
  return clamp(p3, vec3f(0.0), vec3f(1.0));
}
