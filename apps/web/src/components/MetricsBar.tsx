import React from 'react'
import {
  ShieldAlert,
  Flame,
  Clock,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react'

interface MetricsBarProps {
  totalFindings: number
  criticalCount: number
  highCount: number
  mediumCount: number
  cisaKevCount: number
  meanRemediationHours: number
  verifiedFixesCount: number
  activeSlaBreachCount?: number
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  totalFindings,
  criticalCount,
  highCount,
  mediumCount,
  cisaKevCount,
  meanRemediationHours,
  verifiedFixesCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Open Risk Footprint */}
      <div className="p-3.5 rounded-lg bg-[#0E1524] border border-[#1E2B45] hover:border-[#273756] transition-colors">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-sky-400" />
            Total Open Findings
          </span>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-0.5">
            <TrendingDown className="w-3 h-3" /> -18% 7d
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-100">{totalFindings}</span>
          <span className="text-xs text-slate-400">active alerts</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono">
          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
            {criticalCount} Crit
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {highCount} High
          </span>
          <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            {mediumCount} Med
          </span>
        </div>
      </div>

      {/* 2. Critical Threat & KEV Exposure */}
      <div className="p-3.5 rounded-lg bg-[#0E1524] border border-[#1E2B45] hover:border-[#273756] transition-colors">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-500" />
            Active Exploit Exposure
          </span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40">
            CISA KEV: {cisaKevCount}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-rose-400">{criticalCount}</span>
          <span className="text-xs text-slate-400">require immediate patch</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Priority P0/P1 queue</span>
          <span className="text-rose-400 flex items-center gap-0.5">
            EPSS &gt; 0.70 <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 3. Mean Remediation SLA */}
      <div className="p-3.5 rounded-lg bg-[#0E1524] border border-[#1E2B45] hover:border-[#273756] transition-colors">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            Mean Remediation Time
          </span>
          <span className="text-[11px] font-mono text-slate-400">Target &le; 48h</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-100">{meanRemediationHours}h</span>
          <span className="text-xs text-slate-400">finding-to-verify</span>
        </div>
        <div className="mt-2.5 w-full bg-[#131D31] rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full"
            style={{ width: `${Math.min(100, Math.round((48 / Math.max(1, meanRemediationHours)) * 100))}%` }}
          />
        </div>
      </div>

      {/* 4. Verified Zero-Trust Fixes */}
      <div className="p-3.5 rounded-lg bg-[#0E1524] border border-[#1E2B45] hover:border-[#273756] transition-colors">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Verified Clean Outcomes
          </span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
            100% CI Re-scan
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-emerald-400">{verifiedFixesCount}</span>
          <span className="text-xs text-slate-400">patches proven fixed</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Zero-Trust Policy</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> No AI unverified claims
          </span>
        </div>
      </div>
    </div>
  )
}
export default MetricsBar
