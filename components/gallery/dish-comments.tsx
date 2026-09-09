"use client"

import { MessageSquare } from "lucide-react"
import { useEffect, useState } from "react"
import type { Comment } from "@/lib/gallery-data"

type DishCommentsProps = {
  dishId: string
  comments: Comment[]
  variant?: "light" | "dark"
  onAddComment: (body: string) => void
}

const storageKey = (id: string) => `pekin-commented:${id}`

export function DishComments({ dishId, comments, variant = "dark", onAddComment }: DishCommentsProps) {
  const [draft, setDraft] = useState("")
  const [commented, setCommented] = useState(false)

  useEffect(() => {
    try {
      setCommented(localStorage.getItem(storageKey(dishId)) === "1")
    } catch {
      // localStorage unavailable
    }
  }, [dishId])

  const submit = () => {
    const body = draft.trim()
    if (!body) return
    onAddComment(body)
    setDraft("")
    setCommented(true)
    try {
      localStorage.setItem(storageKey(dishId), "1")
    } catch {
      // ignore persistence errors
    }
  }

  const light = variant === "light"
  const headingClass = light ? "text-white/80" : "text-muted-foreground"
  const pillClass = light
    ? "bg-white/10 text-white"
    : "bg-gold/10 text-foreground"
  const inputClass = light
    ? "border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-white/40"
    : "border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-gold"

  const count = comments.length

  return (
    <div className="w-full space-y-2 text-left">
      <div className={`flex items-center gap-1.5 text-xs font-semibold tracking-wide ${headingClass}`}>
        <MessageSquare size={14} />
        {count} {count === 1 ? "COMMENT" : "COMMENTS"}
      </div>

      {count > 0 && (
        <ul className="space-y-1.5">
          {comments.map((c) => (
            <li key={c.id} className={`rounded-md px-2.5 py-1.5 text-sm ${pillClass}`}>
              {c.body}
            </li>
          ))}
        </ul>
      )}

      {commented && (
        <p className={`text-[11px] ${headingClass}`}>You commented on this from this device.</p>
      )}

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="Add a comment..."
        rows={2}
        className={`w-full resize-none rounded-md border px-2.5 py-1.5 text-sm outline-none transition-colors ${inputClass}`}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!draft.trim()}
        className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        Post comment
      </button>
    </div>
  )
}
