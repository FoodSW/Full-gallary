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
  // Remember this browser's choice so the buttons reflect the active vote and a
  // second click can toggle it off or switch sides.
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
    if (!onVote) return

    let deltaUp = 0
    let deltaDown = 0
    let next: Vote

    if (vote === dir) {
      next = null
      if (dir === "up") deltaUp = -1
      else deltaDown = -1
    } else if (vote === null) {
      next = dir
      if (dir === "up") deltaUp = 1
      else deltaDown = 1
    } else {
      next = dir
      if (dir === "up") {
        deltaUp = 1
        deltaDown = -1
      } else {
        deltaUp = -1
        deltaDown = 1
      }
    }

    setVote(next)
    try {
      if (next) localStorage.setItem(storageKey(dishId), next)
      else localStorage.removeItem(storageKey(dishId))
    } catch {
      // ignore persistence errors
    }
    onVote(deltaUp, deltaDown)
  }

  const rank = thumbsUp - thumbsDown
  const mutedClass = variant === "light" ? "text-white/70" : "text-muted-foreground"
  const labelClass = variant === "light" ? "text-white" : "text-foreground"
  const disabled = !onVote

  return (
    <div className="flex w-full items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        aria-label="Thumbs up"
        aria-pressed={vote === "up"}
        onClick={(e) => cast("up", e)}
        className={[
          "flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors",
          disabled ? "cursor-default" : "cursor-pointer hover:text-gold",
          vote === "up" ? "text-gold" : mutedClass,
        ].join(" ")}
      >
        <ThumbsUp size={size} fill={vote === "up" ? "currentColor" : "none"} />
        <span className="text-xs tabular-nums">{thumbsUp}</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        aria-label="Thumbs down"
        aria-pressed={vote === "down"}
        onClick={(e) => cast("down", e)}
        className={[
          "flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors",
          disabled ? "cursor-default" : "cursor-pointer hover:text-danger",
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
