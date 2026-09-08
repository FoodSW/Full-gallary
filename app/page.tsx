"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { HeroBanner } from "@/components/gallery/hero-banner"
import { IntroCard } from "@/components/gallery/intro-card"
import { VesselDetail } from "@/components/gallery/vessel-detail"
import { TopWorst } from "@/components/gallery/top-worst"
import { Lightbox } from "@/components/gallery/lightbox"
import type { Dish } from "@/lib/gallery-data"
import { extremeDishes, useGalleryStore } from "@/lib/gallery-store"

export default function GalleryPage() {
  const { vessels, rateDish } = useGalleryStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ dishes: Dish[]; index: number } | null>(null)

  const selectedVessel = useMemo(
    () => (selected ? vessels.find((v) => v.name === selected) ?? null : null),
    [selected, vessels],
  )

  const { lowest, highest } = useMemo(() => extremeDishes(vessels), [vessels])

  // Map dish id -> current dish so the lightbox reflects live ratings from the store.
  const dishById = useMemo(() => {
    const map = new Map<string, Dish>()
    for (const v of vessels) for (const d of v.dishes) map.set(d.id, d)
    return map
  }, [vessels])

  const openLightbox = (dishes: Dish[], index: number) => {
    if (index < 0) return
    setLightbox({ dishes, index })
  }

  const lightboxDishes = lightbox
    ? lightbox.dishes.map((d) => dishById.get(d.id) ?? d)
    : []

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
        <section className="overflow-hidden rounded-md border-2 border-gold">
          <HeroBanner />
          <IntroCard
            vessels={vessels}
            selected={selected}
            onSelect={(name) => setSelected((cur) => (cur === name ? null : name))}
          />
        </section>

        {selectedVessel && (
          <VesselDetail
            vessel={selectedVessel}
            onHide={() => setSelected(null)}
            onOpenPhoto={openLightbox}
            onRate={rateDish}
          />
        )}

        <TopWorst lowest={lowest} highest={highest} onOpen={openLightbox} />

        <footer className="flex items-center justify-center pb-4 pt-2">
          <Link
            href="/admin"
            className="text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold"
          >
            Crew Admin
          </Link>
        </footer>
      </div>

      {lightbox && (
        <Lightbox
          dishes={lightboxDishes}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index) => setLightbox((lb) => (lb ? { ...lb, index } : lb))}
          onRate={rateDish}
        />
      )}
    </main>
  )
}
