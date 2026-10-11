import { AnimatePresence, motion, useMotionValue, useSpring, type Variants } from 'framer-motion'
import { CircleAlert } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { EASE_OUT } from '@/components/ui/Reveal'
import { site, type ContactTopic } from '@/config/site'
import { useFinePointer } from '@/hooks/useMediaQuery'
import { celebrate, centerOf } from '@/lib/celebrate'
import { cn } from '@/lib/cn'
import { budgetRanges, contactDelivery, EMAIL_RE, MESSAGE_MAX, MESSAGE_MIN, sendContact, topicNeedsBudget, type ContactPayload, type ContactResult } from '@/lib/contact'
import { NAV_OFFSET, scrollToTarget } from '@/lib/scroll'
import { playSfx } from '@/lib/sfx'
import { ChamferFrame } from './ChamferFrame'
import { SelectField, TextAreaField, TextField } from './Fields'
import { SignalMeter } from './SignalMeter'
import { SubmitButton, type SubmitStatus } from './SubmitButton'
import { SuccessPanel } from './SuccessPanel'
import { TopicPicker } from './TopicPicker'
import { topicMeta } from './topics'
import { useTopicDeepLink, type TopicLinkSource } from './useTopicDeepLink'

/* ---------------------------------------------------------------- */
/*  Form model + validation                                         */
/* ---------------------------------------------------------------- */

type Values = { name: string; email: string; company: string; budget: string; message: string }
type RequiredKey = 'name' | 'email' | 'message'
type Errors = Partial<Record<RequiredKey, string>>

const EMPTY: Values = { name: '', email: '', company: '', budget: '', message: '' }
const REQUIRED: readonly RequiredKey[] = ['name', 'email', 'message']
const FIELD_LABEL: Record<RequiredKey, string> = { name: 'name', email: 'email', message: 'message' }

const DEFAULT_TOPIC: ContactTopic = 'Partnership'
/** Keep the "Sending…" state on screen long enough to read, even when delivery is instant. */
const MIN_SENDING_MS = 750
/** How long the button shows "Sent ✓" before the form hands over to the success panel. */
const SUCCESS_HOLD_MS = 650

function validateField(key: RequiredKey, v: Values): string | undefined {
  switch (key) {
    case 'name':
      return v.name.trim() ? undefined : 'Please tell us your name.'
    case 'email': {
      const email = v.email.trim()
      if (!email) return 'We need an email address to reply to.'
      return EMAIL_RE.test(email) ? undefined : "That email doesn't look quite right — check for typos."
    }
    case 'message': {
      const len = v.message.trim().length
      if (!len) return 'Add a short message so we know how to help.'
      return len < MESSAGE_MIN ? `A little more detail, please — at least ${MESSAGE_MIN} characters.` : undefined
    }
  }
}

function validateAll(v: Values): Errors {
  const out: Errors = {}
  for (const key of REQUIRED) {
    const err = validateField(key, v)
    if (err) out[key] = err
  }
  return out
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

function isOnScreen(el: Element) {
  const r = el.getBoundingClientRect()
  return r.top >= NAV_OFFSET && r.bottom <= window.innerHeight
}

/**
 * Did the browser (or a password manager) fill this field, rather than a script poking `.value`?
 * Chrome can autofill an off-screen "company…" field with the visitor's organisation, which must never
 * be mistaken for a bot. `:autofill` is the standard name, `:-webkit-autofill` the legacy one.
 */
function isAutofilled(el: HTMLInputElement) {
  for (const selector of [':autofill', ':-webkit-autofill']) {
    try {
      if (el.matches(selector)) return true
    } catch {
      // selector not supported by this browser
    }
  }
  return false
}

/** Springs for the cursor spotlight (transform-only, so it never repaints the panel). */
const SPOT_SPRING = { stiffness: 220, damping: 28, mass: 0.5 } as const

/* ---------------------------------------------------------------- */
/*  Motion                                                          */
/* ---------------------------------------------------------------- */

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 48, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 1, ease: EASE_OUT, delayChildren: 0.45, staggerChildren: 0.06 } },
}

const cornerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.4 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 22 } },
}

/** One-shot "boot" scan that sweeps down the panel as it lands. */
const scanVariants: Variants = {
  hidden: { y: '-100%' },
  show: { y: '100%', transition: { duration: 1.5, ease: [0.65, 0, 0.35, 1] } },
}

const formVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.35, ease: EASE_OUT } },
}

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE_OUT } },
}

const hud = 'font-mono text-[0.66rem] tracking-[0.24em] uppercase'

/** HUD step label: [01] ── WHAT'S IT ABOUT? */
function StepLabel({ index, children, id }: { index: string; children: string; id?: string }) {
  return (
    <p id={id} className={cn(hud, 'mb-4 flex items-center gap-3 text-mist')}>
      <span aria-hidden className="text-cyan">
        [{index}]
      </span>
      <span aria-hidden className="h-px w-6 bg-gradient-to-r from-brand-400 to-transparent" />
      <span>{children}</span>
    </p>
  )
}

/** Brackets + angled ticks hugging the panel's square and chamfered corners. */
function PanelCorners() {
  // Tick parallel to the 28px cut, pushed ~8px outward from the cut's midpoint.
  const tick = 'absolute h-[2px] w-7 bg-gradient-to-r from-transparent via-cyan/80 to-transparent'
  return (
    <>
      <motion.span variants={cornerVariants} aria-hidden className="absolute -top-2 -right-2 size-4 border-t-2 border-r-2 border-cyan/70" />
      <motion.span variants={cornerVariants} aria-hidden className="absolute -bottom-2 -left-2 size-4 border-b-2 border-l-2 border-cyan/70" />
      <motion.span variants={cornerVariants} aria-hidden className={tick} style={{ left: -5.7, top: 7.3, rotate: -45 }} />
      <motion.span variants={cornerVariants} aria-hidden className={tick} style={{ right: -5.7, bottom: 7.3, rotate: -45 }} />
    </>
  )
}

/* ---------------------------------------------------------------- */
/*  Contact form                                                    */
/* ---------------------------------------------------------------- */

/**
 * The "transmission console": topic chips, floating-label fields, a live signal meter and a
 * multi-state submit. Swaps to a celebratory success panel once delivered. Topic can be
 * preselected through `#contact-<slug>` deep links (see useTopicDeepLink / contactHref).
 */
export function ContactForm({ className }: { className?: string }) {
  const uid = useId()
  const ids = {
    topicLabel: `${uid}-topic-label`,
    topicBlurb: `${uid}-topic-blurb`,
    name: `${uid}-name`,
    email: `${uid}-email`,
    company: `${uid}-company`,
    budget: `${uid}-budget`,
    message: `${uid}-message`,
    honeypot: `${uid}-website`,
  }

  const [topic, setTopic] = useState<ContactTopic>(DEFAULT_TOPIC)
  const [values, setValues] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [sendError, setSendError] = useState('')
  const [announce, setAnnounce] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const [pulse, setPulse] = useState<{ key: number; topic: ContactTopic; delay: number } | null>(null)
  const [sent, setSent] = useState<{ via: ContactResult['via']; payload: ContactPayload } | null>(null)
  /** How the last successful send was delivered — drives the button's success label. */
  const [sentVia, setSentVia] = useState<ContactResult['via']>('endpoint')

  const panelRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const fieldRefs = { name: nameRef, email: emailRef, message: messageRef }
  const alive = useRef(true)
  const timers = useRef<number[]>([])
  const focusOnFormMount = useRef(false)

  const fine = useFinePointer()
  const [isMac] = useState(() => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent))

  // Mirror of `sent` for event callbacks that must not close over stale state.
  const sentRef = useRef(sent)
  useEffect(() => {
    sentRef.current = sent
  }, [sent])

  useEffect(() => {
    alive.current = true
    const pending = timers.current
    return () => {
      alive.current = false
      pending.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  /* ---------------- deep links ---------------- */

  /** Back to a fresh form: same person (name / email / company kept), new message. */
  const clearForNewMessage = useCallback(() => {
    setStatus('idle')
    setSubmitted(false)
    setErrors({})
    setSendError('')
    setValues((v) => ({ ...EMPTY, name: v.name, email: v.email, company: v.company }))
    setSent(null)
  }, [])

  const applyDeepLink = useCallback(
    (t: ContactTopic, source: TopicLinkSource) => {
      setTopic(t)
      if (source === 'initial') return
      // Coming from far away? Hold the chip's flash until the smooth scroll has (nearly) landed.
      const r = panelRef.current?.getBoundingClientRect()
      const visible = r !== undefined && r.top < window.innerHeight * 0.7 && r.bottom > 0
      setPulse((p) => ({ key: (p?.key ?? 0) + 1, topic: t, delay: visible ? 0.1 : 1.15 }))
      setAnnounce(`Topic set to ${t}.`)
      // Arriving from a link while the success panel is up? Open a fresh form on the new topic.
      if (sentRef.current) {
        focusOnFormMount.current = false
        clearForNewMessage()
      }
    },
    [clearForNewMessage],
  )

  useTopicDeepLink(applyDeepLink)

  /* ---------------- pointer spotlight (mouse / trackpad only) ---------------- */

  // A pre-rendered glow that follows the pointer by transform + opacity only (no gradient repaint per move).
  const spotTargetX = useMotionValue(0)
  const spotTargetY = useMotionValue(0)
  const spotTargetOpacity = useMotionValue(0)
  const spotX = useSpring(spotTargetX, SPOT_SPRING)
  const spotY = useSpring(spotTargetY, SPOT_SPRING)
  const spotOpacity = useSpring(spotTargetOpacity, { stiffness: 140, damping: 24 })

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!fine || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    if (spotTargetOpacity.get() === 0) {
      // First touch of the panel: appear under the cursor instead of sliding in from the corner.
      spotX.jump(e.clientX - r.left)
      spotY.jump(e.clientY - r.top)
    }
    spotTargetX.set(e.clientX - r.left)
    spotTargetY.set(e.clientY - r.top)
    spotTargetOpacity.set(1)
  }
  const onPointerLeave = () => spotTargetOpacity.set(0)

  /* ---------------- field handlers ---------------- */

  const setField = (key: keyof Values) => (value: string) => {
    const next = { ...values, [key]: value }
    setValues(next)
    // Clear an error the moment it's fixed (new errors only appear on blur / submit).
    if (key !== 'company' && key !== 'budget' && errors[key] && !validateField(key, next)) {
      setErrors((e) => ({ ...e, [key]: undefined }))
    }
  }

  const blurField = (key: RequiredKey) => () => {
    if (!submitted) return
    setErrors((e) => ({ ...e, [key]: validateField(key, values) }))
  }

  const changeTopic = (t: ContactTopic) => {
    setTopic(t)
    setAnnounce('')
  }

  const focusField = (el: HTMLElement | null) => {
    if (!el) return
    el.focus({ preventScroll: true })
    if (!isOnScreen(el)) scrollToTarget(el, { offset: -NAV_OFFSET - 72 })
  }

  /* ---------------- submit ---------------- */

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'loading' || status === 'success') return

    setSubmitted(true)
    const errs = validateAll(values)
    setErrors(errs)
    const invalid = REQUIRED.filter((k) => errs[k])

    if (invalid.length) {
      setShakeKey((k) => k + 1)
      setAnnounce(invalid.length === 1 ? `Please check the ${FIELD_LABEL[invalid[0]]} field.` : `Please fix the ${invalid.length} highlighted fields.`)
      focusField(fieldRefs[invalid[0]].current)
      return
    }

    const payload: ContactPayload = {
      name: values.name.trim(),
      email: values.email.trim(),
      company: values.company.trim(),
      topic,
      budget: topicNeedsBudget(topic) ? values.budget : '',
      message: values.message.trim(),
    }

    setSendError('')
    setStatus('loading')
    setAnnounce('Sending your message…')

    // Honeypot filled by a script → almost certainly a bot: pretend it worked, send nothing.
    // (A value the browser autofilled is a real visitor, not a bot.)
    const trap = honeypotRef.current
    const bot = trap !== null && trap.value.trim() !== '' && !isAutofilled(trap)
    // Called synchronously inside the submit gesture so the mailto: hand-off isn't blocked.
    const delivery: Promise<ContactResult> = bot ? Promise.resolve({ via: 'endpoint' }) : sendContact(payload)

    Promise.all([delivery, wait(MIN_SENDING_MS)])
      .then(([res]) => {
        if (!alive.current) return
        setSentVia(res.via)
        setStatus('success')
        setAnnounce(res.via === 'mailto' ? 'Opening your email app.' : 'Message sent.')
        playSfx('success')
        celebrate({ intensity: 'small', ...centerOf(submitRef.current) })
        later(() => setSent({ via: res.via, payload }), SUCCESS_HOLD_MS)
      })
      .catch((err: unknown) => {
        if (!alive.current) return
        const reason = err instanceof Error && err.message ? err.message : 'Something went wrong.'
        setStatus('error')
        setSendError(reason)
        setShakeKey((k) => k + 1)
        setAnnounce(`Your message couldn't be sent. ${reason} Please try again, or email us at ${site.email}.`)
      })
  }

  // ⌘/Ctrl + Enter sends from anywhere in the form.
  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      e.currentTarget.requestSubmit()
    }
  }

  const reset = () => {
    focusOnFormMount.current = true
    setAnnounce('')
    clearForNewMessage()
  }

  // After "Send another": bring the fresh form into view and land focus on the topic chips.
  const onFormEntered = () => {
    if (!focusOnFormMount.current) return
    focusOnFormMount.current = false
    const panel = panelRef.current
    if (panel && panel.getBoundingClientRect().top < NAV_OFFSET) scrollToTarget(panel, { offset: -NAV_OFFSET - 24 })
    formRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus({ preventScroll: true })
  }

  /* ---------------- derived ---------------- */

  const needsBudget = topicNeedsBudget(topic)
  const checks = [true, values.name.trim() !== '', EMAIL_RE.test(values.email.trim()), values.message.trim().length >= MESSAGE_MIN]
  const level = checks.filter(Boolean).length
  const ready = level === checks.length
  const viaMail = contactDelivery() === 'mailto'

  return (
    <motion.div
      ref={panelRef}
      variants={panelVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.08 }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn('relative', className)}
    >
      {/* outer aura — crossfades to a new tint with each topic, so the console "tunes" to the lane you pick */}
      <span aria-hidden className="pointer-events-none absolute -inset-x-6 -inset-y-10">
        <AnimatePresence initial={false}>
          <motion.span
            key={topic}
            className={cn('absolute inset-0', topicMeta[topic].aura)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        </AnimatePresence>
      </span>
      <PanelCorners />

      <ChamferFrame
        cut={28}
        className="overflow-hidden bg-[linear-gradient(160deg,rgba(24,34,64,0.92),rgba(10,15,32,0.95)_55%,rgba(7,11,23,0.97))] lg:bg-[linear-gradient(160deg,rgba(24,34,64,0.86),rgba(10,15,32,0.9)_55%,rgba(7,11,23,0.94))]"
        borderClassName="bg-[linear-gradient(155deg,rgba(125,185,255,0.5),rgba(255,255,255,0.1)_30%,rgba(255,255,255,0.05)_65%,rgba(46,230,255,0.35))]"
      >
        {/* top sheen + cursor spotlight + boot scan */}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.05] to-transparent" />
        {fine && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 -mt-[280px] -ml-[280px] size-[560px] bg-[radial-gradient(closest-side,rgba(46,230,255,0.085),transparent)]"
            style={{ x: spotX, y: spotY, opacity: spotOpacity }}
          />
        )}
        <motion.span aria-hidden variants={scanVariants} className="pointer-events-none absolute inset-0">
          <span className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-cyan/[0.07]" />
          <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan/70 to-transparent" />
        </motion.span>

        <div className="relative">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: 16, transition: { duration: 0.3 } }}>
                <SuccessPanel via={sent.via} payload={sent.payload} onReset={reset} />
              </motion.div>
            ) : (
              <motion.form
                key="form"
                ref={formRef}
                noValidate
                onSubmit={onSubmit}
                onKeyDown={onKeyDown}
                variants={formVariants}
                initial="hidden"
                whileInView="show"
                exit="exit"
                viewport={{ once: true, amount: 0.05 }}
                onAnimationComplete={(def) => {
                  if (def === 'show') onFormEntered()
                }}
                aria-label="Contact Hizarc Games"
                className="p-5 sm:p-8 xl:p-10"
              >
                {/* console header */}
                <motion.div variants={rowVariants} className="flex items-center justify-between gap-4 border-b border-line pb-5">
                  <p className={cn(hud, 'flex min-w-0 items-center gap-2.5 text-snow')}>
                    <span className="relative flex size-2 shrink-0" aria-hidden>
                      <span className="absolute inset-0 animate-ping rounded-full bg-volt/60" />
                      <span className="relative size-2 rounded-full bg-volt" />
                    </span>
                    <span className="truncate">Channel open</span>
                  </p>
                  <SignalMeter level={level} total={checks.length} />
                </motion.div>

                {/* 01 — topic */}
                <motion.div variants={rowVariants} className="mt-7">
                  <StepLabel index="01" id={ids.topicLabel}>
                    What's it about?
                  </StepLabel>
                  <TopicPicker value={topic} onChange={changeTopic} labelledBy={ids.topicLabel} describedBy={ids.topicBlurb} pulse={pulse} />
                  {/* Reserve three lines on the narrowest phones, two elsewhere, so swapping topics never jolts the fields below. */}
                  <div id={ids.topicBlurb} className="mt-3.5 min-h-[3.9rem] text-[0.88rem] leading-snug text-mist min-[380px]:min-h-[2.6rem]">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        key={topic}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: EASE_OUT }}
                        className="flex gap-2"
                      >
                        <span aria-hidden className="font-mono text-cyan">
                          →
                        </span>
                        <span>{topicMeta[topic].blurb}</span>
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* 02 — who */}
                <motion.div variants={rowVariants} className="mt-8">
                  <StepLabel index="02">Who's asking?</StepLabel>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      ref={nameRef}
                      id={ids.name}
                      name="name"
                      label="Your name"
                      value={values.name}
                      onValueChange={setField('name')}
                      onBlur={blurField('name')}
                      error={errors.name}
                      required
                      autoComplete="name"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      maxLength={120}
                    />
                    <TextField
                      ref={emailRef}
                      id={ids.email}
                      name="email"
                      type="email"
                      label="Email"
                      value={values.email}
                      onValueChange={setField('email')}
                      onBlur={blurField('email')}
                      error={errors.email}
                      required
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      enterKeyHint="next"
                      maxLength={254}
                    />
                    <TextField
                      id={ids.company}
                      name="company"
                      label="Company / studio"
                      value={values.company}
                      onValueChange={setField('company')}
                      optional
                      autoComplete="organization"
                      enterKeyHint="next"
                      maxLength={160}
                      className="sm:col-span-2"
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {needsBudget && (
                      <motion.div
                        key="budget"
                        initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                        animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                        exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                        transition={{ duration: 0.45, ease: EASE_OUT }}
                      >
                        <div className="pt-4">
                          <SelectField
                            id={ids.budget}
                            name="budget"
                            label="Budget range"
                            value={values.budget}
                            onValueChange={setField('budget')}
                            options={budgetRanges}
                            placeholder="Select a range"
                            optional
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* 03 — message */}
                <motion.div variants={rowVariants} className="mt-8">
                  <StepLabel index="03">The brief</StepLabel>
                  <TextAreaField
                    ref={messageRef}
                    id={ids.message}
                    name="message"
                    label="Message"
                    value={values.message}
                    onValueChange={setField('message')}
                    onBlur={blurField('message')}
                    error={errors.message}
                    required
                    minLength={MESSAGE_MIN}
                    maxLength={MESSAGE_MAX}
                    placeholder={topicMeta[topic].prompt}
                  />
                </motion.div>

                {/* honeypot — invisible to people and assistive tech, irresistible to bots.
                    The ignore flags keep password managers out of it, and submit ignores any value the browser
                    itself autofilled (see isAutofilled), so a real visitor's message is never mistaken for a bot's. */}
                <div aria-hidden className="pointer-events-none absolute size-px overflow-hidden opacity-0 [clip-path:inset(50%)]">
                  <label htmlFor={ids.honeypot}>Company website</label>
                  <input
                    ref={honeypotRef}
                    id={ids.honeypot}
                    type="text"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                    defaultValue=""
                    data-1p-ignore
                    data-lpignore="true"
                    data-bwignore
                    data-form-type="other"
                  />
                </div>

                {/* delivery error */}
                <AnimatePresence initial={false}>
                  {status === 'error' && sendError && (
                    <motion.div
                      key="send-error"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE_OUT }}
                      className="overflow-hidden"
                    >
                      <ChamferFrame cut={10} wrapperClassName="mt-7" className="flex gap-3 bg-ember/[0.09] p-4" borderClassName="bg-ember/50">
                        <CircleAlert className="mt-0.5 size-[18px] shrink-0 text-ember" strokeWidth={2.2} aria-hidden />
                        <div className="min-w-0 text-[0.88rem] leading-relaxed">
                          <p className="font-semibold text-snow">Your message didn't go through.</p>
                          <p className="mt-0.5 text-mist">
                            {sendError} Give it another try, or email us directly at{' '}
                            <a href={`mailto:${site.email}`} className="break-all text-snow underline decoration-ember/60 underline-offset-4 hover:text-cyan">
                              {site.email}
                            </a>
                            .
                          </p>
                        </div>
                      </ChamferFrame>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* footer: fine print + submit */}
                <motion.div variants={rowVariants} className="mt-8 flex flex-col-reverse gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <p className="text-[0.8rem] leading-relaxed text-mist/75 sm:max-w-[19rem]">
                    {viaMail
                      ? 'Sending opens your email app with everything pre-filled — nothing leaves until you hit send there.'
                      : 'We only use these details to reply to you. No newsletters, no spam.'}
                    {fine && (
                      <span className="mt-1.5 block font-mono text-[0.66rem] tracking-[0.12em] text-haze/80 uppercase">
                        <kbd className="rounded-sm bg-white/[0.06] px-1.5 py-0.5 font-mono text-mist ring-1 ring-white/10">{isMac ? '⌘' : 'Ctrl'}</kbd>
                        {' + '}
                        <kbd className="rounded-sm bg-white/[0.06] px-1.5 py-0.5 font-mono text-mist ring-1 ring-white/10">Enter</kbd> to send
                      </span>
                    )}
                  </p>
                  <SubmitButton ref={submitRef} status={status} shakeKey={shakeKey} ready={ready} successLabel={sentVia === 'mailto' ? 'Opening mail' : 'Sent'} />
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </ChamferFrame>

      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </motion.div>
  )
}
