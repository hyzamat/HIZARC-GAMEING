import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { EASE_OUT } from '@/components/ui/Reveal'
import { useFinePointer } from '@/hooks/useMediaQuery'

/** Elements that make the cursor ring "lock on". */
const INTERACTIVE = 'a,button,[role=button],input,textarea,select,label,summary,[data-cursor=hover]'

/** Click shockwaves alive at once — a frantic clicker never piles up layers. */
const MAX_PINGS = 4

type Ping = { id: number; x: number; y: number }

/**
 * Desktop-only cursor ambience: a large, lazily trailing radial glow (screen
 * blended so it only ever brightens) plus a small ring that follows tightly
 * and locks on to interactive elements, and a brief shockwave on every click.
 * The native cursor is never hidden. Renders nothing on touch devices or for
 * reduced-motion users.
 */
export function CursorGlow() {
  const fine = useFinePointer()
  const reduce = useReducedMotion()
  if (!fine || reduce) return null
  return <CursorLayers />
}

function CursorLayers() {
  const x = useMotionValue(-1000)
  const y = useMotionValue(-1000)
  // Glow: heavy, cinematic lag. Ring: snappy, almost glued to the pointer.
  const glowX = useSpring(x, { stiffness: 70, damping: 20, mass: 0.9 })
  const glowY = useSpring(y, { stiffness: 70, damping: 20, mass: 0.9 })
  const ringX = useSpring(x, { stiffness: 900, damping: 55, mass: 0.22 })
  const ringY = useSpring(y, { stiffness: 900, damping: 55, mass: 0.22 })

  const [visible, setVisible] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [pings, setPings] = useState<Ping[]>([])
  const visibleRef = useRef(false)
  const pingId = useRef(0)

  useEffect(() => {
    const show = (cx: number, cy: number) => {
      if (visibleRef.current) return
      visibleRef.current = true
      // Snap the springs to the pointer so nothing flies in from a corner.
      glowX.jump(cx)
      glowY.jump(cy)
      ringX.jump(cx)
      ringY.jump(cy)
      setVisible(true)
    }
    const hide = () => {
      if (!visibleRef.current) return
      visibleRef.current = false
      setVisible(false)
      setPressed(false)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      x.set(e.clientX)
      y.set(e.clientY)
      show(e.clientX, e.clientY)
    }
    const onOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const target = e.target instanceof Element ? e.target : null
      setHovering(Boolean(target?.closest(INTERACTIVE)))
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      setPressed(true)
      const id = ++pingId.current
      setPings((list) => [...list.slice(1 - MAX_PINGS), { id, x: e.clientX, y: e.clientY }])
    }
    const onUp = () => setPressed(false)
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) hide()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('mouseout', onOut)
    window.addEventListener('blur', hide)
    document.documentElement.addEventListener('mouseleave', hide)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('mouseout', onOut)
      window.removeEventListener('blur', hide)
      document.documentElement.removeEventListener('mouseleave', hide)
    }
  }, [x, y, glowX, glowY, ringX, ringY])

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[80] -mt-[260px] -ml-[260px] size-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(10,124,255,0.16)_0%,rgba(46,230,255,0.07)_30%,rgba(124,92,255,0.03)_48%,transparent_68%)] mix-blend-screen"
        style={{ x: glowX, y: glowY }}
        initial={false}
        animate={{ opacity: visible ? (hovering ? 1 : 0.8) : 0, scale: hovering ? 0.82 : 1 }}
        transition={{ opacity: { duration: 0.5 }, scale: { type: 'spring', stiffness: 180, damping: 22 } }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[80] -mt-3.5 -ml-3.5 size-7 rounded-full border"
        style={{ x: ringX, y: ringY }}
        initial={false}
        animate={{
          opacity: visible ? 1 : 0,
          scale: pressed ? 0.7 : hovering ? 1.75 : 1,
          borderColor: hovering ? 'rgba(46,230,255,0.85)' : 'rgba(244,247,255,0.42)',
          backgroundColor: hovering ? 'rgba(46,230,255,0.08)' : 'rgba(46,230,255,0)',
        }}
        transition={{
          opacity: { duration: 0.25 },
          scale: { type: 'spring', stiffness: 420, damping: 26, mass: 0.6 },
          borderColor: { duration: 0.25 },
          backgroundColor: { duration: 0.25 },
        }}
      />

      {/* Click shockwaves: a ring that expands from the press point and fades */}
      {pings.map((p) => (
        <motion.span
          key={p.id}
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 z-[80] -mt-6 -ml-6 size-12 rounded-full border border-cyan/70 shadow-[0_0_18px_rgba(46,230,255,0.35)]"
          style={{ x: p.x, y: p.y }}
          initial={{ scale: 0.2, opacity: 0.95 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          onAnimationComplete={() => setPings((list) => list.filter((q) => q.id !== p.id))}
        />
      ))}
    </>
  )
}
