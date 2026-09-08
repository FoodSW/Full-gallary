"use client"

import { createContext, useCallback, useContext, useMemo } from "react"
import useSWR, { mutate as globalMutate } from "swr"
import {
  getVessels,
  addVessel as addVesselAction,
  renameVessel as renameVesselAction,
  deleteVessel as deleteVesselAction,
  updateVesselThumbnail as updateVesselThumbnailAction,
  addDish as addDishAction,
  deleteDish as deleteDishAction,
  rateDish as rateDishAction,
} from "@/app/actions/gallery"
import type { Dish, RankedDish, Vessel } from "@/lib/gallery-data"

const SWR_KEY = "gallery-vessels"

type NewDishInput = { image: string; date: string; rating: number }

type GalleryStore = {
  vessels: Vessel[]
  ready: boolean
  rateDish: (dishId: string, value: number) => void
  addVessel: (name: string, thumbnail: string) => void
  renameVessel: (oldName: string, newName: string) => void
  deleteVessel: (name: string) => void
  updateVesselThumbnail: (name: string, thumbnail: string) => void
  addDish: (vesselName: string, dish: NewDishInput) => void
  deleteDish: (vesselName: string, dishId: string) => void
  reset: () => void
}

const Ctx = createContext<GalleryStore | null>(null)

export function GalleryStoreProvider({ children }: { children: React.ReactNode }) {
  const { data: vessels = [], isLoading } = useSWR<Vessel[]>(SWR_KEY, getVessels, {
    // Re-fetch every 30 s so multiple admin tabs stay in sync.
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  })

  const ready = !isLoading

  // --- optimistic helpers --------------------------------------------------

  const revalidate = useCallback(() => globalMutate(SWR_KEY), [])

  const rateDish = useCallback(
    (dishId: string, value: number) => {
      // Optimistic update first, then persist.
      globalMutate(
        SWR_KEY,
        (prev: Vessel[] = []) =>
          prev.map((v) => {
            if (!v.dishes.some((d) => d.id === dishId)) return v
            const dishes = v.dishes.map((d) => {
              if (d.id !== dishId) return d
              const votes = d.votes + 1
              const rating = Math.round(((d.rating * d.votes + value) / votes) * 10) / 10
              return { ...d, rating, votes }
            })
            const rating =
              Math.round((dishes.reduce((s, d) => s + d.rating, 0) / dishes.length) * 10) / 10
            return { ...v, dishes, rating }
          }),
        { revalidate: false },
      )
      rateDishAction(dishId, value).then(revalidate)
    },
    [revalidate],
  )

  const addVessel = useCallback(
    (name: string, _thumbnail: string) => {
      addVesselAction(name).then(revalidate)
    },
    [revalidate],
  )

  const renameVessel = useCallback(
    (oldName: string, newName: string) => {
      renameVesselAction(oldName, newName).then(revalidate)
    },
    [revalidate],
  )

  const deleteVessel = useCallback(
    (name: string) => {
      deleteVesselAction(name).then(revalidate)
    },
    [revalidate],
  )

  const updateVesselThumbnail = useCallback(
    (name: string, thumbnail: string) => {
      updateVesselThumbnailAction(name, thumbnail).then(revalidate)
    },
    [revalidate],
  )

  const addDish = useCallback(
    (vesselName: string, dish: NewDishInput) => {
      addDishAction(vesselName, dish).then(revalidate)
    },
    [revalidate],
  )

  const deleteDish = useCallback(
    (_vesselName: string, dishId: string) => {
      deleteDishAction(dishId).then(revalidate)
    },
    [revalidate],
  )

  // Reset is no longer meaningful with a real DB; just revalidate.
  const reset = useCallback(() => revalidate(), [revalidate])

  const value = useMemo<GalleryStore>(
    () => ({
      vessels,
      ready,
      rateDish,
      addVessel,
      renameVessel,
      deleteVessel,
      updateVesselThumbnail,
      addDish,
      deleteDish,
      reset,
    }),
    [vessels, ready, rateDish, addVessel, renameVessel, deleteVessel, updateVesselThumbnail, addDish, deleteDish, reset],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGalleryStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useGalleryStore must be used within GalleryStoreProvider")
  return ctx
}

export function extremeDishes(vessels: Vessel[]) {
  const all: RankedDish[] = vessels.flatMap((v) =>
    v.dishes.map((d) => ({ ...d, vessel: v.name })),
  )
  const sorted = [...all].sort((a, b) => a.rating - b.rating)
  return {
    lowest: sorted.slice(0, 3),
    highest: [...sorted].reverse().slice(0, 3),
  }
}
