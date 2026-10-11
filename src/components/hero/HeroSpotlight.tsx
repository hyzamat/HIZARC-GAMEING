import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useFinePointer } from '@/hooks/useMediaQuery'

/** Lens radius in px. */
const R = 260

type HeroSpotlightProps = {
  /** Hero is on screen — pointer tracking only runs while true. */
  active: boolean
}

/**
 * "Flashlight" over the blueprint: a lens that follows the cursor and reveals a
 * brighter cyan grid with glowing nodes underneath it. Desktop only (fine
 * pointer, no reduced motion).
 *
 * Compositor-only: the lens (masked, soft-edged) and the big grid inside it are
 * moved by opposite transforms from the same spring, so the grid stays pinned to
 * the page while the window slides over it. Nothing repaints while it moves.
 */
export function HeroSpotlight({ active }: HeroSpotlightProps) {
  const fine = useFinePointer()
  const reduce = useReducedMotion() === true
  if (!fine || reduce) return null
  return <Lens active={active} />
}

function Lens({ active }: HeroSpotlightProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(-1000)
  const y = useMotionValue(-1000)
  const sx = useSpring(x, { stiffness: 210, damping: 30, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 210, damping: 30, mass: 0.6 })
  const opacity = useMotionValue(0)

  // Lens box follows the cursor; the grid inside is offset the other way.
  const lensX = useTransform(sx, (v) => v - R)
  const lensY = useTransform(sy, (v) => v - R)
  const gridX = useTransform(sx, (v) => R - v)
  const gridY = useTransform(sy, (v) => R - v)

  useEffect(() => {
    const root = rootRef.current
    if (!root || !active) return

    let raf = 0
    let cx = 0
    let cy = 0
    let hasPointer = false
    let shown = false

    const show = (next: boolean) => {
      if (next === shown) return
      shown = next
      animate(opacity, next ? 1 : 0, { duration: next ? 0.5 : 0.35, ease: 'easeOut' })
    }

    const update = () => {
      raf = 0
      const r = root.getBoundingClientRect()
      const px = cx - r.left
      const py = cy - r.top
      const inside = hasPointer && px >= 0 && py >= 0 && px <= r.width && py <= r.height
      if (inside) {
        if (!shown) {
          // appear under the cursor instead of flying in from a corner
          sx.jump(px)
          sy.jump(py)
        }
        x.set(px)
        y.set(py)
      }
      show(inside)
    }
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      cx = e.clientX
      cy = e.clientY
      hasPointer = true
      queue()
    }
    const onLeave = () => {
      hasPointer = false
      queue()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', queue, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', queue)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      shown = false
      opacity.jump(0)
    }
  }, [active, opacity, sx, sy, x, y])

  return (
    <motion.div ref={rootRef} aria-hidden style={{ opacity }} className="pointer-events-none absolute inset-0 z-[-9] overflow-hidden">
      <motion.div
        style={{ x: lensX, y: lensY }}
        className="absolute top-0 left-0 size-[520px] will-change-transform [mask-image:radial-gradient(closest-side,#000_16%,rgba(0,0,0,0.55)_50%,transparent)]"
      >
        <motion.div
          style={{ x: gridX, y: gridY }}
          className="absolute top-0 left-0 h-[max(100svh,900px)] w-screen bg-[radial-gradient(circle,rgba(255,255,255,0.95)_1.4px,rgba(46,230,255,0.5)_2.4px,transparent_3.6px),linear-gradient(to_right,rgba(46,230,255,0.3)_1px,transparent_1px),linear-gradient(to_bottom,rgba(46,230,255,0.3)_1px,transparent_1px)] bg-[position:28px_28px,0_0,0_0] bg-[size:56px_56px]"
        />
      </motion.div>
    </motion.div>
  )
}
