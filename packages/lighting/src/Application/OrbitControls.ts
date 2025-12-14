/**
 * OrbitControls - Camera orbit controls for interactive 3D viewing
 *
 * Features:
 * - Left mouse drag: Rotate around target
 * - Mouse wheel: Zoom in/out
 * - Optional damping for smooth movement
 */

import { $Vector3, type Vector3 } from '@practice/vector'
import type { OrthographicCamera, PerspectiveCamera } from '../Domain/ValueObject'
import { $Camera } from '../Domain/ValueObject'

export interface OrbitControlsOptions {
  /** Target point to orbit around */
  target?: Vector3
  /** Minimum distance from target */
  minDistance?: number
  /** Maximum distance from target */
  maxDistance?: number
  /** Minimum polar angle (0 = top, PI = bottom) */
  minPolarAngle?: number
  /** Maximum polar angle */
  maxPolarAngle?: number
  /** Rotation speed multiplier */
  rotateSpeed?: number
  /** Zoom speed multiplier */
  zoomSpeed?: number
  /** Enable damping (inertia) */
  enableDamping?: boolean
  /** Damping factor (0-1, lower = more damping) */
  dampingFactor?: number
}

interface SphericalCoords {
  radius: number
  theta: number  // Azimuthal angle (horizontal)
  phi: number    // Polar angle (vertical, 0 = top)
}

export class OrbitControls {
  private canvas: HTMLCanvasElement
  private target: Vector3
  private spherical: SphericalCoords
  private up: Vector3

  private minDistance: number
  private maxDistance: number
  private minPolarAngle: number
  private maxPolarAngle: number
  private rotateSpeed: number
  private zoomSpeed: number
  private enableDamping: boolean
  private dampingFactor: number

  // Damping state
  private sphericalDelta: SphericalCoords = { radius: 0, theta: 0, phi: 0 }

  // Interaction state
  private isDragging = false
  private lastMouseX = 0
  private lastMouseY = 0

  // Bound event handlers (for cleanup)
  private onMouseDownBound: (e: MouseEvent) => void
  private onMouseMoveBound: (e: MouseEvent) => void
  private onMouseUpBound: (e: MouseEvent) => void
  private onWheelBound: (e: WheelEvent) => void
  private onContextMenuBound: (e: Event) => void

  constructor(canvas: HTMLCanvasElement, initialPosition: Vector3, options: OrbitControlsOptions = {}) {
    this.canvas = canvas
    this.target = options.target ?? $Vector3.create(0, 0, 0)
    this.up = $Vector3.create(0, 1, 0)

    // Convert initial position to spherical coordinates
    this.spherical = this.positionToSpherical(initialPosition)

    // Options
    this.minDistance = options.minDistance ?? 0.1
    this.maxDistance = options.maxDistance ?? 100
    this.minPolarAngle = options.minPolarAngle ?? 0.01
    this.maxPolarAngle = options.maxPolarAngle ?? Math.PI - 0.01
    this.rotateSpeed = options.rotateSpeed ?? 1.0
    this.zoomSpeed = options.zoomSpeed ?? 1.0
    this.enableDamping = options.enableDamping ?? true
    this.dampingFactor = options.dampingFactor ?? 0.05

    // Bind event handlers
    this.onMouseDownBound = this.onMouseDown.bind(this)
    this.onMouseMoveBound = this.onMouseMove.bind(this)
    this.onMouseUpBound = this.onMouseUp.bind(this)
    this.onWheelBound = this.onWheel.bind(this)
    this.onContextMenuBound = (e: Event) => e.preventDefault()

    // Attach event listeners
    this.canvas.addEventListener('mousedown', this.onMouseDownBound)
    this.canvas.addEventListener('wheel', this.onWheelBound, { passive: false })
    this.canvas.addEventListener('contextmenu', this.onContextMenuBound)
    window.addEventListener('mousemove', this.onMouseMoveBound)
    window.addEventListener('mouseup', this.onMouseUpBound)
  }

  private positionToSpherical(position: Vector3): SphericalCoords {
    const offset = $Vector3.sub(position, this.target)
    const radius = $Vector3.length(offset)

    if (radius === 0) {
      return { radius: 1, theta: 0, phi: Math.PI / 2 }
    }

    const theta = Math.atan2(offset.x, offset.z)
    const phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)))

    return { radius, theta, phi }
  }

  private sphericalToPosition(): Vector3 {
    const { radius, theta, phi } = this.spherical
    const sinPhi = Math.sin(phi)

    return $Vector3.create(
      this.target.x + radius * sinPhi * Math.sin(theta),
      this.target.y + radius * Math.cos(phi),
      this.target.z + radius * sinPhi * Math.cos(theta)
    )
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) { // Left button
      this.isDragging = true
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return

    const deltaX = e.clientX - this.lastMouseX
    const deltaY = e.clientY - this.lastMouseY

    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY

    // Rotate
    const rotateScale = 2 * Math.PI * this.rotateSpeed / this.canvas.clientHeight

    if (this.enableDamping) {
      this.sphericalDelta.theta -= deltaX * rotateScale
      this.sphericalDelta.phi -= deltaY * rotateScale
    } else {
      this.spherical.theta -= deltaX * rotateScale
      this.spherical.phi -= deltaY * rotateScale
      this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi))
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isDragging = false
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault()

    const zoomScale = Math.pow(0.95, this.zoomSpeed)

    if (e.deltaY > 0) {
      // Zoom out
      if (this.enableDamping) {
        this.sphericalDelta.radius += this.spherical.radius * (1 / zoomScale - 1)
      } else {
        this.spherical.radius /= zoomScale
      }
    } else if (e.deltaY < 0) {
      // Zoom in
      if (this.enableDamping) {
        this.sphericalDelta.radius += this.spherical.radius * (zoomScale - 1)
      } else {
        this.spherical.radius *= zoomScale
      }
    }

    if (!this.enableDamping) {
      this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius))
    }
  }

  /**
   * Update the controls. Call this every frame.
   * Returns true if the camera position changed.
   */
  update(): boolean {
    if (!this.enableDamping) {
      return false
    }

    const eps = 0.0001
    const hasChange =
      Math.abs(this.sphericalDelta.theta) > eps ||
      Math.abs(this.sphericalDelta.phi) > eps ||
      Math.abs(this.sphericalDelta.radius) > eps

    if (!hasChange) {
      return false
    }

    // Apply damped deltas
    this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor
    this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor
    this.spherical.radius += this.sphericalDelta.radius * this.dampingFactor

    // Clamp values
    this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi))
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius))

    // Decay deltas
    this.sphericalDelta.theta *= (1 - this.dampingFactor)
    this.sphericalDelta.phi *= (1 - this.dampingFactor)
    this.sphericalDelta.radius *= (1 - this.dampingFactor)

    return true
  }

  /**
   * Get current camera position
   */
  getPosition(): Vector3 {
    return this.sphericalToPosition()
  }

  /**
   * Get target position
   */
  getTarget(): Vector3 {
    return this.target
  }

  /**
   * Set target position
   */
  setTarget(target: Vector3): void {
    this.target = target
  }

  /**
   * Create an OrthographicCamera with current position
   */
  createOrthographicCamera(width: number, height: number): OrthographicCamera {
    return $Camera.createOrthographic(
      this.getPosition(),
      this.target,
      this.up,
      width,
      height
    )
  }

  /**
   * Create a PerspectiveCamera with current position
   */
  createPerspectiveCamera(fov: number, aspectRatio: number): PerspectiveCamera {
    return $Camera.createPerspective(
      this.getPosition(),
      this.target,
      this.up,
      fov,
      aspectRatio
    )
  }

  /**
   * Dispose of event listeners
   */
  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDownBound)
    this.canvas.removeEventListener('wheel', this.onWheelBound)
    this.canvas.removeEventListener('contextmenu', this.onContextMenuBound)
    window.removeEventListener('mousemove', this.onMouseMoveBound)
    window.removeEventListener('mouseup', this.onMouseUpBound)
  }
}
