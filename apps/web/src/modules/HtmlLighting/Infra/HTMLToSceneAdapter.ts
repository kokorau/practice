import type {
  Viewport,
  ParsedElement,
  HTMLToSceneResult,
  HTMLToScenePort,
} from '../Application'
import type { OrthographicCamera, Color } from '../../Lighting/Domain/ValueObject'
import { $Camera, $Color } from '../../Lighting/Domain/ValueObject'
import { $Vector3 } from '@practice/vector'
import { $Scene, $SceneObject } from '../../Lighting/Infra/WebGL'
import { $Geometry } from '../../Lighting/Domain/ValueObject'

/**
 * Depth unit: how much Z distance per nesting level
 * Larger values = more pronounced depth/shadow effects
 */
const DEPTH_UNIT = 2

/**
 * Parse CSS color string to Color
 * Supports: rgb(r, g, b), rgba(r, g, b, a), transparent
 */
const WHITE = $Color.create(1, 1, 1)

const parseCssColor = (cssColor: string): Color | null => {
  if (cssColor === 'transparent' || cssColor === 'rgba(0, 0, 0, 0)') {
    return null
  }

  // Gradient backgrounds are not supported - return null to skip
  // (background-image with gradient will be handled separately)
  if (cssColor.includes('gradient')) {
    return null
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) {
    return $Color.fromRgb255(
      parseInt(rgbMatch[1]!, 10),
      parseInt(rgbMatch[2]!, 10),
      parseInt(rgbMatch[3]!, 10)
    )
  }

  // oklch(l c h) - Tailwind v4 format
  // Also handle oklch(l c h / alpha) format
  const oklchMatch = cssColor.match(/oklch\(([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/)
  if (oklchMatch) {
    // Parse lightness (can be 0-1 or 0-100%)
    let l = parseFloat(oklchMatch[1]!)
    if (oklchMatch[1]!.includes('%')) {
      l = l / 100
    }
    const c = parseFloat(oklchMatch[2]!)
    const h = parseFloat(oklchMatch[3]!)

    // Convert oklch to sRGB (approximate)
    // For low chroma colors, lightness approximation is reasonable
    // For colored values, we need proper conversion
    if (c < 0.02) {
      // Near-grayscale
      return $Color.create(l, l, l)
    }

    // Approximate oklch to RGB conversion
    // Convert hue to radians
    const hRad = (h * Math.PI) / 180

    // Approximate a and b in oklab space
    const a = c * Math.cos(hRad)
    const b = c * Math.sin(hRad)

    // Simplified oklab to linear sRGB (approximate)
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b
    const s_ = l - 0.0894841775 * a - 1.2914855480 * b

    const l3 = l_ * l_ * l_
    const m3 = m_ * m_ * m_
    const s3 = s_ * s_ * s_

    // Linear RGB
    let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
    let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
    let bVal = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3

    // Clamp to [0, 1]
    r = Math.max(0, Math.min(1, r))
    g = Math.max(0, Math.min(1, g))
    bVal = Math.max(0, Math.min(1, bVal))

    // Convert Linear RGB to sRGB (apply gamma)
    const gamma = 1 / 2.2
    return $Color.create(
      Math.pow(r, gamma),
      Math.pow(g, gamma),
      Math.pow(bVal, gamma)
    )
  }

  // Unknown format - return white as fallback
  return WHITE
}

/**
 * Get nesting depth of an element relative to root
 */
const getDepth = (element: HTMLElement, root: HTMLElement): number => {
  let depth = 0
  let current: HTMLElement | null = element
  while (current && current !== root) {
    depth++
    current = current.parentElement
  }
  return depth
}

/**
 * Convert pixel coordinates to world coordinates
 * - Origin at viewport top-left
 * - Y axis inverted (HTML down = negative Y in 3D)
 * - Z decreases with depth (nested elements are closer to camera)
 *   Camera is at z=-10 looking toward +Z, so smaller Z = closer to camera
 */
const pxToWorld = (
  x: number,
  y: number,
  depth: number,
  maxDepth: number,
  viewport: Viewport
): { x: number; y: number; z: number } => {
  // Center the coordinate system on viewport center
  const worldX = x - viewport.width / 2
  const worldY = -(y - viewport.height / 2) // Invert Y
  // Invert depth: deeper nesting = smaller Z = closer to camera
  const worldZ = (maxDepth - depth) * DEPTH_UNIT

  return { x: worldX, y: worldY, z: worldZ }
}

export const HTMLToSceneAdapter: HTMLToScenePort = {
  parseElements(root: HTMLElement, viewport: Viewport): ParsedElement[] {
    const elements: ParsedElement[] = []

    const traverse = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      let backgroundColor = parseCssColor(style.backgroundColor)

      // Check for gradient background-image and fallback to white
      const backgroundImage = style.backgroundImage
      if (!backgroundColor && backgroundImage && backgroundImage.includes('gradient')) {
        backgroundColor = WHITE
      }

      // Only include elements with visible background
      if (backgroundColor) {
        const depth = getDepth(element, root)

        // Parse border-radius (take the first value if multiple)
        // CSS border-radius can be "8px", "8px 4px", etc.
        const borderRadiusStr = style.borderRadius
        let borderRadius: number | undefined
        if (borderRadiusStr) {
          const match = borderRadiusStr.match(/^([\d.]+)px/)
          if (match) {
            borderRadius = parseFloat(match[1]!)
          }
        }

        elements.push({
          x: rect.left - viewport.scrollX,
          y: rect.top - viewport.scrollY,
          width: rect.width,
          height: rect.height,
          backgroundColor,
          depth,
          ...(borderRadius && borderRadius > 0 && { borderRadius }),
        })
      }

      // Traverse children
      for (const child of element.children) {
        if (child instanceof HTMLElement) {
          traverse(child)
        }
      }
    }

    traverse(root)
    return elements
  },

  toScene(elements: ParsedElement[], viewport: Viewport): HTMLToSceneResult {
    // Create camera looking at the scene from front (negative Z looking toward positive Z)
    const camera: OrthographicCamera = $Camera.createOrthographic(
      $Vector3.create(0, 0, -10), // Position in front of the scene
      $Vector3.create(0, 0, 10),  // Look toward positive Z (into the scene)
      $Vector3.create(0, 1, 0),   // Up vector
      viewport.width,
      viewport.height
    )

    // Create scene with background plane at the back
    const maxDepth = elements.reduce((max, el) => Math.max(max, el.depth), 0)
    // Background plane is behind all elements (at highest Z value)
    const backgroundZ = (maxDepth + 2) * DEPTH_UNIT
    const backgroundPlane = $SceneObject.createPlane(
      $Geometry.createPlane(
        $Vector3.create(0, 0, backgroundZ),
        $Vector3.create(0, 0, -1)  // Facing camera
      ),
      WHITE
    )
    let scene = $Scene.add($Scene.create(), backgroundPlane)

    // Convert elements to scene objects (boxes)
    for (const el of elements) {
      // Calculate center position in world coordinates
      const centerX = el.x + el.width / 2
      const centerY = el.y + el.height / 2
      const worldPos = pxToWorld(centerX, centerY, el.depth, maxDepth, viewport)

      const box = $SceneObject.createBox(
        $Geometry.createBox(
          $Vector3.create(worldPos.x, worldPos.y, worldPos.z),
          $Vector3.create(el.width, el.height, DEPTH_UNIT * 0.5), // Thin boxes
          undefined, // rotation
          el.borderRadius // corner radius
        ),
        el.backgroundColor
      )

      scene = $Scene.add(scene, box)
    }

    return { scene, camera }
  },
}
