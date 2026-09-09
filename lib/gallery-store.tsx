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
  voteDish as voteDishAction,
  resetDishRank as resetDishRankAction,
  addComment as addCommentAction,
  deleteComment as deleteCommentAction,
} from "@/app/actions/gallery"
import type { Dish, RankedDish, Vessel } from "@/lib/gallery-data"
import { dishRank } from "@/lib/gallery-data"

const SWR_KEY = "gallery-vessels"

type NewDishInput = { image: string; date: string }

type GalleryStore = {
  vessels: Vessel[]
  ready: boolean
  voteDish: (dishId: string, deltaUp: number, deltaDown: number) => void
  resetDishRank: (dishId: string) => void
  addComment: (dishId: string, body: string) => void
  deleteComment: (dishId: string, commentId: string) => void
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

  const voteDish = useCallback(
    (dishId: string, deltaUp: number, deltaDown: number) => {
      // Optimistic update first, then persist.
      globalMutate(
        SWR_KEY,
        (prev: Vessel[] = []) =>
          prev.map((v) => {
            if (!v.dishes.some((d) => d.id === dishId)) return v
            const dishes = v.dishes.map((d) => {
              if (d.id !== dishId) return d
              return {
                ...d,
                thumbsUp: Math.max(0, d.thumbsUp + deltaUp),
                thumbsDown: Math.max(0, d.thumbsDown + deltaDown),
              }
            })
            const rank = dishes.reduce((s, d) => s + dishRank(d), 0)
            return { ...v, dishes, rank }
          }),
        { revalidate: false },
      )
      voteDishAction(dishId, deltaUp, deltaDown).then(revalidate)
    },
    [revalidate],
  )

  const resetDishRank = useCallback(
    (dishId: string) => {
      globalMutate(
        SWR_KEY,
        (prev: Vessel[] = []) =>
          prev.map((v) => {
            if (!v.dishes.some((d) => d.id === dishId)) return v
            const dishes = v.dishes.map((d) =>
              d.id === dishId ? { ...d, thumbsUp: 0, thumbsDown: 0 } : d,
            )
            const rank = dishes.reduce((s, d) => s + dishRank(d), 0)
            return { ...v, dishes, rank }
          }),
        { revalidate: false },
      )
      resetDishRankAction(dishId).then(revalidate)
    },
    [revalidate],
  )

  const addComment = useCallback(
    (dishId: string, body: string) => {
      const trimmed = body.trim()
      if (!trimmed) return
      const optimistic = {
        id: `tmp-${Date.now()}`,
        body: trimmed.slice(0, 500),
        createdAt: new Date().toISOString(),
      }
      // Optimistic append, then persist and revalidate.
      globalMutate(
        SWR_KEY,
        (prev: Vessel[] = []) =>
          prev.map((v) => {
            if (!v.dishes.some((d) => d.id === dishId)) return v
            const dishes = v.dishes.map((d) =>
              d.id === dishId ? { ...d, comments: [...d.comments, optimistic] } : d,
            )
            return { ...v, dishes }
          }),
        { revalidate: false },
      )
      addCommentAction(dishId, trimmed).then(revalidate)
    },
    [revalidate],
  )

  const deleteComment = useCallback(
    (dishId: string, commentId: string) => {
      globalMutate(
        SWR_KEY,
        (prev: Vessel[] = []) =>
          prev.map((v) => {
            if (!v.dishes.some((d) => d.id === dishId)) return v
            const dishes = v.dishes.map((d) =>
              d.id === dishId
                ? { ...d, comments: d.comments.filter((c) => c.id !== commentId) }
                : d,
            )
            return { ...v, dishes }
          }),
        { revalidate: false },
      )
      deleteCommentAction(commentId).then(revalidate)
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
      voteDish,
      resetDishRank,
      addComment,
      deleteComment,
      addVessel,
      renameVessel,
      deleteVessel,
      updateVesselThumbnail,
      addDish,
      deleteDish,
      reset,
    }),
    [vessels, ready, voteDish, resetDishRank, addComment, deleteComment, addVessel, renameVessel, deleteVessel, updateVesselThumbnail, addDish, deleteDish, reset],
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
  const sorted = [...all].sort((a, b) => dishRank(a) - dishRank(b))
  return {
    // Only dishes with a negative rank (below 0) or a positive rank (above 0).
    lowest: sorted.filter((d) => dishRank(d) < 0).slice(0, 3),
    highest: [...sorted].reverse().filter((d) => dishRank(d) > 0).slice(0, 3),
  }
}
