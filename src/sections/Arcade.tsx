import { Cabinet } from '@/components/arcade/Cabinet'
import { ArcadeCta, ArcadePanel } from '@/components/arcade/Panel'
import { useArcadeScores } from '@/components/arcade/scores'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/Container'
import { EASE_OUT, Reveal } from '@/components/ui/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'

/**
 * BONUS LEVEL — HIZARC DASH, a playable endless runner built on one <canvas>.
 * Sits between Upcoming and Studio. Best score + a local top-5 live in localStorage.
 */
export function Arcade() {
  const scores = useArcadeScores()

  return (
    <section id="arcade" aria-label="Bonus level: Hizarc Dash, a playable mini-game" className="relative isolate overflow-hidden py-24 sm:py-32 lg:py-40">
      {/* Backdrop: blueprint grid + glows, clipped inside the section */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_50%_45%,#000_15%,transparent_72%)]" />
        <div className="absolute -top-40 -left-24 h-[34rem] w-[34rem] bg-[radial-gradient(closest-side,rgba(10,124,255,0.2),transparent)] sm:h-[44rem] sm:w-[44rem]" />
        <div className="absolute -right-32 bottom-0 h-[30rem] w-[30rem] bg-[radial-gradient(closest-side,rgba(124,92,255,0.18),transparent)] sm:h-[40rem] sm:w-[40rem]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
      </div>

      <Container>
        <SectionHeading
          index="★"
          eyebrow="Bonus Level"
          title={"Don't just scroll.\n*Play.*"}
          description="A 30-second taste of what we do. Tap, click or hit Space to jump — how far can you dash?"
        />

        {/* Phones: cabinet → how to play + scores → CTA. Desktop: cabinet + CTA on the left, the panel stretches alongside. */}
        <div className="mt-10 grid gap-6 sm:mt-14 lg:grid-cols-12 lg:gap-x-8">
          {/* Opacity + translate only: a filter on this wrapper would force the live canvas through an extra pass. */}
          <motion.div
            className="lg:col-span-8 lg:row-start-1"
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
          >
            <Cabinet scores={scores} />
          </motion.div>
          <div className="lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
            <ArcadePanel scores={scores} />
          </div>
          <Reveal className="lg:col-span-8 lg:row-start-2" amount={0.2}>
            <ArcadeCta />
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
