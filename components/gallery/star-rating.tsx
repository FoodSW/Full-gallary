"use client"

import { Star } from "lucide-react"
import { useState } from "react"

type StarRatingProps = {
  rating: number
  votes?: number
  size?: number
  interactive?: boolean
  onRate?: (value: number) => void
}

export function StarRating({
  rating,
  votes,
  size = 16,
  interactive = false,
  onRate,
}: StarRatingProps) {
  const [hover, setHover] = useState(0)
  const display = hover || rating

  return (
    <div className="flex items-center gap-1">
      <div
        className="flex items-center"
        onMouseLeave={() => interactive && setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = display >= i
          const half = !filled && display >= i - 0.5
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              aria-label={`Rate ${i} of 5`}
              className={interactive ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"}
              onMouseEnter={() => interactive && setHover(i)}
              onClick={(e) => {
                if (!interactive) return
                e.stopPropagation()
                onRate?.(i)
              }}
            >
              <span className="relative inline-flex">
                <Star size={size} className="text-gold/30" fill="currentColor" />
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: filled ? "100%" : half ? "50%" : "0%" }}
                >
                  <Star size={size} className="text-gold" fill="currentColor" />
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <span className="text-xs text-muted-foreground">
        {rating.toFixed(1)}
        {votes !== undefined ? ` (${votes})` : ""}
      </span>
    </div>
  )
}
