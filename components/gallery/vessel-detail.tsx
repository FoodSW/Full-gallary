"use client"

import Image from "next/image"
import { ChevronDown, ChevronRight, EyeOff, Star } from "lucide-react"
import { useMemo, useState } from "react"
import type { Dish, Vessel } from "@/lib/gallery-data"
import { groupDishes, MONTH_NAMES } from "@/lib/gallery-data"
import { PhotoCard } from "./photo-card"

type VesselDetailProps = {
  vessel: Vessel
  onHide: () => void
  onOpenPhoto: (dishes: Dish[], index: number) => void
  onRate: (dishId: string, value: number) => void
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

export function VesselDetail({ vessel, onHide, onOpenPhoto, onRate }: VesselDetailProps) {
  const years = useMemo(() => groupDishes(vessel.dishes), [vessel])
  const orderedDishes = useMemo(
    () => years.flatMap((y) => y.months.flatMap((m) => m.days.flatMap((d) => d.dishes))),
    [years],
  )

  const [openYears, setOpenYears] = useState<Set<number>>(new Set())
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set())
  const [openDays, setOpenDays] = useState<Set<string>>(new Set())

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
        <span className="inline-flex items-center gap-1 rounded-full border border-gold/50 px-3 py-1 text-sm font-semibold">
          <Star size={14} className="text-gold" fill="currentColor" />
          {vessel.rating.toFixed(1)}
        </span>
        <h2 className="mt-2 text-2xl font-bold">{vessel.name}</h2>
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
                                          onRate={(value) => onRate(dish.id, value)}
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
