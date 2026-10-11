import { useCallback, useEffect, useRef, useState } from 'react'

/** Local-only scores: best run + a top-5 board with 3-character initials. */
export type ScoreEntry = { name: string; score: number; at: number }

export const BOARD_SIZE = 5
const BEST_KEY = 'hz-dash-best'
const BOARD_KEY = 'hz-dash-board'
const NAME_KEY = 'hz-dash-name'

/* localStorage can throw (private mode, blocked site data) — every access is guarded. */
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* the in-memory value still works for this visit */
  }
}

export function sanitizeInitials(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)
}

function readBest() {
  const n = Number(read(BEST_KEY))
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function readName() {
  return sanitizeInitials(read(NAME_KEY) ?? '')
}

function readBoard(): ScoreEntry[] {
  const raw = read(BOARD_KEY)
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    const out: ScoreEntry[] = []
    for (const item of data) {
      if (!item || typeof item !== 'object') continue
      const { name, score, at } = item as Record<string, unknown>
      if (typeof name !== 'string' || typeof score !== 'number' || !Number.isFinite(score) || score <= 0) continue
      out.push({ name: sanitizeInitials(name) || 'YOU', score: Math.floor(score), at: typeof at === 'number' ? at : 0 })
    }
    return out.sort((a, b) => b.score - a.score || a.at - b.at).slice(0, BOARD_SIZE)
  } catch {
    return []
  }
}

/**
 * Best score + local leaderboard, persisted to localStorage and kept in sync across tabs.
 * The returned functions are stable and always read the latest values (safe to call from game callbacks).
 */
export function useArcadeScores() {
  const [best, setBest] = useState(readBest)
  const [board, setBoard] = useState(readBoard)
  const [lastName, setLastName] = useState(readName)
  /** `at` of the entry saved most recently this visit (highlighted on the board). */
  const [latest, setLatest] = useState<number | null>(null)

  const bestRef = useRef(best)
  const boardRef = useRef(board)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === BEST_KEY || e.key === null) {
        const next = readBest()
        bestRef.current = next
        setBest(next)
      }
      if (e.key === BOARD_KEY || e.key === null) {
        const next = readBoard()
        boardRef.current = next
        setBoard(next)
      }
      if (e.key === NAME_KEY || e.key === null) setLastName(readName())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /** Persist a finished run's score as the new best when it beats the old one. */
  const recordRun = useCallback((score: number) => {
    if (score <= bestRef.current) return false
    bestRef.current = score
    setBest(score)
    write(BEST_KEY, String(score))
    return true
  }, [])

  /** 1-based leaderboard position this score would take, or null when it would not make the top 5. */
  const rankFor = useCallback((score: number) => {
    if (score <= 0) return null
    const list = boardRef.current
    let i = list.findIndex((entry) => score > entry.score)
    if (i === -1) i = list.length
    return i < BOARD_SIZE ? i + 1 : null
  }, [])

  const saveEntry = useCallback((rawName: string, score: number) => {
    const name = sanitizeInitials(rawName) || 'YOU'
    const entry: ScoreEntry = { name, score, at: Date.now() }
    const next = [...boardRef.current, entry].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, BOARD_SIZE)
    boardRef.current = next
    setBoard(next)
    setLastName(name)
    setLatest(entry.at)
    write(BOARD_KEY, JSON.stringify(next))
    write(NAME_KEY, name)
    return next.findIndex((e) => e === entry) + 1
  }, [])

  return { best, board, lastName, latest, recordRun, rankFor, saveEntry }
}

export type ArcadeScores = ReturnType<typeof useArcadeScores>
