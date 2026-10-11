import { useInView } from 'framer-motion'
import { Fragment, useRef } from 'react'

const MARQUEE = ['In development', 'Coming soon', 'Be first in line', 'Wishlist now']

/**
 * Decorative backdrop for the Upcoming section: blueprint grid, pre-blurred colour pools
 * and a slow outlined marquee behind the heading. Lives in its own clipped layer so the
 * section itself never needs `overflow: hidden` (which would break the sticky deck).
 */
export function UpcomingBackdrop() {
  const marqueeRef = useRef<HTMLDivElement>(null)
  // The marquee only sits behind the heading, so it has nothing to do once that's scrolled away.
  const marqueeVisible = useInView(marqueeRef, { margin: '160px 0px' })

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(80%_46%_at_50%_0%,#000_15%,transparent_75%)]" />
      <div className="absolute -top-40 -left-48 h-[36rem] w-[36rem] bg-[radial-gradient(closest-side,rgb(124_92_255/0.22),transparent)]" />
      <div className="absolute top-[34%] -right-56 h-[46rem] w-[46rem] bg-[radial-gradient(closest-side,rgb(10_124_255/0.17),transparent)]" />
      <div className="absolute bottom-[-6rem] left-[8%] h-[30rem] w-[42rem] bg-[radial-gradient(closest-side,rgb(46_230_255/0.09),transparent)]" />

      {/* slow outlined marquee, two identical groups so the -50% loop is seamless */}
      <div ref={marqueeRef} className="mask-fade-x absolute inset-x-0 top-3 sm:top-16 lg:top-20">
        <div
          data-paused={!marqueeVisible}
          className="flex w-max animate-marquee font-display text-[clamp(4rem,15vw,10rem)] leading-none font-bold whitespace-nowrap text-outline uppercase opacity-60 [--marquee-duration:80s] data-[paused=true]:[animation-play-state:paused]"
        >
          {[0, 1].map((group) => (
            <div key={group} className="flex shrink-0 items-center">
              {MARQUEE.map((word) => (
                <Fragment key={word}>
                  <span className="px-[0.35em]">{word}</span>
                  <span className="text-brand/50">///</span>
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* seam into the next section */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}
