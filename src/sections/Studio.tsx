import { CareersBand } from '@/components/studio/CareersBand'
import { Capabilities } from '@/components/studio/Capabilities'
import { Engines } from '@/components/studio/Engines'
import { Manifesto } from '@/components/studio/Manifesto'
import { Pillars } from '@/components/studio/Pillars'
import { StudioBackdrop } from '@/components/studio/StudioBackdrop'
import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'

/**
 * THE STUDIO — who we are and what we do:
 * manifesto (scroll-lit words) → capabilities → engines & platforms → pillars → careers band.
 * The section keeps `overflow` visible (sticky studio card); the backdrop clips itself.
 */
export function Studio() {
  return (
    <section id="studio" className="relative isolate py-20 sm:py-28 lg:py-36">
      <StudioBackdrop />
      <Container className="relative">
        <SectionHeading
          index="03"
          eyebrow="The Studio"
          title={'Built in Calicut.\n*Played* everywhere.'}
          description="The game studio of a technology company: engineers and artists in the same room, obsessing over how every build feels in your hands."
        />

        <Manifesto className="mt-14 sm:mt-20 lg:mt-28" />
        <Capabilities className="mt-24 sm:mt-32 lg:mt-44" />
        <Engines className="mt-24 sm:mt-32 lg:mt-44" />
        <Pillars className="mt-24 sm:mt-32 lg:mt-44" />
        <CareersBand className="mt-24 sm:mt-32 lg:mt-44" />
      </Container>
    </section>
  )
}
