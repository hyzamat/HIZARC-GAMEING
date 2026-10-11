/**
 * Keyframes + `html.hz-hyper` rules for the fx components. index.css is a
 * shared file, so these are injected once as a single <style> tag instead.
 * Every loop animates transform/opacity only (compositor friendly), and the
 * global reduced-motion rule in index.css neutralises them automatically.
 */

const STYLE_ID = 'hz-fx-styles'

const CSS = /* css */ `
@keyframes hz-eq {
  0%, 100% { transform: scaleY(0.28); }
  22% { transform: scaleY(1); }
  46% { transform: scaleY(0.46); }
  72% { transform: scaleY(0.86); }
}
.hz-eq-bar {
  transform-origin: 50% 50%;
  animation: hz-eq var(--hz-eq-dur, 0.9s) ease-in-out var(--hz-eq-delay, 0s) infinite;
}
.hz-eq-paused .hz-eq-bar { animation-play-state: paused; }

@keyframes hz-flow-x { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-50%, 0, 0); } }
@keyframes hz-flow-y { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(0, -50%, 0); } }
@keyframes hz-hyper-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes hz-hyper-scan { from { transform: translate3d(0, -40vh, 0); } to { transform: translate3d(0, 120vh, 0); } }
@keyframes hz-blink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0.25; } }
/* Individual translate/scale so it composes with an element's own transform (e.g. skew). */
@keyframes hz-key-pop { from { translate: 0 3px; scale: 0.7; } to { translate: 0 0; scale: 1; } }

.hz-flow-x { animation: hz-flow-x 2.4s linear infinite; }
.hz-flow-y { animation: hz-flow-y 2.4s linear infinite; }
.hz-flow-rev { animation-direction: reverse; }
.hz-hyper-pulse { animation: hz-hyper-pulse 1.6s ease-in-out infinite; }
.hz-hyper-scan { animation: hz-hyper-scan 3.2s linear infinite; }
.hz-blink { animation: hz-blink 1s steps(1, end) infinite; }
.hz-key-pop { animation: hz-key-pop 0.28s cubic-bezier(0.16, 1, 0.3, 1) both; }

/* Brand rainbow used by the hyper-mode frame (doubled so a -50% shift loops seamlessly). */
.hz-hyper-gradient-x {
  background-image: linear-gradient(90deg, #7c5cff, #0a7cff, #2ee6ff, #d7ff3a, #7c5cff, #0a7cff, #2ee6ff, #d7ff3a, #7c5cff);
}
.hz-hyper-gradient-y {
  background-image: linear-gradient(180deg, #7c5cff, #0a7cff, #2ee6ff, #d7ff3a, #7c5cff, #0a7cff, #2ee6ff, #d7ff3a, #7c5cff);
}

/* Mobile Konami trigger: rapid taps must not select text or zoom. */
[data-konami-tap] { -webkit-user-select: none; user-select: none; touch-action: manipulation; }

/* Hyper mode: small, safe, global accents only — never layout. */
html.hz-hyper ::selection { background: #d7ff3a; color: #03050c; }
html.hz-hyper :focus-visible { outline-color: #d7ff3a; }
`

let injected = false

/** Inject the fx stylesheet once (idempotent, safe to call from any effect). */
export function ensureFxStyles() {
  if (injected || typeof document === 'undefined') return
  injected = true
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = CSS
  document.head.appendChild(el)
}
