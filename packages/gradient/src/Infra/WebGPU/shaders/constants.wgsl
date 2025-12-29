// Maximum supported color points
const MAX_COLOR_POINTS: u32 = 32u;

// Math constants
const PI: f32 = 3.14159265359;

// ============================================
// Color space conversion matrices (D65 white point)
// ============================================

// Display P3 (linear) to XYZ D65
const DISPLAY_P3_TO_XYZ: mat3x3f = mat3x3f(
  vec3f(0.4865709486, 0.2656676932, 0.1982172852),
  vec3f(0.2289745641, 0.6917385218, 0.0792869141),
  vec3f(0.0000000000, 0.0451133819, 1.0439443689)
);

// XYZ D65 to Display P3 (linear)
const XYZ_TO_DISPLAY_P3: mat3x3f = mat3x3f(
  vec3f(2.4934969119, -0.9313836179, -0.4027107845),
  vec3f(-0.8294889696, 1.7626640603, 0.0236246858),
  vec3f(0.0358458302, -0.0761723893, 0.9568845240)
);

// XYZ D65 to LMS (for OKLab)
const XYZ_TO_LMS: mat3x3f = mat3x3f(
  vec3f(0.8189330101, 0.3618667424, -0.1288597137),
  vec3f(0.0329845436, 0.9293118715, 0.0361456387),
  vec3f(0.0482003018, 0.2643662691, 0.6338517070)
);

// LMS to XYZ D65
const LMS_TO_XYZ: mat3x3f = mat3x3f(
  vec3f(1.2270138511, -0.5577999807, 0.2812561490),
  vec3f(-0.0405801784, 1.1122568696, -0.0716766787),
  vec3f(-0.0763812845, -0.4214819784, 1.5861632204)
);
