import { cn } from '@/lib/cn'
import { padScore } from './constants'
import { BOARD_SIZE, type ScoreEntry } from './scores'

type LeaderboardProps = {
  board: ScoreEntry[]
  /** `at` of the entry saved this visit — highlighted. */
  latest: number | null
  /** Rows share the available height (desktop column that stretches to match the cabinet). */
  stretch?: boolean
  /** Tighter rows for overlays. */
  dense?: boolean
  className?: string
}

/** Local top-5 as arcade rows. Empty slots stay visible so the layout never jumps. */
export function Leaderboard({ board, latest, stretch = false, dense = false, className }: LeaderboardProps) {
  return (
    <ol className={cn('grid', dense ? 'gap-1' : 'gap-1.5', stretch && 'flex-1 grid-rows-5', className)} aria-label="Local top five scores">
      {Array.from({ length: BOARD_SIZE }, (_, i) => {
        const entry = board[i]
        const fresh = entry !== undefined && entry.at === latest
        return (
          <li
            key={i}
            className={cn(
              'chamfer-sm flex items-center gap-3 px-3 font-mono text-[0.72rem] tracking-[0.14em] uppercase',
              dense ? 'min-h-7' : 'min-h-8',
              fresh ? 'bg-volt/15 text-volt' : 'bg-white/[0.04] text-mist',
            )}
          >
            <span className={cn('w-5', fresh ? 'text-volt' : 'text-haze')}>{String(i + 1).padStart(2, '0')}</span>
            <span className={cn('w-10', fresh ? 'text-volt' : entry ? 'text-snow' : 'text-haze')}>{entry ? entry.name : '---'}</span>
            <span className={cn('ml-auto tabular-nums', !entry && 'text-haze')}>{entry ? padScore(entry.score) : '------'}</span>
          </li>
        )
      })}
    </ol>
  )
}
