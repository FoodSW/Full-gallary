"use client"

import { useState } from "react"
import { Lock, Loader2, ShieldAlert } from "lucide-react"
import { verifyAdminCredentials } from "@/app/actions/gallery"

type AdminLoginProps = {
  onSuccess: (username: string) => void
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState(false)
  const [loading, setLoading]   = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(false)
    const ok = await verifyAdminCredentials(username.trim(), password)
    setLoading(false)
    if (ok) {
      onSuccess(username.trim())
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border-2 border-gold bg-card p-8 shadow-xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-gold text-primary-foreground">
            <Lock size={24} aria-hidden />
          </div>
          <h1 className="text-xl font-semibold text-card-foreground">Crew Admin</h1>
          <p className="text-sm text-muted-foreground">
            Restricted area. Sign in to manage vessels and galley photos.
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="admin-user" className="text-sm font-medium text-card-foreground">
              Username
            </label>
            <input
              id="admin-user"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-pass" className="text-sm font-medium text-card-foreground">
              Password
            </label>
            <input
              id="admin-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
            />
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-danger" role="alert">
              <ShieldAlert size={16} aria-hidden />
              Invalid username or password.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-gold-dark disabled:opacity-60"
          >
            {loading && <Loader2 size={15} className="animate-spin" aria-hidden />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
