import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { EarlyAccess } from '@/components/upcoming/EarlyAccess'
import { NextDrop } from '@/components/upcoming/NextDrop'
import { UpcomingBackdrop } from '@/components/upcoming/UpcomingBackdrop'
import { UpcomingDeck } from '@/components/upcoming/UpcomingDeck'
import { upcomingGames } from '@/data/games'

/**
 * UPCOMING — what's in the forge. The signature moment is the sticky card deck (see UpcomingDeck):
 * cards pin under the navbar and pile up as you scroll.
 *
 * NB: no ancestor of the deck may use `overflow: hidden/auto` (it would break `position: sticky`),
 * which is why the decorative layers live in their own clipped backdrop.
 *
 * CSS vars (set here, read by the deck): pin offset + per-card step + gap between cards.
 * On short desktop windows (laptops) the offsets tighten so the whole pile still fits under the navbar.
 */
export function Upcoming() {
  return (
    <section
      id="upcoming"
      className="relative isolate py-20 [--deck-gap:9svh] [--deck-step:14px] [--deck-top:76px] sm:py-28 md:[--deck-gap:12svh] md:[--deck-step:22px] md:[--deck-top:96px] md:[@media(max-height:760px)]:[--deck-step:14px] md:[@media(max-height:760px)]:[--deck-top:86px] lg:py-36"
    >
      <UpcomingBackdrop />
      <Container className="relative">
        <SectionHeading
          index="02"
          eyebrow="Upcoming"
          title={'Next up from\n*the lab.*'}
          description="Every title in the pipeline, straight from the studio floor. Track the build, count down to launch and be first in line when it drops."
          aside={<NextDrop games={upcomingGames} />}
        />

        <div className="mt-12 sm:mt-16 lg:mt-20">
          <UpcomingDeck games={upcomingGames} />
        </div>

        <EarlyAccess className="mt-8 sm:mt-12" />
      </Container>
    </section>
  )
}
