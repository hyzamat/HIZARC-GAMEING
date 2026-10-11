import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FeaturedSpotlight } from '@/components/games/FeaturedSpotlight'
import { FilterChips } from '@/components/games/FilterChips'
import { GameLibrary } from '@/components/games/GameLibrary'
import { GameModal } from '@/components/games/GameModal'
import { pad2, type GameFilter } from '@/components/games/shared'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { categories, games, type Game } from '@/data/games'
import { useIsDesktop } from '@/hooks/useMediaQuery'

type OpenState = {
  game: Game
  /** Opened from a library card → the key art morphs between card and dialog. */
  fromCard: boolean
}

const MASK_FADE = '[mask-image:radial-gradient(60%_60%_at_50%_0%,#000,transparent)] [-webkit-mask-image:radial-gradient(60%_60%_at_50%_0%,#000,transparent)]'

/** Big outlined "06" shown beside the heading on tablets and up. */
function CatalogueCount() {
  return (
    <div aria-hidden className="flex items-center gap-4">
      <span className="font-display text-6xl leading-none font-black text-outline lg:text-7xl">{pad2(games.length)}</span>
      <span className="font-mono text-[0.68rem] leading-relaxed tracking-[0.25em] text-haze uppercase">
        Titles
        <br />
        shipped
      </span>
    </div>
  )
}

/**
 * #games — featured spotlight, filterable library (carousel on phones, grid above)
 * and the game detail dialog.
 *
 * NOTE: nothing between the library cards and <body> may create a stacking context
 * (no isolate / z-index / transform / filter on wrappers). The card the dialog is flying
 * back into is lifted to z-[71] so it stays visible above the z-[70] dialog layer.
 */
export function Games() {
  const desktop = useIsDesktop()
  const reduce = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  // Giant outlined word that drifts sideways as the section scrolls past (depth, transform only).
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })
  const wordX = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['6%', '-36%'])
  const featured = useMemo(() => games.find((g) => g.featured) ?? games[0], [])
  const featuredNumber = games.indexOf(featured) + 1

  const [filter, setFilter] = useState<GameFilter>('All')
  const [open, setOpen] = useState<OpenState | null>(null)
  const [lifted, setLifted] = useState<string | null>(null)
  const openRef = useRef<OpenState | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const liftTimer = useRef(0)

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => () => window.clearTimeout(liftTimer.current), [])

  const options = useMemo(
    () => [
      { value: 'All' as const, count: games.length },
      ...categories.map((c) => ({ value: c as GameFilter, count: games.filter((g) => g.category === c).length })),
    ],
    [],
  )

  // "All" → the spotlight already shows the featured game; a category shows every game in it.
  const shown = useMemo(
    () => (filter === 'All' ? games.filter((g) => g.slug !== featured.slug) : games.filter((g) => g.category === filter)),
    [filter, featured],
  )

  const openGame = useCallback((game: Game, opener: HTMLElement, fromCard: boolean) => {
    window.clearTimeout(liftTimer.current)
    openerRef.current = opener
    setLifted(null)
    setOpen({ game, fromCard })
  }, [])

  const closeGame = useCallback(() => {
    const current = openRef.current
    if (current?.fromCard) {
      // Keep the card above the dialog layer until its key art has landed (the fly-back takes ~0.7s).
      // Cleared on a timer, not on the dialog's exit, which can finish earlier than the art does.
      setLifted(current.game.slug)
      window.clearTimeout(liftTimer.current)
      liftTimer.current = window.setTimeout(() => setLifted(null), 950)
    }
    setOpen(null)
  }, [])

  const countLabel = filter === 'All' ? `${games.length} titles` : `${shown.length} ${filter} ${shown.length === 1 ? 'title' : 'titles'}`

  return (
    <>
      <section id="games" ref={sectionRef} aria-label="Our games" className="relative py-20 sm:py-28 lg:py-36">
        {/* backdrop — its own clipped layer so the section itself stays unclipped */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={`absolute inset-x-0 top-0 h-[42rem] bg-grid opacity-70 ${MASK_FADE}`} />
          <div className="absolute -top-44 -left-44 size-[36rem] bg-[radial-gradient(closest-side,rgba(10,124,255,0.15),transparent)]" />
          <div className="absolute top-[38%] -right-52 size-[42rem] bg-[radial-gradient(closest-side,rgba(124,92,255,0.12),transparent)]" />
          <div className="absolute bottom-0 left-[18%] size-[34rem] bg-[radial-gradient(closest-side,rgba(46,230,255,0.07),transparent)]" />
          <motion.p
            style={{ x: wordX }}
            className="absolute top-[42%] left-0 font-display text-[clamp(5rem,19vw,17rem)] leading-none font-black tracking-[-0.04em] whitespace-nowrap text-outline opacity-40 select-none"
          >
            ARCADE · ACTION · STRATEGY · CASUAL · ARCADE · ACTION
          </motion.p>
          <span className="absolute top-0 left-[7%] h-full w-px -skew-x-[28deg] bg-gradient-to-b from-transparent via-white/[0.07] to-transparent" />
          <span className="absolute top-0 right-[9%] hidden h-full w-px -skew-x-[28deg] bg-gradient-to-b from-transparent via-white/[0.07] to-transparent sm:block" />
        </div>

        <Container className="relative">
          <SectionHeading
            index="01"
            eyebrow="Our Games"
            title={"Worlds we've\n*already* shipped."}
            description="Neon racers, tactical shooters and cozy tycoons. Original games built in-house with Unity and Unreal, played by millions in 140+ countries."
            aside={desktop ? <CatalogueCount /> : undefined}
          />

          <FeaturedSpotlight
            game={featured}
            number={featuredNumber}
            total={games.length}
            onOpen={(opener) => openGame(featured, opener, false)}
            className="mt-10 sm:mt-14"
          />

          {/* library */}
          <div className="mt-16 sm:mt-24">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <Reveal>
                <p className="flex items-center gap-3 font-mono text-[0.7rem] tracking-[0.25em] uppercase">
                  <span className="text-cyan">[ Library ]</span>
                  <span aria-hidden className="h-px w-8 bg-gradient-to-r from-cyan to-transparent" />
                  <span aria-live="polite" aria-atomic className="text-haze">
                    {countLabel}
                  </span>
                </p>
                <h3 className="mt-3 font-display text-[clamp(1.5rem,5.6vw,2.4rem)] leading-tight font-bold tracking-[-0.02em] text-snow">
                  Browse the full library
                </h3>
              </Reveal>
              <Reveal delay={0.1}>
                <FilterChips options={options} value={filter} onChange={setFilter} />
              </Reveal>
            </div>

            <div className="mt-6 sm:mt-8">
              <GameLibrary items={shown} filter={filter} liftedSlug={lifted} onOpen={(game, opener) => openGame(game, opener, true)} />
            </div>
          </div>
        </Container>
      </section>

      <GameModal game={open?.game ?? null} sharedArt={open?.fromCard ?? false} openerRef={openerRef} onClose={closeGame} />
    </>
  )
}
