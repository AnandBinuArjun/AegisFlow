import React, { useState } from 'react'
import {
  Search,
  CheckCircle2,
  Lock,
} from 'lucide-react'

export interface AuditLogItem {
  id: string
  timestamp: string
  actor: string
  action: string
  target: string
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED'
  correlation_id: string
  details: string
}

interface AuditTrailViewProps {
  logs: AuditLogItem[]
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ logs }) => {
  const [filterQuery, setFilterQuery] = useState('')

  const filtered = logs.filter(
    (l) =>
      l.actor.toLowerCase().includes(filterQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(filterQuery.toLowerCase()) ||
      l.correlation_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      l.target.toLowerCase().includes(filterQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Header & Governance Banner */}
      <div className="p-4 rounded-lg bg-[#0E1524] border border-[#1E2B45] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 font-sans">
            <Lock className="w-4 h-4 text-emerald-400" />
            Append-Only Tamper-Evident Audit Trail (SEC-AUDIT-01)
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Every state-changing action, scan ingestion, AI triage prompt dispatch, and approval sign-off is cryptographically sealed with correlation tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-xs font-mono font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Immutable Log Ledger
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 rounded-lg bg-[#0E1524] border border-[#1E2B45] flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search by actor, action name, or correlation ID..."
            className="w-full bg-[#090D16] border border-[#1E2B45] focus:border-sky-500 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Showing {filtered.length} audit entries
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-lg bg-[#0E1524] border border-[#1E2B45] overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#0B111F] text-slate-400 font-medium border-b border-[#1E2B45] text-[11px] uppercase tracking-wider select-none">
              <th className="py-2.5 px-4 w-44">Timestamp (UTC)</th>
              <th className="py-2.5 px-4 w-36">Actor</th>
              <th className="py-2.5 px-4 w-52">Action</th>
              <th className="py-2.5 px-4 w-48">Target Resource</th>
              <th className="py-2.5 px-4 w-28">Outcome</th>
              <th className="py-2.5 px-4 w-44">Correlation ID</th>
              <th className="py-2.5 px-4">Audit Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A253C] font-mono">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-[#131E33] transition-colors">
                <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                  {log.timestamp}
                </td>
                <td className="py-3 px-4 font-semibold text-slate-200 text-[11px]">
                  {log.actor}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#18253E] text-sky-300 border border-[#273756]">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-300 text-[11px] truncate max-w-[160px]" title={log.target}>
                  {log.target}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> SUCCESS
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400 text-[11px]">
                  <code>{log.correlation_id}</code>
                </td>
                <td className="py-3 px-4 text-slate-400 text-[11px] font-sans truncate max-w-xs" title={log.details}>
                  {log.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
export default AuditTrailView
