"use client"

import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useCallback, useEffect } from "react"
import type { Dish } from "@/lib/gallery-data"
import { StarRating } from "./star-rating"

type LightboxProps = {
  dishes: Dish[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
  onRate: (dishId: string, value: number) => void
}

function formatLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function Lightbox({ dishes, index, onClose, onNavigate, onRate }: LightboxProps) {
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
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md">
          <Image
            src={dish.image || "/placeholder.svg"}
            alt="Dish served on board"
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-contain"
          />
        </div>
        <div className="mt-3 flex flex-col items-center gap-2 text-white">
          <p className="text-sm text-white/80">{formatLong(dish.date)}</p>
          <StarRating
            rating={dish.rating}
            votes={dish.votes}
            size={22}
            interactive
            onRate={(value) => onRate(dish.id, value)}
          />
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
