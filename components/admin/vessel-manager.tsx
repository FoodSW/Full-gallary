"use client"

import { useRef, useState } from "react"
import { Plus, Pencil, Trash2, Check, X, ChevronDown, Ship, ImageIcon, Loader2 } from "lucide-react"
import Image from "next/image"
import type { Vessel } from "@/lib/gallery-data"
import { useGalleryStore } from "@/lib/gallery-store"
import { DishManager } from "@/components/admin/dish-manager"

export function VesselManager({ vessels }: { vessels: Vessel[] }) {
  const { addVessel, renameVessel, deleteVessel, updateVesselThumbnail } = useGalleryStore()
  const [newName, setNewName] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  // Track which vessel is currently uploading its thumbnail
  const [uploadingThumb, setUploadingThumb] = useState<string | null>(null)
  const thumbInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const addNew = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    addVessel(name, "/vessel-container.png")
    setNewName("")
  }

  const startEdit = (name: string) => {
    setEditing(name)
    setEditValue(name)
  }

  const saveEdit = (oldName: string) => {
    const next = editValue.trim()
    if (next && next !== oldName) renameVessel(oldName, next)
    setEditing(null)
  }

  const handleThumbChange = async (vessel: Vessel, file: File) => {
    if (!file.type.startsWith("image/")) return
    setUploadingThumb(vessel.name)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("vesselName", vessel.name)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const json = await res.json()
      if (json.path) {
        updateVesselThumbnail(vessel.name, json.path)
      }
    } finally {
      setUploadingThumb(null)
      // Reset input so the same file can be re-selected
      const input = thumbInputRefs.current[vessel.name]
      if (input) input.value = ""
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Ship size={18} className="text-gold" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">Vessels &amp; Galley Photos</h2>
      </div>

      <form onSubmit={addNew} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New vessel name (e.g. mv Fuchow)"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-gold-dark"
        >
          <Plus size={16} aria-hidden />
          Add vessel
        </button>
      </form>

      <ul className="space-y-2">
        {vessels.map((vessel) => {
          const isOpen = expanded === vessel.name
          const isEditing = editing === vessel.name
          return (
            <li key={vessel.name} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 p-3">
                {isEditing ? (
                  <>
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-gold"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(vessel.name)}
                      aria-label="Save name"
                      className="flex size-8 items-center justify-center rounded-md bg-gold text-primary-foreground hover:bg-gold-dark"
                    >
                      <Check size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      aria-label="Cancel"
                      className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Hidden file input for thumbnail upload */}
                    <input
                      ref={(el) => { thumbInputRefs.current[vessel.name] = el }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      aria-hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleThumbChange(vessel, file)
                      }}
                    />

                    {/* Thumbnail preview + change button */}
                    <button
                      type="button"
                      onClick={() => thumbInputRefs.current[vessel.name]?.click()}
                      aria-label={`Change logo for ${vessel.name}`}
                      title="Change vessel photo / logo"
                      className="group relative flex-shrink-0 overflow-hidden rounded-md border border-border"
                      style={{ width: 40, height: 40 }}
                    >
                      <Image
                        src={vessel.thumbnail}
                        alt=""
                        fill
                        className="object-cover transition-opacity group-hover:opacity-50"
                        sizes="40px"
                      />
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        {uploadingThumb === vessel.name
                          ? <Loader2 size={16} className="animate-spin text-foreground" aria-hidden />
                          : <ImageIcon size={16} className="text-foreground" aria-hidden />
                        }
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : vessel.name)}
                      className="flex flex-1 items-center gap-3 text-left"
                      aria-expanded={isOpen}
                    >
                      <ChevronDown
                        size={18}
                        className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                      <span className="font-medium text-card-foreground">{vessel.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {vessel.dishes.length} photos · {vessel.rating.toFixed(1)}★
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(vessel.name)}
                      aria-label={`Rename ${vessel.name}`}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(vessel.name)}
                      aria-label={`Delete ${vessel.name}`}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-danger/15 hover:text-danger"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </>
                )}
              </div>

              {confirmDelete === vessel.name && (
                <div className="flex items-center justify-between gap-3 border-t border-border bg-danger/10 px-3 py-2.5">
                  <p className="text-sm text-card-foreground">
                    Delete <span className="font-semibold">{vessel.name}</span> and all its photos?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        deleteVessel(vessel.name)
                        setConfirmDelete(null)
                        if (expanded === vessel.name) setExpanded(null)
                      }}
                      className="rounded-md bg-danger px-3 py-1 text-sm font-semibold text-primary-foreground"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="rounded-md bg-muted px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {isOpen && !isEditing && <DishManager vessel={vessel} />}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
