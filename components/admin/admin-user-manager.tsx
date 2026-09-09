"use client"

import { useState } from "react"
import useSWR from "swr"
import { CheckCircle2, Loader2, Shield, ShieldAlert, Trash2, UserCog, UserPlus, Users } from "lucide-react"
import { listAdminUsers, addAdminUser, deleteAdminUser } from "@/app/actions/gallery"
import type { AdminRole } from "@/lib/gallery-data"

type AdminUserManagerProps = {
  currentUsername: string
}

const ROLE_LABEL: Record<AdminRole, string> = {
  administrator: "Administrator",
  manager: "Group manager",
}

export function AdminUserManager({ currentUsername }: AdminUserManagerProps) {
  const { data: users = [], isLoading, mutate } = useSWR("admin-users", listAdminUsers)

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<AdminRole>("manager")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    const result = await addAdminUser(username, password, role)
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? "Could not add user.")
      return
    }
    setSuccess(`${username.trim()} added as ${ROLE_LABEL[role].toLowerCase()}.`)
    setUsername("")
    setPassword("")
    setRole("manager")
    mutate()
  }

  const remove = async (id: string) => {
    setConfirmDelete(null)
    await deleteAdminUser(id)
    mutate()
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Users size={18} className="text-gold" aria-hidden />
        <h2 className="text-base font-semibold text-card-foreground">Team access</h2>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        Add administrators or group managers who can sign in to this panel. Administrators can manage
        the team; group managers can manage vessels and galley photos.
      </p>

      {/* Add form */}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="new-admin-user" className="text-sm font-medium text-card-foreground">
            Username
          </label>
          <input
            id="new-admin-user"
            type="text"
            autoComplete="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="new-admin-pass" className="text-sm font-medium text-card-foreground">
            Password
          </label>
          <input
            id="new-admin-pass"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="new-admin-role" className="text-sm font-medium text-card-foreground">
            Role
          </label>
          <select
            id="new-admin-role"
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
          >
            <option value="manager">Group manager</option>
            <option value="administrator">Administrator</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-gold-dark disabled:opacity-60"
        >
          {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <UserPlus size={15} aria-hidden />}
          Add
        </button>
      </form>

      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-danger" role="alert">
          <ShieldAlert size={15} aria-hidden />
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 flex items-center gap-2 text-sm text-green-500" role="status">
          <CheckCircle2 size={15} aria-hidden />
          {success}
        </p>
      )}

      {/* Team list */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between rounded-md border border-gold/40 bg-gold/5 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Shield size={16} className="text-gold" aria-hidden />
            <span className="text-sm font-medium text-card-foreground">{currentUsername}</span>
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
              Primary administrator
            </span>
          </div>
          <span className="text-xs text-muted-foreground">You</span>
        </div>

        {isLoading ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">Loading team…</p>
        ) : users.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            No additional team members yet.
          </p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                {user.role === "administrator" ? (
                  <Shield size={16} className="text-gold" aria-hidden />
                ) : (
                  <UserCog size={16} className="text-muted-foreground" aria-hidden />
                )}
                <span className="text-sm font-medium text-card-foreground">{user.username}</span>
                <span
                  className={
                    user.role === "administrator"
                      ? "rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold"
                      : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
              {confirmDelete === user.id ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => remove(user.id)}
                    className="rounded-md bg-danger px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(user.id)}
                  aria-label={`Remove ${user.username}`}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-danger hover:text-danger"
                >
                  <Trash2 size={14} aria-hidden />
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
