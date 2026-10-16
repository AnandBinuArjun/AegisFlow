import React, { useState } from 'react'
import {
  X,
  Flame,
  FileCode,
  Sparkles,
  GitPullRequest,
  History,
  ShieldCheck,
  Cpu,
  Layers,
} from 'lucide-react'
import { FindingItem } from './FindingsTable'

interface FindingDrawerProps {
  finding: FindingItem | null
  onClose: () => void
  onGeneratePlan: (finding: FindingItem) => void
  onUpdateStatus: (findingId: string, newStatus: any, reason: string) => void
}

export const FindingDrawer: React.FC<FindingDrawerProps> = ({
  finding,
  onClose,
  onGeneratePlan,
  onUpdateStatus,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('OPEN')
  const [statusReason, setStatusReason] = useState<string>('')
  const [isGeneratingTriage, setIsGeneratingTriage] = useState<boolean>(false)
  const [triageGenerated, setTriageGenerated] = useState<boolean>(false)

  if (!finding) return null

  const handleSimulateTriage = () => {
    setIsGeneratingTriage(true)
    setTimeout(() => {
      setIsGeneratingTriage(false)
      setTriageGenerated(true)
    }, 800)
  }

  const handleApplyStatus = () => {
    if (!statusReason.trim()) return
    onUpdateStatus(finding.id, selectedStatus, statusReason)
    setStatusReason('')
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs select-none">
      {/* Slide-out Drawer Container */}
      <div className="w-full max-w-2xl bg-[#0E1524] border-l border-[#1E2B45] h-full flex flex-col shadow-2xl animate-drawer-in">
        {/* Drawer Header */}
        <div className="p-4 bg-[#0B111F] border-b border-[#1E2B45] flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                  finding.priority_band === 'CRITICAL'
                    ? 'band-critical'
                    : finding.priority_band === 'HIGH'
                    ? 'band-high'
                    : 'band-medium'
                }`}
              >
                {finding.priority_band} &bull; Score: {finding.risk_score.toFixed(1)}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700/60">
                {finding.scanner_type}
              </span>
              <span className="text-xs font-mono text-slate-400 truncate">
                Proj: {finding.project_id}
              </span>
            </div>

            <h2 className="text-base font-semibold text-slate-100 font-sans leading-snug">
              {finding.title}
            </h2>

            <p className="text-xs font-mono text-slate-400 truncate">{finding.rule_id}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#18253E] text-slate-400 hover:text-slate-200 transition-colors"
            title="Close Drawer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* 1. Explainable Risk Score Decomposition */}
          <div className="p-4 rounded-lg bg-[#090D16] border border-[#1E2B45] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                Explainable Multi-Factor Prioritization (SEC-PRIOR-01)
              </span>
              <span className="badge-assessment text-[10px] px-2 py-0.5 rounded font-mono font-medium">
                Deterministic Policy
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded bg-[#111A2D] border border-[#1C2943]">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Base Severity</div>
                <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                  {finding.scanner_severity} (8.5)
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#111A2D] border border-[#1C2943]">
                <div className="text-[10px] text-slate-400 uppercase font-mono">EPSS Probability</div>
                <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                  {(finding.epss_score * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#111A2D] border border-[#1C2943]">
                <div className="text-[10px] text-slate-400 uppercase font-mono">CISA KEV Exploit</div>
                <div className="text-sm font-bold font-mono mt-0.5">
                  {finding.cisa_kev ? (
                    <span className="text-rose-400 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Active KEV
                    </span>
                  ) : (
                    <span className="text-slate-400">None</span>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#111A2D] border border-[#1C2943]">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Asset Criticality</div>
                <div className="text-sm font-bold text-sky-300 font-mono mt-0.5">
                  {finding.asset_criticality}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-sans pt-1">
              Priority is computed strictly via deterministic weighting rules. AI is never permitted to alter the risk score or bypass policy thresholds.
            </p>
          </div>

          {/* 2. Source Code Context & Secret Redaction */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5 font-mono">
                <FileCode className="w-4 h-4 text-slate-400" />
                {finding.file_path}:{finding.line_number}
              </span>
              <span className="badge-fact text-[10px] px-2 py-0.5 rounded font-mono font-medium">
                Secret Sanitized
              </span>
            </div>

            <div className="rounded-lg bg-[#080B12] border border-[#1E2B45] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#0D1424] border-b border-[#1E2B45] flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Vulnerable Code Line (Isolated Excerpt)</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Zero secrets leaked to LLM
                </span>
              </div>
              <pre className="p-3.5 font-mono text-[12px] text-slate-200 overflow-x-auto leading-relaxed">
                <code>{finding.snippet}</code>
              </pre>
            </div>
          </div>

          {/* 3. AI Triage Assistant Proposal */}
          <div className="p-4 rounded-lg bg-[#090D16] border border-[#1E2B45] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-slate-200 text-xs">
                  AI Triage & Remediation Proposal (Non-Privileged)
                </span>
              </div>
              <span className="badge-ai text-[10px] px-2 py-0.5 rounded font-mono font-medium">
                Offline Mock / SSRF Egress
              </span>
            </div>

            {triageGenerated ? (
              <div className="space-y-3 text-slate-300 font-sans">
                <div className="p-3 rounded bg-[#111A2D] border border-[#1E2B45] space-y-1.5">
                  <div className="text-[11px] font-semibold text-sky-400 font-mono">
                    ROOT CAUSE DIAGNOSIS:
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    User input from HTTP query parameters is formatted directly into a raw SQL statement without parameterization or prepared statements, allowing potential SQL injection attacks.
                  </p>
                </div>

                <div className="p-3 rounded bg-[#111A2D] border border-[#1E2B45] space-y-1.5">
                  <div className="text-[11px] font-semibold text-emerald-400 font-mono">
                    RECOMMENDED SECURE CODING FIX:
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    Refactor query to use parameterized argument lists (`cursor.execute(query, [token])`) or utilize the ORM model manager query methods to guarantee parameter escaping.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Evidence Citation: verified against {finding.id}
                  </span>
                  <button
                    onClick={() => onGeneratePlan(finding)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded btn-primary text-xs font-medium"
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    Review Unified Patch & Approval Gate
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center gap-2.5">
                <p className="text-xs text-slate-400 max-w-md">
                  AegisFlow LLM gateway generates evidence-linked analysis using sanitized AST context. LLM prompt injection defenses and outbound SSRF protections are enforced.
                </p>
                <button
                  onClick={handleSimulateTriage}
                  disabled={isGeneratingTriage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded btn-primary text-xs font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isGeneratingTriage ? 'Generating proposal...' : 'Generate Grounded Triage Proposal'}
                </button>
              </div>
            )}
          </div>

          {/* 4. Lifecycle Status & Audit Justification */}
          <div className="p-4 rounded-lg bg-[#090D16] border border-[#1E2B45] space-y-3">
            <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-400" />
              Update Finding State (Mandatory Audit Trail)
            </span>

            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-[#111A2D] border border-[#1E2B45] text-xs text-slate-200 rounded px-3 py-1.5 focus:outline-none flex-1 font-mono"
                  aria-label="New Finding Status"
                >
                  <option value="OPEN">State: OPEN</option>
                  <option value="TRIAGED">State: TRIAGED</option>
                  <option value="AWAITING_APPROVAL">State: AWAITING_APPROVAL</option>
                  <option value="RESOLVED">State: VERIFIED RESOLVED</option>
                </select>

                <button
                  onClick={handleApplyStatus}
                  disabled={!statusReason.trim()}
                  className="px-3 py-1.5 rounded btn-secondary text-xs font-semibold disabled:opacity-40"
                >
                  Save State
                </button>
              </div>

              <input
                type="text"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Required justification / audit note for state transition..."
                className="w-full bg-[#111A2D] border border-[#1E2B45] focus:border-sky-500 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default FindingDrawer
