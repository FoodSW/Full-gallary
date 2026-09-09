"use client"

import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useCallback, useEffect } from "react"
import type { Dish } from "@/lib/gallery-data"
import { ThumbsRating } from "./thumbs-rating"
import { DishComments } from "./dish-comments"

type LightboxProps = {
  dishes: Dish[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
  onVote: (dishId: string, deltaUp: number, deltaDown: number) => void
  onAddComment: (dishId: string, body: string) => void
}

function formatLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function Lightbox({ dishes, index, onClose, onNavigate, onVote, onAddComment }: LightboxProps) {
  const dish = dishes[index]

  const prev = useCallback(
    () => onNavigate((index - 1 + dishes.length) % dishes.length),
    [index, dishes.length, onNavigate],
  )
  const next = useCallback(
    () => onNavigate((index + 1) % dishes.length),
    [index, dishes.length, onNavigate],
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose, prev, next])

  if (!dish) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={28} />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          prev()
        }}
        aria-label="Previous"
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:left-6"
      >
        <ChevronLeft size={40} />
      </button>

      <div
        className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md bg-black/40">
          <Image
            src={dish.image || "/placeholder.svg"}
            alt="Dish served on board"
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-contain"
          />
        </div>
        <div className="mt-3 flex flex-col items-center gap-3 text-white">
          <p className="text-sm text-white/80">{formatLong(dish.date)}</p>
          <div className="w-full max-w-sm">
            <ThumbsRating
              dishId={dish.id}
              thumbsUp={dish.thumbsUp}
              thumbsDown={dish.thumbsDown}
              size={22}
              variant="light"
              onVote={(deltaUp, deltaDown) => onVote(dish.id, deltaUp, deltaDown)}
            />
          </div>
          <div className="w-full max-w-sm border-t border-white/15 pt-3">
            <DishComments
              dishId={dish.id}
              comments={dish.comments}
              variant="light"
              onAddComment={(body) => onAddComment(dish.id, body)}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          next()
        }}
        aria-label="Next"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:right-6"
      >
        <ChevronRight size={40} />
      </button>
    </div>
  )
}
