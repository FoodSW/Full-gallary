"use client"

import Image from "next/image"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import type { RankedDish } from "@/lib/gallery-data"
import { dishRank } from "@/lib/gallery-data"

type TopWorstProps = {
  lowest: RankedDish[]
  highest: RankedDish[]
  onOpen: (dishes: RankedDish[], index: number) => void
}

function RankGrid({
  dishes,
  onOpen,
}: {
  dishes: RankedDish[]
  onOpen: (index: number) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {dishes.map((dish, i) => (
        <button
          key={dish.id}
          type="button"
          onClick={() => onOpen(i)}
          className="group relative aspect-square overflow-hidden rounded-md border border-border/60"
        >
          <Image
            src={dish.image || "/placeholder.svg"}
            alt={`${dish.vessel} dish`}
            fill
            sizes="(max-width: 640px) 30vw, 200px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-left">
            <span className="flex items-center gap-1 text-xs font-semibold text-gold">
              {dishRank(dish) >= 0 ? (
                <ThumbsUp size={12} fill="currentColor" />
              ) : (
                <ThumbsDown size={12} fill="currentColor" />
              )}
              {dishRank(dish) > 0 ? `+${dishRank(dish)}` : dishRank(dish)}
            </span>
            <span className="text-[11px] text-white/90">{dish.vessel}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

export function TopWorst({ lowest, highest, onOpen }: TopWorstProps) {
  return (
    <div className="rounded-md border-2 border-gold p-4 sm:p-6">
      <h2 className="text-center text-xl font-bold text-gold">TOP and WORST dishes</h2>

      <div className="mt-6 space-y-6">
        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground">
            <ThumbsDown size={16} className="text-gold/70" />
            LOWEST RANKED
          </div>
          {lowest.length > 0 ? (
            <RankGrid dishes={lowest} onOpen={(i) => onOpen(lowest, i)} />
          ) : (
            <p className="text-sm text-muted-foreground">No dishes ranked below -1 yet.</p>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-gold">
            <ThumbsUp size={16} className="text-gold" fill="currentColor" />
            HIGHEST RANKED
          </div>
          {highest.length > 0 ? (
            <RankGrid dishes={highest} onOpen={(i) => onOpen(highest, i)} />
          ) : (
            <p className="text-sm text-muted-foreground">No dishes ranked above 1 yet.</p>
          )}
        </section>
      </div>
    </div>
  )
}
