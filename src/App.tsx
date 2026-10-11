import { MotionConfig } from 'framer-motion'
import { SmoothScroll } from '@/components/layout/SmoothScroll'
import { Preloader } from '@/components/layout/Preloader'
import { ScrollProgress } from '@/components/layout/ScrollProgress'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CursorGlow } from '@/components/layout/CursorGlow'
import { NoiseOverlay } from '@/components/layout/NoiseOverlay'
import { SectionBoundary } from '@/components/layout/SectionBoundary'
import { Hero } from '@/sections/Hero'
import { Ticker } from '@/sections/Ticker'
import { Games } from '@/sections/Games'
import { Stats } from '@/sections/Stats'
import { Upcoming } from '@/sections/Upcoming'
import { Arcade } from '@/sections/Arcade'
import { Studio } from '@/sections/Studio'
import { Contact } from '@/sections/Contact'
import { Celebration, KonamiEgg, SfxBinder } from '@/components/fx'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScroll>
        {/* data-nosnippet (span/div/section only): keeps "Skip to content" out of search snippets */}
        <span data-nosnippet>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
        </span>
        <Preloader />
        <ScrollProgress />
        <Navbar />
        {/* tabIndex -1: the skip link moves keyboard focus here (see SmoothScroll), so Tab continues past the nav */}
        <main id="main" tabIndex={-1} className="relative outline-none">
          <SectionBoundary name="Hero">
            <Hero />
          </SectionBoundary>
          <SectionBoundary name="Ticker">
            <Ticker />
          </SectionBoundary>
          <SectionBoundary name="Games">
            <Games />
          </SectionBoundary>
          <SectionBoundary name="Stats">
            <Stats />
          </SectionBoundary>
          <SectionBoundary name="Upcoming">
            <Upcoming />
          </SectionBoundary>
          <SectionBoundary name="Arcade">
            <Arcade />
          </SectionBoundary>
          <SectionBoundary name="Studio">
            <Studio />
          </SectionBoundary>
          <SectionBoundary name="Contact">
            <Contact />
          </SectionBoundary>
        </main>
        <SectionBoundary name="Footer">
          <Footer />
        </SectionBoundary>
        <SectionBoundary name="CursorGlow">
          <CursorGlow />
        </SectionBoundary>
        <SectionBoundary name="SfxBinder">
          <SfxBinder />
        </SectionBoundary>
        <SectionBoundary name="KonamiEgg">
          <KonamiEgg />
        </SectionBoundary>
        <SectionBoundary name="Celebration">
          <Celebration />
        </SectionBoundary>
        <NoiseOverlay />
      </SmoothScroll>
    </MotionConfig>
  )
}
