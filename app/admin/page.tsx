"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, LogOut } from "lucide-react"
import { AdminLogin } from "@/components/admin/admin-login"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { VesselManager } from "@/components/admin/vessel-manager"
import { ChangeCredentials } from "@/components/admin/change-credentials"
import { AdminUserManager } from "@/components/admin/admin-user-manager"
import { BackupManager } from "@/components/admin/backup-manager"
import { useGalleryStore } from "@/lib/gallery-store"
import type { AdminRole } from "@/lib/gallery-data"

const SESSION_KEY = "swire-admin-auth"
const SESSION_USER_KEY = "swire-admin-user"
const SESSION_ROLE_KEY = "swire-admin-role"
const SESSION_VESSELS_KEY = "swire-admin-vessels"

export default function AdminPage() {
  const { vessels, ready } = useGalleryStore()
  const [authed, setAuthed] = useState(false)
  const [username, setUsername] = useState("max")
  const [role, setRole] = useState<AdminRole>("administrator")
  const [permittedVessels, setPermittedVessels] = useState<string[]>([])

  useEffect(() => {
    const isAuthed = sessionStorage.getItem(SESSION_KEY) === "1"
    setAuthed(isAuthed)
    if (isAuthed) {
      setUsername(sessionStorage.getItem(SESSION_USER_KEY) ?? "max")
      setRole((sessionStorage.getItem(SESSION_ROLE_KEY) as AdminRole) ?? "administrator")
      try {
        setPermittedVessels(JSON.parse(sessionStorage.getItem(SESSION_VESSELS_KEY) ?? "[]"))
      } catch {
        setPermittedVessels([])
      }
    }
  }, [])

  const login = (user: string, userRole: AdminRole, vesselNames: string[]) => {
    sessionStorage.setItem(SESSION_KEY, "1")
    sessionStorage.setItem(SESSION_USER_KEY, user)
    sessionStorage.setItem(SESSION_ROLE_KEY, userRole)
    sessionStorage.setItem(SESSION_VESSELS_KEY, JSON.stringify(vesselNames))
    setAuthed(true)
    setUsername(user)
    setRole(userRole)
    setPermittedVessels(vesselNames)
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_USER_KEY)
    sessionStorage.removeItem(SESSION_ROLE_KEY)
    sessionStorage.removeItem(SESSION_VESSELS_KEY)
    setAuthed(false)
  }

  const isManager = role === "manager"
  const visibleVessels = isManager
    ? vessels.filter((v) => permittedVessels.includes(v.name))
    : vessels

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
              <span className="ml-1.5 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">
                {role === "administrator" ? "Administrator" : "Group manager"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {role === "administrator" && (
              <ChangeCredentials currentUsername={username} onSuccess={handleCredentialChange} />
            )}
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

      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
        {ready ? (
          <>
            <DashboardStats vessels={visibleVessels} />
            {role === "administrator" && (
              <>
                <AdminUserManager currentUsername={username} vessels={vessels} />
                <BackupManager />
              </>
            )}
            {isManager && (
              <p className="rounded-md border border-gold/40 bg-gold/5 px-4 py-3 text-sm text-muted-foreground">
                You can moderate {permittedVessels.length} assigned {permittedVessels.length === 1 ? "vessel" : "vessels"}. Contact an administrator to change your access.
              </p>
            )}
            <VesselManager vessels={visibleVessels} canManageVessels={!isManager} />
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Loading data…</p>
        )}
      </div>
    </main>
  )
}
