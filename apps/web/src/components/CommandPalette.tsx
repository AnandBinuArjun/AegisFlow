import React, { useState, useEffect } from 'react'
import {
  Search,
  ShieldAlert,
  GitPullRequest,
  FolderGit2,
  SlidersHorizontal,
  FileCode,
  ArrowRight,
} from 'lucide-react'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (tab: string) => void
  onSelectFinding?: (findingId: string) => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else {
          setQuery('')
          // handled by parent
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const navigationCommands = [
    { id: 'overview', title: 'Go to Overview Dashboard', icon: ShieldAlert, tab: 'overview' },
    { id: 'findings', title: 'Open Findings & Prioritization', icon: FileCode, tab: 'findings' },
    { id: 'remediation', title: 'Review Remediation Plans & Approval', icon: GitPullRequest, tab: 'remediation' },
    { id: 'projects', title: 'View Projects & Criticality Tiers', icon: FolderGit2, tab: 'projects' },
    { id: 'audit', title: 'Inspect Tamper-Evident Audit Trail', icon: SlidersHorizontal, tab: 'audit' },
  ]

  const filtered = navigationCommands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-[#0E1524] border border-[#1E2B45] rounded-xl shadow-2xl overflow-hidden animate-drawer-in">
        {/* Search Input Box */}
        <div className="p-3 bg-[#0B111F] border-b border-[#1E2B45] flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, findings, or navigate (Type to filter)..."
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[#131D31] text-[10px] font-mono text-slate-400 border border-slate-700/60">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {filtered.map((cmd) => {
            const Icon = cmd.icon
            return (
              <button
                key={cmd.id}
                onClick={() => {
                  onNavigate(cmd.tab)
                  onClose()
                }}
                className="w-full flex items-center justify-between p-2.5 rounded hover:bg-[#18253E] text-slate-300 hover:text-slate-100 text-xs transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-sky-400" />
                  <span>{cmd.title}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )
          })}
        </div>

        <div className="px-3 py-2 bg-[#090D16] border-t border-[#1E2B45] flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Use &uarr; &darr; to navigate</span>
          <span>&crarr; to select</span>
        </div>
      </div>
    </div>
  )
}
export default CommandPalette
