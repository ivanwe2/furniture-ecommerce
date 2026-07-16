'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { startHinge } from './hinge-scene'

/**
 * Muted WebGL hinge that fades in behind the hero copy (redesign R3). `three` is
 * dynamically imported on mount so it never lands in the initial bundle. Until
 * (and unless) the scene starts, a static hatch fallback shows — which is also
 * the permanent state for reduced-motion users and no-WebGL contexts. The
 * parallax sway tracks the pointer over the nearest `[data-hero-stage]` ancestor.
 */
export function HingeBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let cleanup: (() => void) | undefined
    let cancelled = false

    void (async () => {
      try {
        const [THREE, roomMod, rbMod] = await Promise.all([
          import('three'),
          import('three/examples/jsm/environments/RoomEnvironment.js'),
          import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
        ])
        if (cancelled) return
        const stage = canvas.closest<HTMLElement>('[data-hero-stage]')
        cleanup = startHinge(
          canvas,
          { THREE, RoomEnvironment: roomMod.RoomEnvironment, RoundedBoxGeometry: rbMod.RoundedBoxGeometry },
          stage,
        )
        setActive(true)
      } catch {
        // No WebGL / import failure → the static hatch fallback stays.
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return (
    <div className={clsx('hinge-stage', active && 'hinge-active')} aria-hidden="true">
      <canvas ref={canvasRef} className="hinge-canvas" />
      <div className="hinge-fallback" />
    </div>
  )
}
