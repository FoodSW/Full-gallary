"use client"

import { ThumbsUp, ThumbsDown } from "lucide-react"
import { useEffect, useState } from "react"

type Vote = "up" | "down" | null

type ThumbsRatingProps = {
  dishId: string
  thumbsUp: number
  thumbsDown: number
  size?: number
  variant?: "light" | "dark"
  onVote?: (deltaUp: number, deltaDown: number) => void
}

const storageKey = (id: string) => `pekin-vote:${id}`

export function ThumbsRating({
  dishId,
  thumbsUp,
  thumbsDown,
  size = 16,
  variant = "dark",
  onVote,
}: ThumbsRatingProps) {
  // Remember this browser's choice. Each device may rank a dish only once, so
  // once a vote exists the buttons lock and reflect the chosen side.
  const [vote, setVote] = useState<Vote>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(dishId))
      if (stored === "up" || stored === "down") setVote(stored)
    } catch {
      // localStorage unavailable — fall back to no persisted vote
    }
  }, [dishId])

  const cast = (dir: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onVote || vote !== null) return // already ranked from this device

    setVote(dir)
    try {
      localStorage.setItem(storageKey(dishId), dir)
    } catch {
      // ignore persistence errors
    }
    onVote(dir === "up" ? 1 : 0, dir === "down" ? 1 : 0)
  }

  const rank = thumbsUp - thumbsDown
  const mutedClass = variant === "light" ? "text-white/70" : "text-muted-foreground"
  const labelClass = variant === "light" ? "text-white" : "text-foreground"
  const hasVoted = vote !== null
  // Buttons are locked when there is no handler, or once this device has voted.
  const locked = !onVote || hasVoted

  return (
    <div className="flex w-full items-center gap-1.5">
      <button
        type="button"
        disabled={locked}
        aria-label="Thumbs up"
        aria-pressed={vote === "up"}
        title={hasVoted ? "You already ranked this from this device" : undefined}
        onClick={(e) => cast("up", e)}
        className={[
          "flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors",
          locked ? "cursor-default" : "cursor-pointer hover:text-gold",
          vote === "up" ? "text-gold" : mutedClass,
        ].join(" ")}
      >
        <ThumbsUp size={size} fill={vote === "up" ? "currentColor" : "none"} />
        <span className="text-xs tabular-nums">{thumbsUp}</span>
      </button>

      <button
        type="button"
        disabled={locked}
        aria-label="Thumbs down"
        aria-pressed={vote === "down"}
        title={hasVoted ? "You already ranked this from this device" : undefined}
        onClick={(e) => cast("down", e)}
        className={[
          "flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors",
          locked ? "cursor-default" : "cursor-pointer hover:text-danger",
          vote === "down" ? "text-danger" : mutedClass,
        ].join(" ")}
      >
        <ThumbsDown size={size} fill={vote === "down" ? "currentColor" : "none"} />
        <span className="text-xs tabular-nums">{thumbsDown}</span>
      </button>

      <span className={`ml-auto text-xs font-semibold ${labelClass}`}>
        <span className={`tracking-wide ${mutedClass}`}>RANK </span>
        {rank}
      </span>
    </div>
  )
}
