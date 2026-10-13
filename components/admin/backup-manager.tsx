"use client"

import { useRef, useState } from "react"
import { AlertTriangle, Download, Loader2, Upload } from "lucide-react"

export function BackupManager() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const downloadBackup = async () => {
    setBusy("backup")
    setMessage(null)
    setError(null)
    try {
      const response = await fetch("/api/admin/backup", { cache: "no-store" })
      if (!response.ok) throw new Error("Backup could not be created.")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `swire-gallery-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setMessage("Backup downloaded successfully.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backup failed.")
    } finally {
      setBusy(null)
    }
  }

  const restoreBackup = async (file: File) => {
    if (!window.confirm("Restore this backup? Current gallery data will be replaced.")) return
    setBusy("restore")
    setMessage(null)
    setError(null)
    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: await file.text(),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? "Restore failed.")
      setMessage("Backup restored. Reloading the admin panel…")
      window.setTimeout(() => window.location.reload(), 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.")
    } finally {
      setBusy(null)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <section className="rounded-md border border-border bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-md bg-gold/15 p-2 text-gold">
          <Download size={17} aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">Backup &amp; restore</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Export the complete gallery database, including photos and administrator accounts.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadBackup}
          disabled={busy !== null}
          className="flex items-center gap-2 rounded-md bg-gold px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "backup" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Download size={15} aria-hidden />}
          Download backup
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "restore" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Upload size={15} aria-hidden />}
          Restore backup
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void restoreBackup(file)
          }}
        />
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-muted-foreground">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden />
        <span>Restoring replaces all current gallery, account, and photo data. Download a current backup first.</span>
      </div>
      {message && <p className="mt-3 text-xs text-gold">{message}</p>}
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
    </section>
  )
}
