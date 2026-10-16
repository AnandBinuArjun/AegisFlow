import React from 'react'
import {
  Bell,
  Search,
  Building2,
  FolderGit2,
  UserCheck,
  RefreshCw,
} from 'lucide-react'
import { Logo } from './Logo'

interface HeaderProps {
  currentOrg: string
  setCurrentOrg: (org: any) => void
  currentProject: string
  setCurrentProject: (proj: any) => void
  activeRole: string
  setActiveRole: (role: any) => void
  onOpenSearch: () => void
  onOpenNotifications: () => void
  unreadNotificationsCount: number
  sysInfo: any
  readiness: any
  onRefreshHealth: () => void
  isRefreshingHealth: boolean
}

export const Header: React.FC<HeaderProps> = ({
  currentOrg,
  setCurrentOrg,
  currentProject,
  setCurrentProject,
  activeRole,
  setActiveRole,
  onOpenSearch,
  onOpenNotifications,
  unreadNotificationsCount,
  sysInfo,
  readiness,
  onRefreshHealth,
  isRefreshingHealth,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0E1524] border-b border-[#1E2B45] select-none">
      <div className="max-w-[1720px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand & Context Group */}
        <div className="flex items-center gap-6">
          <Logo size="md" />

          <div className="h-4 w-[1px] bg-slate-800 hidden md:block" />

          {/* Org & Project Selector Controls */}
          <div className="flex items-center gap-2">
            {/* Organization Selector */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131D31] border border-[#1E2B45] text-xs text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={currentOrg}
                onChange={(e) => setCurrentOrg(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer pr-1"
                aria-label="Select Tenant Organization"
              >
                <option value="aegisflow-primary" className="bg-[#0E1524] text-slate-200">
                  AegisFlow Primary (HQ)
                </option>
                <option value="acme-fintech" className="bg-[#0E1524] text-slate-200">
                  Acme FinTech (Isolated)
                </option>
              </select>
            </div>

            {/* Project Selector */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131D31] border border-[#1E2B45] text-xs text-slate-300">
              <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={currentProject}
                onChange={(e) => setCurrentProject(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer pr-1"
                aria-label="Filter by Target Project"
              >
                <option value="all" className="bg-[#0E1524] text-slate-200">All Projects</option>
                <option value="api-backend" className="bg-[#0E1524] text-slate-200">api-backend (Python)</option>
                <option value="web-frontend" className="bg-[#0E1524] text-slate-200">web-frontend (React)</option>
                <option value="data-pipeline" className="bg-[#0E1524] text-slate-200">data-pipeline (ETL)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Global Search Bar Trigger (Linear/Raycast style) */}
        <div className="hidden md:flex flex-1 max-w-md mx-2">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded bg-[#090D16] border border-[#1E2B45] hover:border-[#273756] text-slate-400 text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search findings, CVEs, branches, or rules...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-[#131D31] text-[10px] font-mono text-slate-400 border border-slate-700/60">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Side: Health Monitor, Role Persona, Notifications */}
        <div className="flex items-center gap-3">
          {/* System Health Telemetry Badge */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#090D16] border border-[#1E2B45] text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-medium">API: Online</span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              DB: {readiness?.database_connected ? 'Connected' : 'Syncing'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              LLM: {sysInfo?.llm_provider || 'Mock (Safe)'}
            </span>
            <button
              onClick={onRefreshHealth}
              disabled={isRefreshingHealth}
              className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
              title="Refresh System Health Status"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Active Role Persona Switcher (RBAC) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131D31] border border-[#1E2B45] text-xs">
            <UserCheck className="w-3.5 h-3.5 text-sky-400" />
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
              aria-label="Switch User Persona Role"
            >
              <option value="AppSec Analyst" className="bg-[#0E1524] text-slate-200">Role: AppSec Analyst</option>
              <option value="Developer" className="bg-[#0E1524] text-slate-200">Role: Developer</option>
              <option value="Security Manager" className="bg-[#0E1524] text-slate-200">Role: Security Manager</option>
              <option value="Auditor" className="bg-[#0E1524] text-slate-200">Role: Auditor</option>
              <option value="Org Admin" className="bg-[#0E1524] text-slate-200">Role: Org Admin</option>
            </select>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded hover:bg-[#131D31] text-slate-400 hover:text-slate-200 transition-colors"
            title="Notifications & Audit Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
