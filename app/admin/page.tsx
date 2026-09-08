"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, LogOut } from "lucide-react"
import { AdminLogin } from "@/components/admin/admin-login"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { VesselManager } from "@/components/admin/vessel-manager"
import { ChangeCredentials } from "@/components/admin/change-credentials"
import { useGalleryStore } from "@/lib/gallery-store"

const SESSION_KEY      = "swire-admin-auth"
const SESSION_USER_KEY = "swire-admin-user"

export default function AdminPage() {
  const { vessels, ready } = useGalleryStore()
  const [authed, setAuthed]   = useState(false)
  const [username, setUsername] = useState("max")

  useEffect(() => {
    const isAuthed = sessionStorage.getItem(SESSION_KEY) === "1"
    setAuthed(isAuthed)
    if (isAuthed) {
      setUsername(sessionStorage.getItem(SESSION_USER_KEY) ?? "max")
    }
  }, [])

  const login = (user: string) => {
    sessionStorage.setItem(SESSION_KEY, "1")
    sessionStorage.setItem(SESSION_USER_KEY, user)
    setAuthed(true)
    setUsername(user)
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_USER_KEY)
    setAuthed(false)
  }

  const handleCredentialChange = (newUsername: string) => {
    sessionStorage.setItem(SESSION_USER_KEY, newUsername)
    setUsername(newUsername)
  }

  if (!authed) {
    return <AdminLogin onSuccess={login} />
  }

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-card-foreground">Galley Admin</h1>
            <p className="text-xs text-muted-foreground">
              Swire Bulk &middot; signed in as <strong className="text-foreground">{username}</strong>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChangeCredentials
              currentUsername={username}
              onSuccess={handleCredentialChange}
            />
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={15} aria-hidden />
              <span className="hidden sm:inline">Gallery</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-danger"
            >
              <LogOut size={15} aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        {ready ? (
          <>
            <DashboardStats vessels={vessels} />
            <VesselManager vessels={vessels} />
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Loading data…</p>
        )}
      </div>
    </main>
  )
}
