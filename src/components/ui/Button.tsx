import { motion, useMotionValue, useSpring } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { useRef } from 'react'
import { useFinePointer } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'ghost' | 'light'
type Size = 'md' | 'lg'

type ButtonProps = {
  children: ReactNode
  href?: string
  onClick?: (e: MouseEvent<HTMLElement>) => void
  variant?: Variant
  size?: Size
  /** Icon after the label; pass `null` to hide. Defaults to an ↗ arrow. */
  icon?: ReactNode | null
  /** Subtle "magnetic" pull toward the cursor on desktop (default true). */
  magnetic?: boolean
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  target?: string
  rel?: string
  'aria-label'?: string
}

/*
 * The chamfered shape lives on an inner aria-hidden "surface" layer, NOT on the
 * focusable element — a clip-path on the <a>/<button> itself would clip the
 * global :focus-visible outline and make keyboard focus invisible.
 */
const base =
  'group relative isolate inline-flex select-none items-center justify-center gap-2.5 font-display font-semibold uppercase tracking-[0.08em] whitespace-nowrap transition-[color,filter,opacity] duration-300 disabled:pointer-events-none disabled:opacity-50'

const sizes: Record<Size, string> = {
  md: 'h-12 px-6 text-[0.72rem]',
  lg: 'h-14 px-8 text-[0.78rem] sm:h-[3.75rem] sm:px-9 sm:text-[0.82rem]',
}

// Text colour + glow (drop-shadow follows the chamfered surface's alpha).
const variants: Record<Variant, string> = {
  primary: 'text-white drop-shadow-[0_10px_22px_rgba(10,124,255,0.45)] hover:drop-shadow-[0_12px_28px_rgba(46,230,255,0.45)]',
  ghost: 'text-snow',
  light: 'text-ink-950',
}

// Chamfered background layer. brand-600 keeps white label text ≥ 5.5:1.
const surfaces: Record<Variant, string> = {
  primary: 'bg-brand-600',
  ghost:
    'bg-ink-900/65 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)] transition-[background-color,box-shadow] duration-300 group-hover:bg-ink-700/80 group-hover:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.32)]',
  light: 'bg-snow transition-colors duration-300 group-hover:bg-white',
}

/**
 * Primary call-to-action. Renders an <a> when `href` is given, otherwise a <button>.
 * Chamfered corners echo the logo; primary has a sweeping light sheen on hover.
 */
export function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  magnetic = true,
  className,
  type = 'button',
  disabled,
  target,
  rel,
  ...aria
}: ButtonProps) {
  const fine = useFinePointer()
  const ref = useRef<HTMLElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 220, damping: 18, mass: 0.4 })
  const y = useSpring(my, { stiffness: 220, damping: 18, mass: 0.4 })
  const pull = magnetic && fine

  const onMove = (e: MouseEvent<HTMLElement>) => {
    if (!pull || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.22)
    my.set((e.clientY - (r.top + r.height / 2)) * 0.32)
  }
  const onLeave = () => {
    mx.set(0)
    my.set(0)
  }

  const iconNode = icon === null ? null : (icon ?? <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} />)

  const inner = (
    <>
      <span aria-hidden className={cn('absolute inset-0 -z-10 overflow-hidden chamfer-sm', surfaces[variant])}>
        {variant === 'primary' && (
          <>
            {/* hover: blue → indigo → ultraviolet (all keep white text ≥ 5:1) */}
            <span className="absolute inset-0 bg-gradient-to-r from-brand-600 via-[#2f5bea] to-[#6a4ff0] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-[28deg] bg-white/30 opacity-0 blur-[2px] transition-all duration-700 ease-out group-hover:left-[120%] group-hover:opacity-100" />
          </>
        )}
      </span>
      <span className="relative inline-flex items-center gap-2.5">
        {children}
        {iconNode}
      </span>
    </>
  )

  const shared = {
    ref: ref as never,
    className: cn(base, sizes[size], variants[variant], className),
    style: pull ? { x, y } : undefined,
    onMouseMove: onMove,
    onMouseLeave: onLeave,
    whileTap: { scale: 0.97 },
    onClick,
    ...aria,
  }

  if (href) {
    const external = /^https?:\/\//.test(href)
    return (
      <motion.a href={href} target={target ?? (external ? '_blank' : undefined)} rel={rel ?? (external ? 'noopener noreferrer' : undefined)} {...shared}>
        {inner}
      </motion.a>
    )
  }
  return (
    <motion.button type={type} disabled={disabled} {...shared}>
      {inner}
    </motion.button>
  )
}
