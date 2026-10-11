import { useEffect } from 'react'
import { isSfxName, playSfx, useSfxEnabled, type SfxName } from '@/lib/sfx'

/** Everything that should tick on hover / blip on click. */
const INTERACTIVE = [
  'a[href]',
  'button',
  'summary',
  '[role=button]',
  '[role=tab]',
  '[role=switch]',
  '[role=checkbox]',
  '[role=radio]',
  '[role=menuitem]',
  '[role=option]',
  'input[type=checkbox]',
  'input[type=radio]',
  'input[type=submit]',
  'input[type=button]',
  '[data-sfx]',
].join(',')

/** Hover ticks are ignored this long after a scroll (elements sliding under a still cursor). */
const SCROLL_QUIET = 140

function interactiveFrom(target: EventTarget | null) {
  return target instanceof Element ? target.closest(INTERACTIVE) : null
}

function isDisabled(el: Element) {
  return el.matches(':disabled, [aria-disabled="true"]')
}

/**
 * Resolve the nearest `data-sfx` instruction for an element:
 * 'off' (on it or any ancestor) silences it; a sound name overrides the click sound.
 */
function sfxFor(el: Element): 'off' | SfxName | null {
  const tagged = el.closest('[data-sfx]')
  const value = tagged?.getAttribute('data-sfx')?.trim()
  if (!value) return null
  if (value === 'off') return 'off'
  return isSfxName(value) ? value : null
}

/**
 * Global UI sound binding. Renders nothing. While sound effects are enabled it
 * attaches ONE delegated listener set on `document`:
 *  - pointerover on an interactive element → soft 'hover' tick
 *    (fine pointers only, throttled, only when entering a NEW element)
 *  - click on an interactive element → 'click' (or the element's `data-sfx` sound)
 * `data-sfx="off"` on an element or ancestor opts it out.
 * Mount once, anywhere (e.g. next to <CursorGlow /> in App).
 */
export function SfxBinder() {
  const [enabled] = useSfxEnabled()

  useEffect(() => {
    if (!enabled) return

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    let current: Element | null = null
    let lastScroll = 0

    const onScroll = () => {
      lastScroll = performance.now()
    }

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !fine.matches) return
      const el = interactiveFrom(e.target)
      if (el === current) return
      current = el
      if (!el || isDisabled(el) || sfxFor(el) === 'off') return
      if (performance.now() - lastScroll < SCROLL_QUIET) return
      playSfx('hover')
    }

    const onClick = (e: MouseEvent) => {
      const el = interactiveFrom(e.target)
      if (!el || isDisabled(el)) return
      const sfx = sfxFor(el)
      if (sfx === 'off') return
      playSfx(sfx ?? 'click')
    }

    document.addEventListener('pointerover', onOver, { passive: true })
    document.addEventListener('click', onClick, { capture: true, passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onScroll, { passive: true })
    return () => {
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('click', onClick, { capture: true })
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onScroll)
    }
  }, [enabled])

  return null
}
