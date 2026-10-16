import React from 'react'
import {
  ShieldAlert,
  Flame,
  Search,
  CheckCircle2,
  ChevronRight,
  FileCode,
} from 'lucide-react'

export interface FindingItem {
  id: string
  rule_id: string
  title: string
  scanner_type: string
  scanner_severity: string
  risk_score: number
  priority_band: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'OPEN' | 'TRIAGED' | 'AWAITING_APPROVAL' | 'RESOLVED'
  file_path: string
  line_number: number
  project_id: string
  owner: string
  snippet: string
  cisa_kev: boolean
  epss_score: number
  asset_criticality: string
  reachability: string
  missing_context: string[]
  created_at: string
}

interface FindingsTableProps {
  findings: FindingItem[]
  selectedFindingId?: string
  onSelectFinding: (finding: FindingItem) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  severityFilter: string
  setSeverityFilter: (sev: string) => void
  statusFilter: string
  setStatusFilter: (st: string) => void
  scannerFilter: string
  setScannerFilter: (sc: string) => void
}

export const FindingsTable: React.FC<FindingsTableProps> = ({
  findings,
  selectedFindingId,
  onSelectFinding,
  searchQuery,
  setSearchQuery,
  severityFilter,
  setSeverityFilter,
  statusFilter,
  setStatusFilter,
  scannerFilter,
  setScannerFilter,
}) => {
  const getBandClass = (band: string) => {
    switch (band) {
      case 'CRITICAL':
        return 'band-critical'
      case 'HIGH':
        return 'band-high'
      case 'MEDIUM':
        return 'band-medium'
      default:
        return 'band-low'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            OPEN
          </span>
        )
      case 'TRIAGED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            TRIAGED
          </span>
        )
      case 'AWAITING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            APPROVAL QUEUE
          </span>
        )
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            VERIFIED RESOLVED
          </span>
        )
      default:
        return <span className="text-slate-400 text-xs">{status}</span>
    }
  }

  return (
    <div className="bg-[#0E1524] rounded-lg border border-[#1E2B45] overflow-hidden">
      {/* Table Filter Toolbar */}
      <div className="p-3 border-b border-[#1E2B45] flex flex-wrap items-center justify-between gap-3 bg-[#0E1524]">
        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by vulnerability name, CVE, rule or file path..."
              className="w-full bg-[#090D16] border border-[#1E2B45] focus:border-sky-500 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#090D16] p-1 rounded border border-[#1E2B45] text-xs">
          {['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                severityFilter === sev
                  ? 'bg-[#1E2B45] text-slate-100 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#090D16] border border-[#1E2B45] text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none cursor-pointer"
            aria-label="Filter by Status"
          >
            <option value="all">All Lifecycle States</option>
            <option value="OPEN">Open (Requires Action)</option>
            <option value="TRIAGED">Triaged (Evidence Linked)</option>
            <option value="AWAITING_APPROVAL">Awaiting Approval</option>
            <option value="RESOLVED">Verified Resolved</option>
          </select>

          {/* Scanner Filter */}
          <select
            value={scannerFilter}
            onChange={(e) => setScannerFilter(e.target.value)}
            className="bg-[#090D16] border border-[#1E2B45] text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none cursor-pointer"
            aria-label="Filter by Scanner"
          >
            <option value="all">All Ingestion Scanners</option>
            <option value="semgrep">Semgrep (SAST)</option>
            <option value="trivy">Trivy (SCA/CVE)</option>
          </select>
        </div>
      </div>

      {/* Findings Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#0B111F] text-slate-400 font-medium border-b border-[#1E2B45] select-none text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-4 w-28">Risk Score</th>
              <th className="py-2.5 px-4">Vulnerability / Rule ID</th>
              <th className="py-2.5 px-4 w-60">Source Location</th>
              <th className="py-2.5 px-4 w-40">Exploit Signals</th>
              <th className="py-2.5 px-4 w-32">Criticality</th>
              <th className="py-2.5 px-4 w-36">Status</th>
              <th className="py-2.5 px-4 w-24 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A253C]">
            {findings.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ShieldAlert className="w-8 h-8 text-slate-600" />
                    <p className="text-sm font-medium text-slate-400">No findings match the active filters</p>
                    <p className="text-xs text-slate-500">Try adjusting your severity or search query</p>
                  </div>
                </td>
              </tr>
            ) : (
              findings.map((f) => {
                const isSelected = selectedFindingId === f.id
                return (
                  <tr
                    key={f.id}
                    onClick={() => onSelectFinding(f)}
                    className={`cursor-pointer transition-colors duration-100 ${
                      isSelected
                        ? 'bg-[#18253E] border-l-2 border-l-sky-500'
                        : 'hover:bg-[#131E33]'
                    }`}
                  >
                    {/* Risk Score Pill */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${getBandClass(
                            f.priority_band
                          )}`}
                        >
                          {f.risk_score.toFixed(1)}
                        </span>
                      </div>
                    </td>

                    {/* Title & Rule Identifier */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100 text-[13px] hover:text-sky-400 transition-colors">
                            {f.title}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700/60">
                            {f.scanner_type}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 truncate max-w-lg">
                          {f.rule_id}
                        </span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                        <FileCode className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate max-w-[200px]" title={f.file_path}>
                          {f.file_path}
                        </span>
                        <span className="text-slate-500">:{f.line_number}</span>
                      </div>
                    </td>

                    {/* Exploit Signals */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        {f.cisa_kev ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-800/50 text-[10px] font-bold">
                            <Flame className="w-2.5 h-2.5 text-rose-400" /> KEV
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                        <span className="text-slate-400" title="EPSS Probability">
                          EPSS: {(f.epss_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* Criticality */}
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-mono font-medium text-slate-300">
                        {f.asset_criticality}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">{getStatusBadge(f.status)}</td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectFinding(f)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#18253E] hover:bg-sky-600 hover:text-white text-slate-300 border border-[#273756] text-xs transition-colors font-medium"
                      >
                        Triage <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer / Summary Bar */}
      <div className="px-4 py-2.5 bg-[#0B111F] border-t border-[#1E2B45] flex items-center justify-between text-xs text-slate-400 font-mono">
        <span>Showing {findings.length} findings in current view</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span> Critical &ge; 90.0
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span> High &ge; 70.0
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-yellow-500"></span> Medium &ge; 40.0
          </span>
        </div>
      </div>
    </div>
  )
}
export default FindingsTable
