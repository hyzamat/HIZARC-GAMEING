import { useEffect, useRef } from 'react'
import { contactTopics, type ContactTopic } from '@/config/site'
import { CONTACT_TOPIC_EVENT, contactHref, topicFromHash } from '@/lib/contact'
import { scrollToTarget } from '@/lib/scroll'

/** How a topic deep link arrived — `initial` is the page's own URL on mount (no fanfare). */
export type TopicLinkSource = 'initial' | 'hash' | 'link' | 'event'

/**
 * Preselect a contact topic from `#contact-<topic-slug>` deep links:
 *  - the URL hash on mount and on `hashchange`
 *  - clicks on any `<a href="#contact-…">` (SmoothScroll uses history.replaceState, which fires no hashchange)
 *  - programmatic `selectContactTopic()` calls (CONTACT_TOPIC_EVENT)
 * Slugs match case-insensitively; a non-canonical spelling (e.g. #contact-Careers) is normalised
 * so it still lands on its anchor.
 */
export function useTopicDeepLink(onTopic: (topic: ContactTopic, source: TopicLinkSource) => void) {
  const cb = useRef(onTopic)
  useEffect(() => {
    cb.current = onTopic
  })

  useEffect(() => {
    // Rewrite the URL to the canonical anchor id (the Preloader scrolls to location.hash once it lifts).
    const canonicalise = (topic: ContactTopic, scroll: boolean) => {
      const canonical = contactHref(topic)
      if (window.location.hash === canonical) return
      history.replaceState(history.state, '', canonical)
      if (scroll) scrollToTarget(canonical)
    }

    const initial = topicFromHash(window.location.hash)
    if (initial) {
      canonicalise(initial, false)
      cb.current(initial, 'initial')
    }

    const onHash = () => {
      const t = topicFromHash(window.location.hash)
      if (!t) return
      canonicalise(t, true)
      cb.current(t, 'hash')
    }

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !(e.target instanceof Element)) return
      const a = e.target.closest('a[href^="#contact-"]')
      if (!a) return
      const href = a.getAttribute('href') ?? ''
      const t = topicFromHash(href)
      if (!t) return
      cb.current(t, 'link')
      // Exact ids are scrolled by SmoothScroll; odd spellings have no matching id, so handle them here.
      const canonical = contactHref(t)
      if (href !== canonical && !e.defaultPrevented) {
        e.preventDefault()
        scrollToTarget(canonical)
        history.replaceState(history.state, '', canonical)
      }
    }

    const onEvent = (e: Event) => {
      const t = (e as CustomEvent<unknown>).detail
      if ((contactTopics as readonly unknown[]).includes(t)) cb.current(t as ContactTopic, 'event')
    }

    window.addEventListener('hashchange', onHash)
    document.addEventListener('click', onClick)
    window.addEventListener(CONTACT_TOPIC_EVENT, onEvent)
    return () => {
      window.removeEventListener('hashchange', onHash)
      document.removeEventListener('click', onClick)
      window.removeEventListener(CONTACT_TOPIC_EVENT, onEvent)
    }
  }, [])
}
