import { contactTopics } from '@/config/site'
import { cn } from '@/lib/cn'
import { contactHref } from '@/lib/contact'
import { NAV_OFFSET } from '@/lib/scroll'

/**
 * Invisible scroll targets for the `#contact-<topic-slug>` deep links (SmoothScroll only scrolls to ids that exist).
 * Render inside a `relative` wrapper that is NOT being transformed by an entrance animation — Lenis measures the
 * target at call time, so an anchor inside a rising panel would land short by the panel's offset.
 * `className` positions the group (e.g. `-top-10`) so the scroll lands with a little air above the heading / form.
 */
export function TopicAnchors({ className }: { className?: string }) {
  return (
    <>
      {contactTopics.map((topic) => (
        <span
          key={topic}
          id={contactHref(topic).slice(1)}
          aria-hidden
          className={cn('pointer-events-none absolute left-0 size-px', className)}
          style={{ scrollMarginTop: NAV_OFFSET }}
        />
      ))}
    </>
  )
}
