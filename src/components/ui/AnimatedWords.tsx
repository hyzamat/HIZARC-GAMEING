import { motion } from 'framer-motion'
import { Fragment } from 'react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from './Reveal'

type AnimatedWordsProps = {
  /** Text to animate. Use "\n" to force a line break. Wrap a word in *asterisks* to give it the brand gradient. */
  text: string
  className?: string
  wordClassName?: string
  /** Class applied to *highlighted* words (default: brand gradient). */
  highlightClassName?: string
  delay?: number
  stagger?: number
  /** Animate when scrolled into view (default) or immediately when `play` becomes true. */
  trigger?: 'inView' | 'manual'
  play?: boolean
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
}

/**
 * Word-by-word "rise from behind a mask" text reveal.
 * Screen readers get the plain sentence via aria-label.
 */
export function AnimatedWords({
  text,
  className,
  wordClassName,
  highlightClassName = 'text-gradient',
  delay = 0,
  stagger = 0.06,
  trigger = 'inView',
  play = true,
  as = 'h2',
}: AnimatedWordsProps) {
  const Tag = motion[as] as typeof motion.h2
  const lines = text.split('\n')
  const plain = text.replace(/\*/g, '').replace(/\n/g, ' ')
  let index = 0

  const animateProps =
    trigger === 'inView'
      ? { initial: 'hidden' as const, whileInView: 'show' as const, viewport: { once: true, amount: 0.4 } }
      : { initial: 'hidden' as const, animate: play ? ('show' as const) : ('hidden' as const) }

  return (
    <Tag className={className} aria-label={plain} {...animateProps}>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {line
            .split(' ')
            .filter(Boolean)
            .map((raw, wi) => {
              const hl = /^\*.*\*[.,!?]?$/.test(raw)
              const word = raw.replace(/\*/g, '')
              const i = index++
              // The space must sit OUTSIDE the inline-block mask: it gives the line a
              // wrap opportunity between words and isn't collapsed by the mask.
              return (
                <Fragment key={`${li}-${wi}`}>
                  <span aria-hidden className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
                    <motion.span
                      className={cn('inline-block will-change-transform', wordClassName, hl && highlightClassName)}
                      variants={{
                        hidden: { y: '110%', rotate: 4 },
                        show: { y: '0%', rotate: 0, transition: { duration: 0.9, ease: EASE_OUT, delay: delay + i * stagger } },
                      }}
                    >
                      {word}
                    </motion.span>
                  </span>{' '}
                </Fragment>
              )
            })}
          {li < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </Tag>
  )
}
