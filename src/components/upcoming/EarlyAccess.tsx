import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'

/** Closing call-to-action under the deck: a slim HUD strip that ends the section cleanly. */
export function EarlyAccess({ className }: { className?: string }) {
  return (
    <Reveal amount={0.5} className={cn('relative', className)}>
      <div className="flex flex-col gap-5 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:pt-9">
        <div className="flex items-start gap-4">
          <span aria-hidden className="mt-1.5 h-4 w-2.5 shrink-0 -skew-x-[28deg] bg-volt shadow-[0_0_16px_rgba(215,255,58,0.55)]" />
          <div>
            <p className="font-mono text-[0.68rem] tracking-[0.25em] text-cyan uppercase">Early access</p>
            <h3 className="mt-2 font-display text-xl leading-tight font-bold text-snow sm:text-2xl">Be first in line.</h3>
            <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-mist">
              Playtest invites, wishlist links and launch-day drops go to our list before anyone else.
            </p>
          </div>
        </div>
        <Button href="#contact" variant="ghost" icon={<Bell aria-hidden className="size-4" strokeWidth={2.2} />} className="w-full sm:w-auto">
          Get notified
        </Button>
      </div>
    </Reveal>
  )
}
