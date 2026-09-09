"use client"

import { useEffect, useState } from "react"
import { Eye } from "lucide-react"
import type { Vessel } from "@/lib/gallery-data"

type IntroCardProps = {
  vessels: Vessel[]
  selected: string | null
  onSelect: (name: string) => void
}

/**
 * Live-ish viewer counter. There is no realtime backend, so we simulate
 * presence: a realistic base plus this viewer, drifting slightly over time so
 * the number is never frozen. Rendered client-side only to avoid hydration
 * mismatch from the random base.
 */
function useViewerCount() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    // Base pool of concurrent viewers, plus 1 for the current visitor.
    const base = 12 + Math.floor(Math.random() * 20)
    setCount(base + 1)

    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev === null) return prev
        const drift = Math.floor(Math.random() * 3) - 1 // -1, 0, or +1
        return Math.max(1, prev + drift)
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return count
}

export function IntroCard({ vessels, selected, onSelect }: IntroCardProps) {
  const viewers = useViewerCount()

  return (
    <div className="bg-intro text-intro-foreground px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <p className="leading-relaxed">
          Here are dishes from chefs cook working on the ships, and{" "}
          <span className="line-through opacity-70">poisoning</span> cooking
          meals for us. Many sailors are afraid to say something against or
          reproach the chief cook, and this gallery with anonymous reviews was
          created for this.
        </p>
        <p className="leading-relaxed opacity-90">
          Many chefs cook cooking good, but there are exceptions. Take a look -
          and make personal opinion.
        </p>
        <p className="font-semibold text-danger">
          This gallery shows real dishes on board.
        </p>

        <div className="flex items-center justify-center gap-2 pt-1 text-sm font-medium">
          <Eye size={16} aria-hidden />
          <span aria-live="polite">
            {viewers === null ? "\u2014" : `${viewers} viewers`}
          </span>
        </div>

        <p className="pt-2 font-semibold">Select vessel name</p>

        <div className="flex flex-wrap justify-center gap-3 pt-1">
          {vessels.map((vessel) => {
            const active = selected === vessel.name
            return (
              <button
                key={vessel.name}
                type="button"
                onClick={() => onSelect(vessel.name)}
                className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
                  active
                    ? "bg-gold-dark text-intro-foreground ring-2 ring-intro-foreground/40"
                    : "bg-gold text-intro-foreground hover:bg-gold-dark"
                }`}
              >
                {vessel.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
