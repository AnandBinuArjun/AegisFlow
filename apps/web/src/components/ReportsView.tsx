import React from 'react'
import { BarChart3, Download } from 'lucide-react'

export const ReportsView: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-lg bg-[#0E1524] border border-[#1E2B45] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 font-sans">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            Executive AppSec Posture & SLA Compliance Report
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Auditable tracking of remediation velocity, mean time to verify, and vulnerability density.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting signed audit PDF report...')}
          className="btn-primary px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Export Signed Compliance PDF
        </button>
      </div>

      {/* SLA Matrix Table */}
      <div className="rounded-lg bg-[#0E1524] border border-[#1E2B45] overflow-hidden">
        <div className="p-3.5 bg-[#0B111F] border-b border-[#1E2B45] text-xs font-semibold text-slate-200 font-mono">
          SLA POLICIES & COMPLIANCE BURNDOWN
        </div>
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className="bg-[#090D16] text-slate-400 text-[11px] font-mono border-b border-[#1E2B45]">
              <th className="py-2.5 px-4">Severity Tier</th>
              <th className="py-2.5 px-4">Mandated Target SLA</th>
              <th className="py-2.5 px-4">Current Average</th>
              <th className="py-2.5 px-4">Breach Count</th>
              <th className="py-2.5 px-4">Compliance Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A253C] font-mono text-[12px]">
            <tr>
              <td className="py-3 px-4 font-bold text-rose-400">P0 / CRITICAL (KEV)</td>
              <td className="py-3 px-4 text-slate-300">&le; 48 hours</td>
              <td className="py-3 px-4 text-slate-200">18.4 hours</td>
              <td className="py-3 px-4 text-emerald-400">0 breaches</td>
              <td className="py-3 px-4">
                <span className="badge-decision px-2 py-0.5 rounded text-[10px] font-bold">
                  100% COMPLIANT
                </span>
              </td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-bold text-amber-400">P1 / HIGH</td>
              <td className="py-3 px-4 text-slate-300">&le; 14 days</td>
              <td className="py-3 px-4 text-slate-200">4.2 days</td>
              <td className="py-3 px-4 text-emerald-400">0 breaches</td>
              <td className="py-3 px-4">
                <span className="badge-decision px-2 py-0.5 rounded text-[10px] font-bold">
                  100% COMPLIANT
                </span>
              </td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-bold text-yellow-400">P2 / MEDIUM</td>
              <td className="py-3 px-4 text-slate-300">&le; 30 days</td>
              <td className="py-3 px-4 text-slate-200">11.0 days</td>
              <td className="py-3 px-4 text-emerald-400">0 breaches</td>
              <td className="py-3 px-4">
                <span className="badge-decision px-2 py-0.5 rounded text-[10px] font-bold">
                  100% COMPLIANT
                </span>
              </td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-bold text-sky-400">P3 / LOW</td>
              <td className="py-3 px-4 text-slate-300">&le; 90 days</td>
              <td className="py-3 px-4 text-slate-200">22.5 days</td>
              <td className="py-3 px-4 text-emerald-400">0 breaches</td>
              <td className="py-3 px-4">
                <span className="badge-decision px-2 py-0.5 rounded text-[10px] font-bold">
                  100% COMPLIANT
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
export default ReportsView
