import { useRef } from 'react'
import { ContactBackdrop } from '@/components/contact/ContactBackdrop'
import { ContactForm } from '@/components/contact/ContactForm'
import { ContactInfo } from '@/components/contact/ContactInfo'
import { NextSteps } from '@/components/contact/NextSteps'
import { TopicAnchors } from '@/components/contact/TopicAnchors'
import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * 04 — Reach Out.
 * Phones: heading → direct lines → form → what happens next.
 * lg+: direct lines + next steps on the left (5/12), the transmission console on the right (7/12).
 * Deep links: `#contact-<topic-slug>` (see `contactHref`) scroll here and preselect the topic.
 * Where the form sits beside the heading (lg+) the anchors land on the heading; on narrower screens
 * the form is a long way below it, so they land on the form itself, where the chosen topic is visible.
 */
export function Contact() {
  const sectionRef = useRef<HTMLElement>(null)
  const sideBySide = useMediaQuery('(min-width: 1024px)')

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative isolate overflow-hidden py-24 supports-[overflow:clip]:overflow-clip sm:py-32 lg:py-40"
    >
      <ContactBackdrop sectionRef={sectionRef} />

      <Container className="relative">
        <div className="relative">
          {sideBySide && <TopicAnchors className="-top-10" />}
          <SectionHeading
            index="04"
            eyebrow="Reach Out"
            title={"Let's build\nsomething *legendary.*"}
            description="Partnerships, publishing, press, careers or player support — tell us what you're working on and the right person will get back to you."
          />
        </div>

        <div className="mt-12 grid gap-14 sm:mt-16 lg:mt-20 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-14 xl:gap-x-16">
          <ContactInfo className="lg:col-span-5 lg:row-start-1" />
          {/* Plain wrapper (never transformed) so the anchors measure true; the panel inside animates on its own. */}
          <div className="relative lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 lg:self-start">
            {!sideBySide && <TopicAnchors className="-top-8" />}
            <ContactForm />
          </div>
          <NextSteps className="lg:col-span-5 lg:row-start-2 lg:self-start" />
        </div>
      </Container>
    </section>
  )
}
