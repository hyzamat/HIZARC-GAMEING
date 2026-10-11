import { useEffect, useState } from 'react'
import { site } from '@/config/site'

const ZONE = 'Asia/Kolkata'

/** "14:32" in Calicut, whatever the visitor's own time zone is. */
function readTime() {
  try {
    // hourCycle h23 (not hour12:false) so midnight reads 00:05, never 24:05
    return new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())
  } catch {
    return '--:--'
  }
}

/**
 * Tiny HUD chip with the studio's local time (Calicut, IST). The live dot pulses
 * on a CSS loop; the clock re-checks every 15s, which is plenty for minutes.
 */
export function StudioClock() {
  const [time, setTime] = useState(readTime)

  useEffect(() => {
    const id = window.setInterval(() => setTime(readTime()), 15000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <p className="inline-flex h-8 items-center gap-2.5 bg-white/[0.05] px-3.5 font-mono text-[0.64rem] tracking-[0.2em] whitespace-nowrap text-mist uppercase chamfer-sm">
      <span aria-hidden className="size-1.5 animate-pulse-soft bg-volt shadow-[0_0_8px_var(--color-volt)]" />
      <span>{site.locationShort.split(',')[0]}</span>
      <span aria-hidden className="text-haze">
        /
      </span>
      <span className="text-snow tabular-nums">{time}</span>
      <span className="text-haze">IST</span>
    </p>
  )
}
