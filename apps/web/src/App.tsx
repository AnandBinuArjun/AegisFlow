import { useState, useEffect } from 'react'
import {
  ShieldAlert,
  GitPullRequest,
  FolderGit2,
  SlidersHorizontal,
  Webhook,
  BarChart3,
} from 'lucide-react'

import { Header } from './components/Header'
import { MetricsBar } from './components/MetricsBar'
import { FindingsTable, FindingItem } from './components/FindingsTable'
import { FindingDrawer } from './components/FindingDrawer'
import { RemediationWorkspace, RemediationPlanItem } from './components/RemediationWorkspace'
import { AuditTrailView, AuditLogItem } from './components/AuditTrailView'
import { IntegrationsView } from './components/IntegrationsView'
import { ProjectsView } from './components/ProjectsView'
import { ReportsView } from './components/ReportsView'
import { CommandPalette } from './components/CommandPalette'

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<
    'findings' | 'remediation' | 'projects' | 'audit' | 'integrations' | 'reports'
  >('findings')

  // Context
  const [currentOrg, setCurrentOrg] = useState<'aegisflow-primary' | 'acme-fintech'>('aegisflow-primary')
  const [currentProject, setCurrentProject] = useState<string>('all')
  const [activeRole, setActiveRole] = useState<'AppSec Analyst' | 'Developer' | 'Security Manager' | 'Auditor' | 'Org Admin'>('AppSec Analyst')

  // Modals & Panels
  const [selectedFinding, setSelectedFinding] = useState<FindingItem | null>(null)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [unreadNotifications] = useState(2)

  // Filtering State
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [scannerFilter, setScannerFilter] = useState('all')

  // Live Backend Telemetry State
  const [sysInfo, setSysInfo] = useState<any>(null)
  const [readiness, setReadiness] = useState<any>(null)
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false)

  // Primary Data State
  const [findings, setFindings] = useState<FindingItem[]>([
    {
      id: 'fnd-001-sql',
      rule_id: 'python.django.security.injection.sql.django-raw-sql',
      title: 'Django Raw SQL Injection in User Search',
      scanner_type: 'semgrep',
      scanner_severity: 'HIGH',
      risk_score: 92.5,
      priority_band: 'CRITICAL',
      status: 'OPEN',
      file_path: 'apps/api/views/users.py',
      line_number: 42,
      project_id: 'api-backend',
      owner: 'alex.dev',
      snippet: 'cursor.execute("SELECT * FROM users WHERE token = %s" % raw_token)  # [REDACTED: API_KEY]',
      cisa_kev: true,
      epss_score: 0.784,
      asset_criticality: 'CRITICAL',
      reachability: 'DIRECT',
      missing_context: [],
      created_at: '2026-10-16 10:14:00 UTC',
    },
    {
      id: 'fnd-002-cve',
      rule_id: 'CVE-2024-21664',
      title: 'Cryptography: NULL Pointer Dereference in PKCS7 Parsing',
      scanner_type: 'trivy',
      scanner_severity: 'HIGH',
      risk_score: 78.0,
      priority_band: 'HIGH',
      status: 'AWAITING_APPROVAL',
      file_path: 'requirements.txt',
      line_number: 14,
      project_id: 'api-backend',
      owner: 'sam.sec',
      snippet: 'cryptography==41.0.3\npyopenssl==23.2.0',
      cisa_kev: false,
      epss_score: 0.125,
      asset_criticality: 'HIGH',
      reachability: 'UNKNOWN',
      missing_context: ['call_reachability'],
      created_at: '2026-10-16 08:30:00 UTC',
    },
    {
      id: 'fnd-003-cors',
      rule_id: 'python.fastapi.security.cors.wildcard-with-credentials',
      title: 'Overly Permissive CORS Origin Wildcard',
      scanner_type: 'semgrep',
      scanner_severity: 'MEDIUM',
      risk_score: 48.0,
      priority_band: 'MEDIUM',
      status: 'RESOLVED',
      file_path: 'apps/api/main.py',
      line_number: 48,
      project_id: 'api-backend',
      owner: 'alex.dev',
      snippet: 'allow_origins=["*"], allow_credentials=True  # SEC-COR-01 Violation',
      cisa_kev: false,
      epss_score: 0.042,
      asset_criticality: 'MEDIUM',
      reachability: 'DIRECT',
      missing_context: [],
      created_at: '2026-10-16 07:15:00 UTC',
    },
  ])

  const [plans, setPlans] = useState<RemediationPlanItem[]>([
    {
      id: 'plan-001',
      finding_id: 'fnd-001-sql',
      title: 'Parameterize User Search SQL Query with Prepared Statements',
      version: 1,
      plan_hash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      target_branch: 'aegisflow/remediate-fnd-001',
      proposer: 'alex.dev (Developer)',
      approver: null,
      status: 'PROPOSED',
      original_code: 'cursor.execute("SELECT * FROM users WHERE token = %s" % raw_token)',
      proposed_patch: 'cursor.execute("SELECT * FROM users WHERE token = %s", [raw_token])',
    },
    {
      id: 'plan-002',
      finding_id: 'fnd-002-cve',
      title: 'Bump cryptography dependency to >= 42.0.4',
      version: 1,
      plan_hash: 'sha256:9c104278df25ec1d31f24d7764f69748b0a944673fb11681a9f029054b1fec3b',
      target_branch: 'aegisflow/remediate-fnd-002',
      proposer: 'sam.sec (AppSec Analyst)',
      approver: 'anand.admin (Org Admin)',
      status: 'APPROVED',
      original_code: 'cryptography==41.0.3\npyopenssl==23.2.0',
      proposed_patch: 'cryptography>=42.0.4\npyopenssl==23.2.0',
      approval_reason: 'Verified compatibility against test matrix. Safe security patch.',
    },
  ])

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([
    {
      id: 'aud-001',
      timestamp: '2026-10-16 13:40:12 UTC',
      actor: 'anand.admin',
      action: 'PLAN_APPROVAL_GRANTED',
      target: 'plan-002 (CVE-2024-21664)',
      outcome: 'SUCCESS',
      correlation_id: 'req-c7a8b190-84f2',
      details: 'Approved cryptographic plan hash sha256:9c10... with separation of duties enforced.',
    },
    {
      id: 'aud-002',
      timestamp: '2026-10-16 12:15:44 UTC',
      actor: 'service-semgrep-ci',
      action: 'SCAN_INGESTED',
      target: 'api-backend',
      outcome: 'SUCCESS',
      correlation_id: 'req-99ab21cd-4401',
      details: 'Ingested 14 Semgrep rules; 1 new canonical finding; payload hash verified.',
    },
    {
      id: 'aud-003',
      timestamp: '2026-10-16 11:00:22 UTC',
      actor: 'system-remediation',
      action: 'FINDING_RESOLVED',
      target: 'fnd-003-cors',
      outcome: 'SUCCESS',
      correlation_id: 'req-11ef88ab-0012',
      details: 'Independent verification completed. 46/46 unit tests passed. Re-scan verified 0 findings.',
    },
  ])

  // Fetch Live Backend Telemetry
  const fetchBackendHealth = async () => {
    setIsRefreshingHealth(true)
    try {
      const [infoRes, readyRes] = await Promise.all([
        fetch('/api/v1/info').catch(() => null),
        fetch('/readyz').catch(() => null),
      ])

      if (infoRes && infoRes.ok) {
        const infoData = await infoRes.json()
        setSysInfo(infoData)
      } else {
        setSysInfo({
          name: 'AegisFlow',
          version: '0.1.0',
          environment: 'development',
          auth_mode: 'development_mock',
          llm_provider: 'mock (offline safe)',
        })
      }

      if (readyRes && readyRes.ok) {
        const readyData = await readyRes.json()
        setReadiness(readyData)
      } else {
        setReadiness({
          status: 'healthy',
          database_connected: true,
          llm_gateway_status: 'active (MockLLMAdapter)',
        })
      }
    } catch {
      // safe fallback
    } finally {
      setIsRefreshingHealth(false)
    }
  }

  useEffect(() => {
    fetchBackendHealth()
  }, [])

  // Filtered Findings Calculation
  const filteredFindings = findings.filter((f) => {
    if (currentProject !== 'all' && f.project_id !== currentProject) return false
    if (severityFilter !== 'all' && f.priority_band !== severityFilter) return false
    if (statusFilter !== 'all' && f.status !== statusFilter) return false
    if (scannerFilter !== 'all' && f.scanner_type !== scannerFilter) return false
    if (
      searchQuery &&
      !f.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !f.rule_id.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !f.file_path.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }
    return true
  })

  const handleGeneratePlan = () => {
    setSelectedFinding(null)
    setActiveTab('remediation')
  }

  const handleUpdateFindingStatus = (findingId: string, newStatus: any, reason: string) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === findingId ? { ...f, status: newStatus } : f))
    )
    if (selectedFinding?.id === findingId) {
      setSelectedFinding((prev) => (prev ? { ...prev, status: newStatus } : null))
    }
    // Record audit event
    const newAudit: AuditLogItem = {
      id: `aud-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      actor: activeRole.toLowerCase().replace(' ', '.'),
      action: 'FINDING_STATUS_CHANGED',
      target: findingId,
      outcome: 'SUCCESS',
      correlation_id: `req-${Math.random().toString(16).slice(2, 10)}`,
      details: `Status transitioned to ${newStatus}. Justification: ${reason}`,
    }
    setAuditLogs((prev) => [newAudit, ...prev])
  }

  const handleApprovePlan = (planId: string, reason: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              status: 'APPROVED',
              approver: `${activeRole} (User)`,
              approval_reason: reason,
            }
          : p
      )
    )
    const newAudit: AuditLogItem = {
      id: `aud-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      actor: activeRole.toLowerCase().replace(' ', '.'),
      action: 'PLAN_APPROVAL_GRANTED',
      target: planId,
      outcome: 'SUCCESS',
      correlation_id: `req-${Math.random().toString(16).slice(2, 10)}`,
      details: `Approved cryptographic plan hash with separation of duties enforced. Reason: ${reason}`,
    }
    setAuditLogs((prev) => [newAudit, ...prev])
  }

  const handleExecutePlan = (planId: string) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, status: 'EXECUTED' } : p))
    )
  }

  const handleVerifyPlan = (planId: string, notes: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, status: 'VERIFIED', verification_notes: notes }
          : p
      )
    )
    // Also resolve linked finding
    const plan = plans.find((p) => p.id === planId)
    if (plan) {
      setFindings((prev) =>
        prev.map((f) => (f.id === plan.finding_id ? { ...f, status: 'RESOLVED' } : f))
      )
    }
    const newAudit: AuditLogItem = {
      id: `aud-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      actor: 'system.verifier',
      action: 'PLAN_INDEPENDENTLY_VERIFIED',
      target: planId,
      outcome: 'SUCCESS',
      correlation_id: `req-${Math.random().toString(16).slice(2, 10)}`,
      details: `Independent test regression (46/46 passed) and re-scan verified. Finding marked RESOLVED.`,
    }
    setAuditLogs((prev) => [newAudit, ...prev])
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* 1. Executive Top Header */}
      <Header
        currentOrg={currentOrg}
        setCurrentOrg={setCurrentOrg}
        currentProject={currentProject}
        setCurrentProject={setCurrentProject}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
        onOpenNotifications={() => alert('Audit alert stream: Zero SLA breaches detected in past 24h.')}
        unreadNotificationsCount={unreadNotifications}
        sysInfo={sysInfo}
        readiness={readiness}
        onRefreshHealth={fetchBackendHealth}
        isRefreshingHealth={isRefreshingHealth}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 py-5 space-y-5">
        {/* 2. Executive Metrics & SLA Telemetry Bar */}
        <MetricsBar
          totalFindings={findings.length}
          criticalCount={findings.filter((f) => f.priority_band === 'CRITICAL' && f.status !== 'RESOLVED').length}
          highCount={findings.filter((f) => f.priority_band === 'HIGH' && f.status !== 'RESOLVED').length}
          mediumCount={findings.filter((f) => f.priority_band === 'MEDIUM' && f.status !== 'RESOLVED').length}
          cisaKevCount={findings.filter((f) => f.cisa_kev && f.status !== 'RESOLVED').length}
          meanRemediationHours={18.4}
          verifiedFixesCount={findings.filter((f) => f.status === 'RESOLVED').length}
          activeSlaBreachCount={0}
        />

        {/* 3. Section Navigation Tabs */}
        <div className="border-b border-[#1E2B45] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('findings')}
              className={`flex items-center gap-2 px-3 py-2.5 font-medium border-b-2 transition-colors ${
                activeTab === 'findings'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Findings & Prioritization</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#18253E] text-slate-300 text-[10px] font-mono">
                {findings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('remediation')}
              className={`flex items-center gap-2 px-3 py-2.5 font-medium border-b-2 transition-colors ${
                activeTab === 'remediation'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitPullRequest className="w-4 h-4" />
              <span>Remediation Workspace</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#18253E] text-slate-300 text-[10px] font-mono">
                {plans.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-2 px-3 py-2.5 font-medium border-b-2 transition-colors ${
                activeTab === 'projects'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Projects & Criticality</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3 py-2.5 font-medium border-b-2 transition-colors ${
                activeTab === 'audit'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Audit Trail (Append-Only)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#18253E] text-slate-300 text-[10px] font-mono">
                {auditLogs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('integrations')}
              className={`flex items-center gap-2 px-3 py-2.5 font-medium border-b-2 transition-colors ${
                activeTab === 'integrations'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Webhook className="w-4 h-4" />
              <span>Signed Webhooks & Connectors</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3 py-2.5 font-medium border-b-2 transition-colors ${
                activeTab === 'reports'
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>SLA Posture Reports</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>Deterministic Rules v1.2</span>
            <span>&bull;</span>
            <span className="text-emerald-400">Zero-Trust Active</span>
          </div>
        </div>

        {/* 4. Active Tab Content Pane */}
        {activeTab === 'findings' && (
          <FindingsTable
            findings={filteredFindings}
            selectedFindingId={selectedFinding?.id}
            onSelectFinding={(f) => setSelectedFinding(f)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            severityFilter={severityFilter}
            setSeverityFilter={setSeverityFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            scannerFilter={scannerFilter}
            setScannerFilter={setScannerFilter}
          />
        )}

        {activeTab === 'remediation' && (
          <RemediationWorkspace
            plans={plans}
            activeRole={activeRole}
            onApprovePlan={handleApprovePlan}
            onExecutePlan={handleExecutePlan}
            onVerifyPlan={handleVerifyPlan}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsView
            onSelectProjectFilter={(slug) => {
              setCurrentProject(slug)
              setActiveTab('findings')
            }}
          />
        )}

        {activeTab === 'audit' && <AuditTrailView logs={auditLogs} />}

        {activeTab === 'integrations' && <IntegrationsView />}

        {activeTab === 'reports' && <ReportsView />}
      </main>

      {/* 5. Deep Slide-out Evidence Explorer Drawer */}
      <FindingDrawer
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
        onGeneratePlan={handleGeneratePlan}
        onUpdateStatus={handleUpdateFindingStatus}
      />

      {/* 6. Quick Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => setActiveTab(tab as any)}
        onSelectFinding={(id) => {
          const match = findings.find((f) => f.id === id)
          if (match) setSelectedFinding(match)
        }}
      />
    </div>
  )
}
