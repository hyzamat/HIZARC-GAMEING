import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, CircleAlert } from 'lucide-react'
import type { ChangeEvent, HTMLAttributes, ReactNode, Ref } from 'react'
import { EASE_OUT } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'
import { ChamferFrame } from './ChamferFrame'

/* ---------------------------------------------------------------- */
/*  Shared frame: chamfered surface, floating label, focus glow,    */
/*  brand→cyan underline and animated inline error.                 */
/* ---------------------------------------------------------------- */

type FrameProps = {
  id: string
  label: string
  required?: boolean
  optional?: boolean
  error?: string
  /** Value present → label stays floated. */
  filled: boolean
  /** Distance (Tailwind translate class) of the resting label from the top. */
  restClassName?: string
  className?: string
  /** The control. Must carry the `peer` class and come first so autofill can float the label. */
  children: ReactNode
  /** Extra row rendered inside the frame under the control (e.g. a character counter). */
  footer?: ReactNode
}

const labelBase =
  'pointer-events-none absolute top-0 left-4 origin-top-left text-base leading-6 whitespace-nowrap transition-[translate,scale,color] duration-300 ease-out-expo'
const labelFloat = 'translate-y-[7px] scale-[0.76]'

export const errorId = (id: string) => `${id}-error`

/** Cut to `max` UTF-16 units without leaving half an emoji (a lone surrogate) at the end. */
function clip(value: string, max: number) {
  if (value.length <= max) return value
  const cut = value.slice(0, max)
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut
}

function FieldFrame({ id, label, required, optional, error, filled, restClassName = 'translate-y-4', className, children, footer }: FrameProps) {
  const invalid = Boolean(error)
  return (
    <div className={cn('relative', className)}>
      <div className="group/field relative">
        {/* focus glow — lives outside the clipped surface */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute -inset-x-2 -inset-y-3 opacity-0 transition-opacity duration-500 group-focus-within/field:opacity-100',
            invalid
              ? 'bg-[radial-gradient(65%_75%_at_50%_100%,rgba(255,92,57,0.22),transparent_72%)]'
              : 'bg-[radial-gradient(65%_75%_at_50%_100%,rgba(10,124,255,0.3),transparent_72%)]',
          )}
        />
        <ChamferFrame
          cut={10}
          className={cn(
            'flex flex-col bg-ink-800/80 transition-colors duration-300 group-focus-within/field:bg-ink-700/90 group-hover/field:bg-ink-700/70',
            invalid && 'bg-[rgba(255,92,57,0.06)]',
          )}
          borderClassName={cn('transition-colors duration-300', invalid ? 'bg-ember/70' : 'bg-white/[0.12] group-hover/field:bg-white/[0.2]')}
          accentClassName={cn(
            'opacity-0 transition-opacity duration-300 group-focus-within/field:opacity-100',
            invalid ? 'bg-ember' : 'bg-[linear-gradient(100deg,var(--color-brand),var(--color-brand-400)_45%,var(--color-cyan))]',
          )}
        >
          {children}
          <label
            htmlFor={id}
            className={cn(
              labelBase,
              filled
                ? labelFloat
                : cn(restClassName, 'scale-100 peer-autofill:translate-y-[7px] peer-autofill:scale-[0.76] group-focus-within/field:translate-y-[7px] group-focus-within/field:scale-[0.76]'),
              invalid ? 'text-ember' : 'text-mist group-focus-within/field:text-brand-300',
            )}
          >
            {label}
            {required && (
              <span aria-hidden className="ml-0.5 text-cyan">
                *
              </span>
            )}
            {optional && <span className="ml-1.5 text-haze">(optional)</span>}
          </label>
          {footer}
          {/* animated underline */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-500 ease-out-expo group-focus-within/field:scale-x-100',
              invalid ? 'bg-ember' : 'bg-[linear-gradient(90deg,var(--color-brand),var(--color-cyan))]',
            )}
          />
        </ChamferFrame>
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            key="error"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <motion.p
              id={errorId(id)}
              initial={{ y: -6 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="flex items-start gap-1.5 pt-2 pl-1 text-[0.82rem] leading-snug text-ember"
            >
              <CircleAlert className="mt-px size-[15px] shrink-0" strokeWidth={2.2} aria-hidden />
              <span>{error}</span>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const controlBase =
  'peer block w-full bg-transparent text-base text-snow caret-cyan outline-none focus-visible:outline-none autofill:shadow-[inset_0_0_0_1000px_#131c36] autofill:[-webkit-text-fill-color:#f4f7ff]'

const describedBy = (id: string, error?: string, extra?: string) => [error ? errorId(id) : '', extra ?? ''].filter(Boolean).join(' ') || undefined

/* ---------------------------------------------------------------- */
/*  Text input                                                      */
/* ---------------------------------------------------------------- */

type TextFieldProps = {
  id: string
  name: string
  label: string
  value: string
  onValueChange: (value: string) => void
  onBlur?: () => void
  error?: string
  required?: boolean
  optional?: boolean
  type?: 'text' | 'email'
  autoComplete?: string
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
  enterKeyHint?: HTMLAttributes<HTMLInputElement>['enterKeyHint']
  autoCapitalize?: string
  spellCheck?: boolean
  maxLength?: number
  className?: string
  ref?: Ref<HTMLInputElement>
}

export function TextField({
  id,
  name,
  label,
  value,
  onValueChange,
  onBlur,
  error,
  required,
  optional,
  type = 'text',
  autoComplete,
  inputMode,
  enterKeyHint,
  autoCapitalize,
  spellCheck,
  maxLength = 200,
  className,
  ref,
}: TextFieldProps) {
  return (
    <FieldFrame id={id} label={label} required={required} optional={optional} error={error} filled={value !== ''} className={className}>
      <input
        ref={ref}
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onValueChange(e.target.value)}
        onBlur={onBlur}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        enterKeyHint={enterKeyHint}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        maxLength={maxLength}
        className={cn(controlBase, 'h-14 px-4 pt-6 pb-2')}
      />
    </FieldFrame>
  )
}

/* ---------------------------------------------------------------- */
/*  Select (native — best UX on phones)                             */
/* ---------------------------------------------------------------- */

type SelectFieldProps = {
  id: string
  name: string
  label: string
  value: string
  onValueChange: (value: string) => void
  options: readonly string[]
  placeholder: string
  optional?: boolean
  className?: string
}

export function SelectField({ id, name, label, value, onValueChange, options, placeholder, optional, className }: SelectFieldProps) {
  return (
    <FieldFrame id={id} label={label} optional={optional} filled className={className}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onValueChange(e.target.value)}
        className={cn(controlBase, 'h-14 cursor-pointer appearance-none px-4 pt-6 pr-12 pb-2', value === '' && 'text-mist/80')}
      >
        <option value="" className="bg-ink-800 text-haze">
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-ink-800 text-snow">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 size-[18px] -translate-y-1/2 text-mist transition-transform duration-300 group-focus-within/field:rotate-180 group-focus-within/field:text-cyan"
        strokeWidth={2.2}
      />
    </FieldFrame>
  )
}

/* ---------------------------------------------------------------- */
/*  Textarea with live character counter                            */
/* ---------------------------------------------------------------- */

type TextAreaFieldProps = {
  id: string
  name: string
  label: string
  value: string
  onValueChange: (value: string) => void
  onBlur?: () => void
  error?: string
  required?: boolean
  maxLength: number
  minLength?: number
  placeholder?: string
  className?: string
  ref?: Ref<HTMLTextAreaElement>
}

export function TextAreaField({ id, name, label, value, onValueChange, onBlur, error, required, maxLength, minLength, placeholder, className, ref }: TextAreaFieldProps) {
  const count = value.length
  const ratio = count / maxLength
  const counterId = `${id}-count`
  const tooShort = minLength !== undefined && value.trim().length < minLength

  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      error={error}
      filled={value !== ''}
      restClassName="translate-y-7"
      className={className}
      footer={
        <div className="flex items-center justify-between gap-3 px-4 pb-3 font-mono text-[0.68rem] tracking-[0.08em]">
          <span className={cn('text-haze transition-opacity duration-300', minLength === undefined || !tooShort ? 'opacity-0' : 'opacity-100')} aria-hidden>
            Min {minLength} characters
          </span>
          <span id={counterId} className="flex items-center gap-2">
            {/* tiny fill gauge */}
            <span aria-hidden className="relative h-[3px] w-12 overflow-hidden bg-white/10">
              <span
                className={cn(
                  'absolute inset-y-0 left-0 w-full origin-left transition-[transform,background-color] duration-300 ease-out-expo',
                  ratio >= 1 ? 'bg-ember' : ratio > 0.9 ? 'bg-volt' : 'bg-cyan',
                )}
                style={{ transform: `scaleX(${Math.min(1, ratio)})` }}
              />
            </span>
            <span className={cn('tabular-nums', ratio >= 1 ? 'text-ember' : ratio > 0.9 ? 'text-volt' : 'text-mist/70')}>
              {count}
              <span aria-hidden>/</span>
              <span className="sr-only"> of </span>
              {maxLength}
              <span className="sr-only"> characters used</span>
            </span>
          </span>
        </div>
      }
    >
      <textarea
        ref={ref}
        id={id}
        name={name}
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onValueChange(clip(e.target.value, maxLength))}
        onBlur={onBlur}
        required={required}
        maxLength={maxLength}
        rows={6}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, counterId)}
        data-lenis-prevent
        className={cn(
          controlBase,
          'field-sizing-content max-h-[24rem] min-h-44 resize-none px-4 pt-7 pb-2 leading-6 placeholder:text-transparent focus:placeholder:text-haze',
        )}
      />
    </FieldFrame>
  )
}
