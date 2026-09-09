"use client"

import Image from "next/image"
import type { Dish } from "@/lib/gallery-data"
import { ThumbsRating } from "./thumbs-rating"

type PhotoCardProps = {
  dish: Dish
  onOpen: () => void
  onVote: (deltaUp: number, deltaDown: number) => void
}

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function PhotoCard({ dish, onOpen, onVote }: PhotoCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group flex w-40 cursor-pointer flex-col overflow-hidden rounded-md border border-border/60 bg-card shadow-sm transition-transform hover:-translate-y-0.5 sm:w-44"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <Image
          src={dish.image || "/placeholder.svg"}
          alt="Dish served on board"
          fill
          sizes="150px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="space-y-1 p-2">
        <p className="text-[11px] text-muted-foreground">{formatShort(dish.date)}</p>
        <ThumbsRating
          dishId={dish.id}
          thumbsUp={dish.thumbsUp}
          thumbsDown={dish.thumbsDown}
          size={14}
          onVote={onVote}
        />
      </div>
    </div>
  )
}
