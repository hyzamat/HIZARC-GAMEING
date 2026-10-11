import { useEffect, useState } from 'react'

function format(timeZone: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(new Date())
  } catch {
    return ''
  }
}

/** "HH:MM" wall-clock time in `timeZone`, re-rendering once per minute (aligned to the minute boundary). */
export function useLocalTime(timeZone: string) {
  const [time, setTime] = useState(() => format(timeZone))

  useEffect(() => {
    let interval: number | undefined
    const tick = () => setTime(format(timeZone))
    tick()
    const toNextMinute = 60000 - (Date.now() % 60000) + 50
    const timeout = window.setTimeout(() => {
      tick()
      interval = window.setInterval(tick, 60000)
    }, toNextMinute)
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [timeZone])

  return time
}
