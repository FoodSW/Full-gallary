"use client"

import Image from "next/image"
import { ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Trophy } from "lucide-react"
import { useMemo, useState } from "react"
import type { Dish, Vessel } from "@/lib/gallery-data"
import { groupDishes, dishRank, MONTH_NAMES } from "@/lib/gallery-data"
import { PhotoCard } from "./photo-card"

type VesselDetailProps = {
  vessel: Vessel
  onHide: () => void
  onOpenPhoto: (dishes: Dish[], index: number) => void
  onVote: (dishId: string, deltaUp: number, deltaDown: number) => void
}

function AccordionRow({
  open,
  onToggle,
  label,
  level,
  badge,
}: {
  open: boolean
  onToggle: () => void
  label: string
  level: 0 | 1
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 border-b border-border/40 py-2 text-left"
    >
      {open ? (
        <ChevronDown size={16} className="text-gold" />
      ) : (
        <ChevronRight size={16} className="text-gold" />
      )}
      <span
        className={
          level === 0
            ? "text-lg font-bold tracking-wide text-gold"
            : "text-sm font-semibold tracking-wide text-muted-foreground"
        }
      >
        {label}
      </span>
      <span className="ml-2 h-px flex-1 bg-border/40" />
      {badge !== undefined && (
        <span className="text-xs text-muted-foreground">{badge}</span>
      )}
    </button>
  )
}

function BestWorstGrid({
  dishes,
  onOpen,
}: {
  dishes: Dish[]
  onOpen: (index: number) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {dishes.map((dish, i) => {
        const rank = dishRank(dish)
        return (
          <button
            key={dish.id}
            type="button"
            onClick={() => onOpen(i)}
            className="group relative aspect-square overflow-hidden rounded-md border border-border/60"
          >
            <Image
              src={dish.image || "/placeholder.svg"}
              alt="Dish served on board"
              fill
              sizes="(max-width: 640px) 30vw, 160px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-left">
              <span className="flex items-center gap-1 text-xs font-semibold text-gold">
                {rank >= 0 ? (
                  <ThumbsUp size={12} fill="currentColor" />
                ) : (
                  <ThumbsDown size={12} fill="currentColor" />
                )}
                {rank > 0 ? `+${rank}` : rank}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function VesselDetail({ vessel, onHide, onOpenPhoto, onVote }: VesselDetailProps) {
  const years = useMemo(() => groupDishes(vessel.dishes), [vessel])
  const orderedDishes = useMemo(
    () => years.flatMap((y) => y.months.flatMap((m) => m.days.flatMap((d) => d.dishes))),
    [years],
  )

  const [openYears, setOpenYears] = useState<Set<number>>(new Set())
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set())
  const [openDays, setOpenDays] = useState<Set<string>>(new Set())
  const [showBestWorst, setShowBestWorst] = useState(false)

  const { best, worst } = useMemo(() => {
    const sorted = [...vessel.dishes].sort((a, b) => dishRank(b) - dishRank(a))
    return {
      best: sorted.filter((d) => dishRank(d) > 1).slice(0, 5),
      worst: sorted.slice(-5).reverse(),
    }
  }, [vessel])

  const toggle = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set)
    next.has(value) ? next.delete(value) : next.add(value)
    setter(next)
  }

  return (
    <div className="rounded-md border-2 border-gold bg-card/40 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative aspect-video w-full overflow-hidden rounded-md sm:w-1/2">
          <Image
            src={vessel.thumbnail || "/placeholder.svg"}
            alt={`${vessel.name} vessel`}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover blur-[1px]"
          />
        </div>
        <button
          type="button"
          onClick={onHide}
          className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown size={16} />
          <span>Hide</span>
        </button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{vessel.photoCount} photos</p>

      <div className="mt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 px-3 py-1 text-sm font-semibold">
          <ThumbsUp size={14} className="text-gold" fill="currentColor" />
          <span className="tracking-wide text-muted-foreground">RANK</span>
          {vessel.rank}
        </span>
        <h2 className="mt-2 text-2xl font-bold">{vessel.name}</h2>
      </div>

      {/* Best and worst dishes */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowBestWorst((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-gold-dark"
        >
          <Trophy size={16} />
          Best and worst dishes
          <ChevronDown
            size={16}
            className={`transition-transform ${showBestWorst ? "rotate-180" : ""}`}
          />
        </button>

        {showBestWorst && (
          <div className="mt-4 space-y-6 rounded-md border border-gold/40 bg-card/40 p-4">
            <section>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-gold">
                <ThumbsUp size={16} className="text-gold" fill="currentColor" />
                5 HIGHEST RANKED
              </div>
              {best.length > 0 ? (
                <BestWorstGrid dishes={best} onOpen={(i) => onOpenPhoto(best, i)} />
              ) : (
                <p className="text-sm text-muted-foreground">No dishes ranked above 1 yet.</p>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground">
                <ThumbsDown size={16} className="text-gold/70" />
                5 LOWEST RANKED
              </div>
              <BestWorstGrid dishes={worst} onOpen={(i) => onOpenPhoto(worst, i)} />
            </section>
          </div>
        )}
      </div>

      {/* Timeline accordions */}
      <div className="mt-6">
        {years.map((yearGroup) => {
          const yearOpen = openYears.has(yearGroup.year)
          return (
            <div key={yearGroup.year}>
              <AccordionRow
                open={yearOpen}
                onToggle={() => toggle(openYears, yearGroup.year, setOpenYears)}
                label={String(yearGroup.year)}
                level={0}
              />
              {yearOpen && (
                <div className="pl-4">
                  {yearGroup.months.map((monthGroup) => {
                    const monthKey = `${yearGroup.year}-${monthGroup.month}`
                    const monthOpen = openMonths.has(monthKey)
                    return (
                      <div key={monthKey}>
                        <AccordionRow
                          open={monthOpen}
                          onToggle={() => toggle(openMonths, monthKey, setOpenMonths)}
                          label={MONTH_NAMES[monthGroup.month]}
                          level={1}
                        />
                        {monthOpen && (
                          <div className="pl-4">
                            {monthGroup.days.map((dayGroup) => {
                              const dayKey = `${monthKey}-${dayGroup.day}`
                              const dayOpen = openDays.has(dayKey)
                              return (
                                <div key={dayKey}>
                                  <button
                                    type="button"
                                    onClick={() => toggle(openDays, dayKey, setOpenDays)}
                                    className="flex w-full items-center gap-2 border-b border-border/30 py-2 text-left"
                                  >
                                    {dayOpen ? (
                                      <ChevronDown size={14} className="text-gold/70" />
                                    ) : (
                                      <ChevronRight size={14} className="text-gold/70" />
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                      {dayGroup.label}
                                    </span>
                                    <span className="ml-2 h-px flex-1 bg-border/30" />
                                    <span className="text-xs text-muted-foreground">
                                      {dayGroup.dishes.length}
                                    </span>
                                  </button>
                                  {dayOpen && (
                                    <div className="flex flex-wrap gap-3 py-3">
                                      {dayGroup.dishes.map((dish) => (
                                        <PhotoCard
                                          key={dish.id}
                                          dish={dish}
                                          onOpen={() =>
                                            onOpenPhoto(
                                              orderedDishes,
                                              orderedDishes.findIndex((d) => d.id === dish.id),
                                            )
                                          }
                                          onVote={(deltaUp, deltaDown) => onVote(dish.id, deltaUp, deltaDown)}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
