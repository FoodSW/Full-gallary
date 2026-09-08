"use client"

import { useState } from "react"
import { CheckCircle2, KeyRound, Loader2, ShieldAlert } from "lucide-react"
import { updateAdminCredentials } from "@/app/actions/gallery"

type ChangeCredentialsProps = {
  currentUsername: string
  onSuccess: (newUsername: string) => void
}

export function ChangeCredentials({ currentUsername, onSuccess }: ChangeCredentialsProps) {
  const [open, setOpen]             = useState(false)
  const [newUsername, setNewUsername] = useState(currentUsername)
  const [currentPass, setCurrentPass] = useState("")
  const [newPass, setNewPass]         = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)

  const reset = () => {
    setCurrentPass("")
    setNewPass("")
    setConfirmPass("")
    setError(null)
    setSuccess(false)
  }

  const toggle = () => {
    setOpen((v) => !v)
    reset()
    setNewUsername(currentUsername)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPass && newPass !== confirmPass) {
      setError("New passwords do not match.")
      return
    }
    if (newPass && newPass.length < 6) {
      setError("New password must be at least 6 characters.")
      return
    }

    setLoading(true)
    const result = await updateAdminCredentials(currentPass, newUsername, newPass)
    setLoading(false)

    if (!result.ok) {
      setError(result.error ?? "Update failed.")
      return
    }

    setSuccess(true)
    reset()
    setOpen(false)
    onSuccess(newUsername.trim())
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
      >
        <KeyRound size={15} aria-hidden />
        Change credentials
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-gold bg-card p-6 shadow-2xl">
            <h2 className="mb-4 text-base font-semibold text-card-foreground">
              Change admin credentials
            </h2>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-card-foreground">New username</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-card-foreground">Current password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-card-foreground">
                  New password
                  <span className="ml-1 text-xs text-muted-foreground">(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
                />
              </div>

              {newPass && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-card-foreground">Confirm new password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
                  />
                </div>
              )}

              {error && (
                <p className="flex items-center gap-2 text-sm text-danger" role="alert">
                  <ShieldAlert size={15} aria-hidden />
                  {error}
                </p>
              )}

              {success && (
                <p className="flex items-center gap-2 text-sm text-green-400" role="status">
                  <CheckCircle2 size={15} aria-hidden />
                  Credentials updated successfully.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={toggle}
                  className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-gold-dark disabled:opacity-60"
                >
                  {loading && <Loader2 size={14} className="animate-spin" aria-hidden />}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
