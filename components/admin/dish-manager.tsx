"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { ImageIcon, Loader2, MessageSquare, Plus, RotateCcw, ThumbsDown, ThumbsUp, Trash2, UploadCloud, X } from "lucide-react"
import { type Vessel } from "@/lib/gallery-data"
import { useGalleryStore } from "@/lib/gallery-store"
import exifr from "exifr"

type DishManagerProps = {
  vessel: Vessel
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function dateToISO(d: Date | undefined | null): string {
  if (!d || isNaN(d.getTime())) return todayISO()
  return d.toISOString().slice(0, 10)
}

type PendingFile = {
  /** stable key */
  key: string
  file: File
  preview: string
  date: string
  /** upload state */
  status: "idle" | "uploading" | "done" | "error"
  error?: string
}

export function DishManager({ vessel }: DishManagerProps) {
  const { addDish, deleteDish, resetDishRank, deleteComment } = useGalleryStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Which dish's moderation panel (rank + comments) is expanded.
  const [openDishId, setOpenDishId] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (arr.length === 0) return

    // Build pending items immediately with preview URLs and today as the date,
    // then update each one's date once EXIF is parsed.
    const newItems: PendingFile[] = arr.map((f) => ({
      key: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      preview: URL.createObjectURL(f),
      date: todayISO(),
      status: "idle" as const,
    }))

    setPending((prev) => [...prev, ...newItems])

    // Reset the hidden input so the same files can be re-selected
    if (fileRef.current) fileRef.current.value = ""

    // Extract EXIF dates in parallel and patch each staged item
    await Promise.all(
      newItems.map(async (item) => {
        try {
          const tags = await exifr.parse(item.file, {
            pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
          })
          const exifDate: Date | undefined =
            tags?.DateTimeOriginal ?? tags?.CreateDate ?? tags?.ModifyDate
          const date = dateToISO(exifDate instanceof Date ? exifDate : null)
          setPending((prev) =>
            prev.map((p) => (p.key === item.key ? { ...p, date } : p))
          )
        } catch {
          // No EXIF or unreadable — keep today's date, no problem
        }
      })
    )
  }

  const removeItem = (key: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.key === key)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((p) => p.key !== key)
    })
  }

  const updateItem = (key: string, patch: Partial<Pick<PendingFile, "date">>) => {
    setPending((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...patch } : p))
    )
  }

  // -------------------------------------------------------------------------
  // Drag-and-drop
  // -------------------------------------------------------------------------

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }
  const handleDragLeave = () => setDragging(false)
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  // -------------------------------------------------------------------------
  // Submit all pending
  // -------------------------------------------------------------------------

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pending.length === 0) return

    setSubmitting(true)

    // Upload all files in parallel, then call addDish for each success
    await Promise.all(
      pending.map(async (item) => {
        setPending((prev) =>
          prev.map((p) => (p.key === item.key ? { ...p, status: "uploading" } : p))
        )
        try {
          const form = new FormData()
          form.append("file", item.file)
          form.append("vesselName", vessel.name)

          const res = await fetch("/api/upload", { method: "POST", body: form })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error ?? "Upload failed")
          }
          const { path: imagePath } = await res.json()

          await addDish(vessel.name, {
            image: imagePath,
            date: new Date(item.date).toISOString(),
          })

          setPending((prev) =>
            prev.map((p) => (p.key === item.key ? { ...p, status: "done" } : p))
          )
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Upload failed"
          setPending((prev) =>
            prev.map((p) =>
              p.key === item.key ? { ...p, status: "error", error: msg } : p
            )
          )
        }
      })
    )

    // Remove successfully uploaded items
    setPending((prev) => prev.filter((p) => p.status !== "done"))
    setSubmitting(false)
  }

  const existingSorted = [...vessel.dishes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // The dish whose moderation panel is open (kept in sync with store updates).
  const openDish = openDishId ? vessel.dishes.find((d) => d.id === openDishId) ?? null : null

  const anyPending = pending.length > 0
  const allUploaded = pending.every((p) => p.status === "done")

  return (
    <div className="space-y-4 border-t border-border bg-background/40 p-4">
      <form onSubmit={submit} className="space-y-4">

        {/* ── Drop zone ─────────────────────────────────────────────────── */}
        <label
          htmlFor={`file-${vessel.name}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-5 text-sm transition-colors",
            dragging
              ? "border-gold bg-gold/10 text-foreground"
              : "border-border bg-card/50 text-muted-foreground hover:border-gold hover:text-foreground",
          ].join(" ")}
        >
          <UploadCloud size={30} aria-hidden />
          <span className="text-center font-medium leading-snug">
            Click or drag &amp; drop photos here
          </span>
          <span className="text-xs opacity-60">
            Multiple files supported — JPG, PNG, WEBP
          </span>
          <input
            ref={fileRef}
            id={`file-${vessel.name}`}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => addFiles(e.target.files ?? [])}
          />
        </label>

        {/* ── Staged queue ──────────────────────────────────────────────── */}
        {anyPending && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {pending.length} photo{pending.length > 1 ? "s" : ""} staged — set date, then click Upload
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pending.map((item) => (
                <div
                  key={item.key}
                  className={[
                    "relative flex gap-3 rounded-md border p-2",
                    item.status === "error"
                      ? "border-danger bg-danger/10"
                      : item.status === "uploading"
                      ? "border-gold/40 bg-card/60"
                      : "border-border bg-card/60",
                  ].join(" ")}
                >
                  {/* Thumbnail */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.preview}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                    {item.status === "uploading" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <Loader2 size={20} className="animate-spin text-gold" aria-hidden />
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex flex-1 flex-col justify-between gap-1.5">
                    <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                      <ImageIcon size={11} aria-hidden />
                      {item.file.name}
                    </p>
                    <div className="space-y-0.5">
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        Date
                        <span className="opacity-50" title="Auto-filled from photo EXIF data">(EXIF)</span>
                      </label>
                      <input
                        type="date"
                        value={item.date}
                        disabled={item.status === "uploading"}
                        onChange={(e) => updateItem(item.key, { date: e.target.value })}
                        className="rounded border border-input bg-background px-1.5 py-1 text-xs text-foreground outline-none focus:border-gold disabled:opacity-50"
                      />
                    </div>
                    {item.status === "error" && (
                      <p className="text-[11px] text-danger">{item.error}</p>
                    )}
                  </div>

                  {/* Remove button */}
                  {item.status !== "uploading" && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      aria-label="Remove"
                      className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-card text-muted-foreground hover:bg-danger hover:text-foreground"
                    >
                      <X size={12} aria-hidden />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Upload button */}
            <button
              type="submit"
              disabled={submitting || allUploaded}
              className="flex items-center gap-1.5 rounded-md bg-gold px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-gold-dark disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" aria-hidden />
                  Uploading…
                </>
              ) : (
                <>
                  <Plus size={15} aria-hidden />
                  Upload {pending.length} photo{pending.length > 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {/* ── Existing photo grid ───────────────────────────────────────────── */}
      {existingSorted.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No photos yet. Upload the first galley photo above.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {existingSorted.map((dish) => {
            const isOpen = openDishId === dish.id
            return (
              <div
                key={dish.id}
                className={[
                  "group relative overflow-hidden rounded-md border transition-colors",
                  isOpen ? "border-gold ring-2 ring-gold/40" : "border-border",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => setOpenDishId(isOpen ? null : dish.id)}
                  className="block w-full text-left"
                  aria-label="Moderate this photo"
                  aria-expanded={isOpen}
                >
                  <span className="relative block aspect-square">
                    <Image
                      src={dish.image || "/placeholder.svg"}
                      alt="Galley dish"
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </span>
                  <span className="flex items-center justify-between px-1.5 py-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {dish.comments.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MessageSquare size={10} aria-hidden />
                          {dish.comments.length}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-gold">
                      {dish.thumbsUp - dish.thumbsDown > 0 ? "+" : ""}
                      {dish.thumbsUp - dish.thumbsDown}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteDish("", dish.id)}
                  aria-label="Delete photo"
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-danger text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 size={13} aria-hidden />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Moderation panel for the selected photo ───────────────────────── */}
      {openDish && (
        <div className="space-y-4 rounded-md border border-gold/40 bg-card/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border">
                <Image
                  src={openDish.image || "/placeholder.svg"}
                  alt="Selected dish"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">Moderate photo</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(openDish.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpenDishId(null)}
              aria-label="Close moderation panel"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          {/* Rank moderation */}
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background/50 px-3 py-2.5">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <ThumbsUp size={14} className="text-gold" aria-hidden />
              {openDish.thumbsUp}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <ThumbsDown size={14} aria-hidden />
              {openDish.thumbsDown}
            </span>
            <span className="text-sm font-semibold text-gold">
              Rank {openDish.thumbsUp - openDish.thumbsDown > 0 ? "+" : ""}
              {openDish.thumbsUp - openDish.thumbsDown}
            </span>
            <button
              type="button"
              onClick={() => resetDishRank(openDish.id)}
              disabled={openDish.thumbsUp === 0 && openDish.thumbsDown === 0}
              className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={13} aria-hidden />
              Reset rank
            </button>
          </div>

          {/* Comment moderation */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageSquare size={13} aria-hidden />
              {openDish.comments.length} comment{openDish.comments.length === 1 ? "" : "s"}
            </p>
            {openDish.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments to moderate.</p>
            ) : (
              <ul className="space-y-1.5">
                {openDish.comments.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-border bg-background/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm text-card-foreground">{c.body}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteComment(openDish.id, c.id)}
                      aria-label="Delete comment"
                      className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-danger hover:text-danger"
                    >
                      <Trash2 size={13} aria-hidden />
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
