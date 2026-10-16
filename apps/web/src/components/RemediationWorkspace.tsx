import React, { useState } from 'react'
import {
  CheckCircle2,
  Lock,
  ShieldCheck,
  FileCode,
  Check,
  UserCheck,
  GitBranch,
  Terminal,
} from 'lucide-react'

export interface RemediationPlanItem {
  id: string
  finding_id: string
  title: string
  version: number
  plan_hash: string
  target_branch: string
  proposer: string
  approver: string | null
  status: 'PROPOSED' | 'APPROVED' | 'EXECUTED' | 'VERIFIED'
  original_code: string
  proposed_patch: string
  approval_reason?: string
  verification_notes?: string
}

interface RemediationWorkspaceProps {
  plans: RemediationPlanItem[]
  activeRole: string
  onApprovePlan: (planId: string, reason: string) => void
  onExecutePlan: (planId: string) => void
  onVerifyPlan: (planId: string, notes: string) => void
}

export const RemediationWorkspace: React.FC<RemediationWorkspaceProps> = ({
  plans,
  activeRole,
  onApprovePlan,
  onExecutePlan,
  onVerifyPlan,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '')
  const [approvalReason, setApprovalReason] = useState<string>('')
  const [verificationNotes] = useState<string>(
    'Automated test suite (46/46 passed). Semgrep re-scan returned 0 findings on fix branch.'
  )

  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0]

  // Role validation for separation of duties
  const isAuthor = activeRole === 'Developer' // simulate developer who proposed cannot self-approve

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Plan Navigation Sidebar (4 cols) */}
      <div className="lg:col-span-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="font-semibold text-xs text-slate-300 font-mono uppercase tracking-wider">
            Active Remediation Plans ({plans.length})
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Separation of Duties</span>
        </div>

        <div className="space-y-2">
          {plans.map((p) => {
            const isSelected = p.id === activePlan?.id
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#141F35] border-sky-500/80 shadow-md'
                    : 'bg-[#0E1524] border-[#1E2B45] hover:border-[#273756]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-slate-400">{p.id}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      p.status === 'VERIFIED'
                        ? 'badge-decision'
                        : p.status === 'APPROVED'
                        ? 'badge-fact'
                        : 'badge-assessment'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <h3 className="text-xs font-semibold text-slate-100 mt-1.5 leading-snug font-sans">
                  {p.title}
                </h3>

                <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="truncate max-w-[160px] flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-slate-500" /> {p.target_branch}
                  </span>
                  <span className="text-[10px] text-slate-500">v{p.version}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Security Rule Card */}
        <div className="p-3.5 rounded-lg bg-[#090D16] border border-[#1E2B45] text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-slate-200 font-semibold font-mono text-[11px]">
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            Remediation Governance Rules
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-400 font-sans leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className="text-sky-400 font-mono">&bull;</span>
              <strong>Rule #10:</strong> Developers cannot approve their own patch proposals.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-sky-400 font-mono">&bull;</span>
              <strong>Rule #11:</strong> Cryptographic SHA-256 hash protects patch integrity.
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-sky-400 font-mono">&bull;</span>
              <strong>Rule #14:</strong> No finding is marked fixed without independent verification.
            </li>
          </ul>
        </div>
      </div>

      {/* Plan Details & Diff Viewer (8 cols) */}
      <div className="lg:col-span-8 space-y-4">
        {activePlan ? (
          <div className="rounded-lg bg-[#0E1524] border border-[#1E2B45] overflow-hidden">
            {/* Plan Header Bar */}
            <div className="p-4 bg-[#0B111F] border-b border-[#1E2B45] space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-sky-400">
                      {activePlan.id}
                    </span>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-xs font-mono text-slate-400">
                      Linked Finding: {activePlan.finding_id}
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold text-slate-100 mt-1 font-sans">
                    {activePlan.title}
                  </h2>
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                    activePlan.status === 'VERIFIED'
                      ? 'badge-decision'
                      : activePlan.status === 'APPROVED'
                      ? 'badge-fact'
                      : 'badge-assessment'
                  }`}
                >
                  STATE: {activePlan.status}
                </span>
              </div>

              {/* Immutable Cryptographic Plan Hash & Target */}
              <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded bg-[#090D16] border border-[#1E2B45] text-slate-300">
                  Branch: <strong className="text-slate-100">{activePlan.target_branch}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-[#090D16] border border-[#1E2B45] text-slate-400 truncate max-w-sm" title={activePlan.plan_hash}>
                  Plan Hash: <code className="text-sky-400">{activePlan.plan_hash.slice(0, 24)}...</code>
                </span>
                <span>Proposer: {activePlan.proposer}</span>
              </div>
            </div>

            {/* Unified Git Diff Viewer */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <FileCode className="w-4 h-4 text-slate-400" />
                  Unified Patch Diff Inspector
                </span>
                <span>Algorithm: Strict Line-by-Line Context</span>
              </div>

              <div className="rounded border border-[#1E2B45] bg-[#080B12] font-mono text-[12px] overflow-x-auto">
                <div className="px-3 py-1.5 bg-[#0D1424] border-b border-[#1E2B45] text-[11px] text-slate-400">
                  --- a/source_code +++ b/remediated_code
                </div>

                {/* Deletions */}
                <div className="p-3 diff-del leading-relaxed">
                  <span className="text-rose-400 font-bold select-none mr-2">-</span>
                  {activePlan.original_code}
                </div>

                {/* Additions */}
                <div className="p-3 diff-add leading-relaxed border-t border-[#1E2B45]">
                  <span className="text-emerald-400 font-bold select-none mr-2">+</span>
                  {activePlan.proposed_patch}
                </div>
              </div>
            </div>

            {/* Approval & Verification Action Bar */}
            <div className="p-4 bg-[#0B111F] border-t border-[#1E2B45] space-y-4">
              {/* Approval Phase */}
              {activePlan.status === 'PROPOSED' && (
                <div className="p-3.5 rounded bg-[#0E1524] border border-[#1E2B45] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-sky-400" />
                      Two-Person Approval Gate (Separation of Duties)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Current Role: <strong>{activeRole}</strong>
                    </span>
                  </div>

                  {isAuthor ? (
                    <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      Security Policy Enforced: You are logged in as <strong>Developer (Author)</strong>. Separation of duties requires an independent Security Manager or Org Admin to approve this plan.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={approvalReason}
                        onChange={(e) => setApprovalReason(e.target.value)}
                        placeholder="Mandatory approval reason (e.g. Verified compatibility against test matrix)..."
                        className="w-full bg-[#090D16] border border-[#1E2B45] rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                      />
                      <button
                        onClick={() => onApprovePlan(activePlan.id, approvalReason)}
                        disabled={!approvalReason.trim()}
                        className="btn-primary px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <Check className="w-4 h-4" /> Sign & Approve Cryptographic Hash
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Execution Phase */}
              {activePlan.status === 'APPROVED' && (
                <div className="p-3.5 rounded bg-[#0E1524] border border-[#1E2B45] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5 font-mono">
                      <CheckCircle2 className="w-4 h-4" />
                      Approval Granted by {activePlan.approver}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Reason: {activePlan.approval_reason}
                    </span>
                  </div>

                  <button
                    onClick={() => onExecutePlan(activePlan.id)}
                    className="btn-primary px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5"
                  >
                    <GitBranch className="w-4 h-4" /> Create Git Remediation Branch & Trigger CI
                  </button>
                </div>
              )}

              {/* Verification Phase */}
              {activePlan.status === 'EXECUTED' && (
                <div className="p-3.5 rounded bg-[#0E1524] border border-[#1E2B45] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-sky-400 flex items-center gap-1.5 font-mono">
                      <Terminal className="w-4 h-4" />
                      Independent Automated Verification Gate (Rule #14)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Awaiting CI Results</span>
                  </div>

                  <div className="p-3 rounded bg-[#090D16] border border-[#1E2B45] space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Automated Test Matrix: 46/46 Passed
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Static Analysis Re-scan: 0 Findings Found
                    </div>
                  </div>

                  <button
                    onClick={() => onVerifyPlan(activePlan.id, verificationNotes)}
                    className="btn-primary px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" /> Verify Evidence & Mark Finding RESOLVED
                  </button>
                </div>
              )}

              {/* Verified Complete */}
              {activePlan.status === 'VERIFIED' && (
                <div className="p-3.5 rounded bg-emerald-950/20 border border-emerald-800/40 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-emerald-300 font-mono">
                        VERIFIED REMEDIATION COMPLETE
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans">
                        Patch has passed full test regression and security scanner re-evaluation. Finding is marked RESOLVED.
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700/50 text-[11px] font-mono">
                    Audited
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 rounded-lg bg-[#0E1524] border border-[#1E2B45]">
            Select a remediation plan to view patch diff and approval status.
          </div>
        )}
      </div>
    </div>
  )
}
export default RemediationWorkspace
