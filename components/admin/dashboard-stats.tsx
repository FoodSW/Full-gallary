"use client"

import { useMemo } from "react"
import { Ship, ImageIcon, ThumbsUp, MessageSquare } from "lucide-react"
import type { Vessel } from "@/lib/gallery-data"

type DashboardStatsProps = {
  vessels: Vessel[]
}

export function DashboardStats({ vessels }: DashboardStatsProps) {
  const stats = useMemo(() => {
    const totalPhotos = vessels.reduce((sum, v) => sum + v.dishes.length, 0)
    const totalVotes = vessels.reduce(
      (sum, v) => sum + v.dishes.reduce((s, d) => s + d.thumbsUp + d.thumbsDown, 0),
      0,
    )
    const netRank = vessels.reduce(
      (sum, v) => sum + v.dishes.reduce((s, d) => s + (d.thumbsUp - d.thumbsDown), 0),
      0,
    )
    return { totalPhotos, totalVotes, netRank }
  }, [vessels])

  const cards = [
    { label: "Vessels", value: vessels.length, icon: Ship },
    { label: "Galley photos", value: stats.totalPhotos, icon: ImageIcon },
    { label: "Net rank", value: stats.netRank, icon: ThumbsUp },
    { label: "Total votes", value: stats.totalVotes, icon: MessageSquare },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-gold/15 text-gold">
            <Icon size={20} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-semibold text-card-foreground">{value}</p>
            <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
