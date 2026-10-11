import { contactTopics, site, type ContactTopic } from '@/config/site'
import { scrollToTarget } from '@/lib/scroll'

/**
 * Contact form helpers: payload type, delivery (JSON endpoint or mailto fallback),
 * validation rules and topic deep links (#contact-<topic-slug>).
 */

export type ContactPayload = {
  name: string
  email: string
  company: string
  topic: ContactTopic
  /** Budget range — only meaningful for business topics (see `topicNeedsBudget`), '' otherwise. */
  budget: string
  message: string
}

export type ContactResult = { via: 'endpoint' | 'mailto' }

/* ---------------------------------------------------------------- */
/*  Rules shared by the form UI                                     */
/* ---------------------------------------------------------------- */

export const MESSAGE_MIN = 10
export const MESSAGE_MAX = 2000

/** Pragmatic email check: something@something.tld, no spaces. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/

export const budgetRanges = ['< $10k', '$10k – $50k', '$50k – $150k', '$150k+', 'Not sure yet'] as const
export type BudgetRange = (typeof budgetRanges)[number]

const BUDGET_TOPICS: readonly ContactTopic[] = ['Partnership', 'Co-development', 'Publishing']

/** Business enquiries get the optional budget range field. */
export function topicNeedsBudget(topic: ContactTopic) {
  return BUDGET_TOPICS.includes(topic)
}

/* ---------------------------------------------------------------- */
/*  Deep links                                                      */
/* ---------------------------------------------------------------- */

/** 'Press & Media' -> 'press-media', 'Co-development' -> 'co-development'. */
export function topicSlug(topic: string) {
  return topic
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** In-page link that scrolls to the contact section with `topic` preselected, e.g. '#contact-careers'. */
export function contactHref(topic: ContactTopic): `#contact-${string}` {
  return `#contact-${topicSlug(topic)}`
}

/** Resolve '#contact-careers' (any case) to its topic, or null. */
export function topicFromHash(hash: string): ContactTopic | null {
  const match = /^#?contact-(.+)$/i.exec(hash.trim())
  if (!match) return null
  let slug = match[1]
  try {
    slug = decodeURIComponent(slug)
  } catch {
    // malformed escape sequence — compare the raw value
  }
  const wanted = topicSlug(slug)
  return contactTopics.find((t) => topicSlug(t) === wanted) ?? null
}

/** Window event the contact form listens to (detail = ContactTopic). */
export const CONTACT_TOPIC_EVENT = 'hizarc:contact-topic'

/**
 * Programmatic version of `<a href={contactHref(topic)}>`: preselects the topic in the
 * contact form and (by default) smooth-scrolls to the contact section.
 */
export function selectContactTopic(topic: ContactTopic, opts: { scroll?: boolean } = {}) {
  window.dispatchEvent(new CustomEvent<ContactTopic>(CONTACT_TOPIC_EVENT, { detail: topic }))
  if (opts.scroll === false) return
  const hash = contactHref(topic)
  scrollToTarget(hash)
  history.replaceState(null, '', hash)
}

/* ---------------------------------------------------------------- */
/*  Delivery                                                        */
/* ---------------------------------------------------------------- */

export function contactSubject(payload: Pick<ContactPayload, 'topic' | 'name'>) {
  return `[Hizarc Games] ${payload.topic} — ${payload.name}`
}

/**
 * Replace lone UTF-16 surrogates (e.g. an emoji cut in half at the character limit) with U+FFFD.
 * `encodeURIComponent` throws a URIError on them, which would otherwise break the mailto fallback.
 */
export function wellFormed(text: string) {
  let out = ''
  for (const ch of text) out += ch.length === 1 && ch >= '\uD800' && ch <= '\uDFFF' ? '�' : ch
  return out
}

function cleanPayload(payload: ContactPayload): ContactPayload {
  return {
    ...payload,
    name: wellFormed(payload.name),
    email: wellFormed(payload.email),
    company: wellFormed(payload.company),
    budget: wellFormed(payload.budget),
    message: wellFormed(payload.message),
  }
}

/**
 * How long a `mailto:` URL may get before mail apps start dropping it. Windows hands the link to the
 * shell, which caps URLs at ~2k characters; macOS, iOS and Android take far more than our 2000-char
 * message limit can ever produce.
 */
function mailtoLimit() {
  return typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent) ? 1900 : 8000
}

const TRUNCATION_NOTE = "[Message shortened to fit your email app's link limit — paste the full text here.]"

function mailtoBody(payload: ContactPayload, message: string) {
  return [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Company / studio: ${payload.company || '—'}`,
    `Topic: ${payload.topic}`,
    ...(payload.budget || topicNeedsBudget(payload.topic) ? [`Budget range: ${payload.budget || 'Not specified'}`] : []),
    '',
    message,
    '',
    '—',
    `Sent from ${site.url}`,
  ].join('\r\n')
}

/**
 * Pre-filled `mailto:` draft to the studio inbox containing every form field.
 * If the whole message would push the URL past what the visitor's platform can open, only the
 * message is shortened (every other field is kept) and `truncated` is true so the UI can offer the full text.
 */
export function buildMailtoDraft(payload: ContactPayload): { href: string; truncated: boolean } {
  const p = cleanPayload(payload)
  const head = `mailto:${site.email}?subject=${encodeURIComponent(contactSubject(p))}&body=`
  const hrefFor = (message: string) => head + encodeURIComponent(mailtoBody(p, message))
  const limit = mailtoLimit()

  const full = hrefFor(p.message)
  if (full.length <= limit) return { href: full, truncated: false }

  const draft = (keep: number) => {
    let cut = p.message.slice(0, keep)
    if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1) // never end on half an emoji
    return hrefFor(`${cut.trimEnd()}…\r\n\r\n${TRUNCATION_NOTE}`)
  }
  // Longest message prefix that still fits (URL length only grows with the prefix, so bisect).
  let lo = 0
  let hi = p.message.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (draft(mid).length <= limit) lo = mid
    else hi = mid - 1
  }
  return { href: draft(lo), truncated: true }
}

/** Pre-filled `mailto:` link to the studio inbox containing every form field. */
export function buildMailto(payload: ContactPayload) {
  return buildMailtoDraft(payload).href
}

const REQUEST_TIMEOUT_MS = 15000

/** Where a submitted message goes, in priority order: Google Form → JSON endpoint → visitor's email app. */
export function contactDelivery(): 'google-form' | 'endpoint' | 'mailto' {
  if (site.googleForm.action.trim()) return 'google-form'
  if (site.contactEndpoint.trim()) return 'endpoint'
  return 'mailto'
}

/** Today's date in studio time (Calicut), split the way a Google Forms date question expects it. */
function studioDateParts() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date())
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  // en-GB pads single digits ('05'); send plain numbers like the form's own date inputs do
  const num = (type: Intl.DateTimeFormatPartTypes) => String(Number(get(type)))
  return { year: num('year'), month: num('month'), day: num('day') }
}

function googleFormBody(payload: ContactPayload) {
  const { fields } = site.googleForm
  const date = studioDateParts()
  const body = new URLSearchParams({ fvv: '1', pageHistory: '0' })
  body.set(fields.name, payload.name)
  body.set(fields.email, payload.email)
  // The whole mail body (name, email, topic, company, budget, message) so one cell holds the full context.
  body.set(fields.message, mailtoBody(payload, payload.message))
  body.set(`${fields.date}_year`, date.year)
  body.set(`${fields.date}_month`, date.month)
  body.set(`${fields.date}_day`, date.day)
  return body
}

/**
 * POST the message to the Google Form. Google doesn't allow cross-origin reads, so this is a `no-cors`
 * request: the response is opaque and can't be checked — a resolved request counts as delivered,
 * and only network failures / timeouts reject.
 */
async function sendToGoogleForm(payload: ContactPayload): Promise<ContactResult> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    await fetch(site.googleForm.action, {
      method: 'POST',
      mode: 'no-cors',
      body: googleFormBody(payload),
      signal: controller.signal,
    })
    return { via: 'endpoint' }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw new Error('The request timed out.')
    throw new Error("We couldn't reach our message service — check your connection.")
  } finally {
    window.clearTimeout(timer)
  }
}

/** Pull a human-readable reason out of a form backend's error JSON (Formspree, Web3Forms, Getform…). */
async function readErrorMessage(res: Response) {
  try {
    const data: unknown = await res.json()
    if (data && typeof data === 'object') {
      const d = data as { errors?: { message?: unknown }[]; message?: unknown; error?: unknown }
      const first = Array.isArray(d.errors) ? d.errors[0]?.message : undefined
      const msg = first ?? d.message ?? d.error
      if (typeof msg === 'string' && msg.trim()) return msg.trim()
    }
  } catch {
    // body was not JSON
  }
  return `Request failed (${res.status})`
}

/**
 * Deliver a contact message.
 * - `site.googleForm.action` set → submit it to the Google Form; throws on network errors / timeouts.
 * - `site.contactEndpoint` set → POST JSON to it; throws on network errors or non-2xx responses.
 * - otherwise → opens the visitor's email app with a pre-filled message to `site.email`.
 *   Navigation happens synchronously (inside the submit gesture) so browsers allow the mailto hand-off.
 */
export async function sendContact(input: ContactPayload): Promise<ContactResult> {
  const payload = cleanPayload(input)
  const delivery = contactDelivery()

  if (delivery === 'google-form') return sendToGoogleForm(payload)

  if (delivery === 'mailto') {
    window.location.href = buildMailto(payload)
    return { via: 'mailto' }
  }

  const endpoint = site.contactEndpoint.trim()

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        company: payload.company,
        topic: payload.topic,
        budget: payload.budget,
        message: payload.message,
        _subject: contactSubject(payload),
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(await readErrorMessage(res))
    return { via: 'endpoint' }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw new Error('The request timed out.')
    throw err instanceof Error ? err : new Error('Network error')
  } finally {
    window.clearTimeout(timer)
  }
}
