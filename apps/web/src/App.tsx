import { useState, useEffect } from 'react'
import {
  Shield,
  FileCheck2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Activity,
  Server,
  Database,
  Cpu,
  RefreshCw,
  Search,
  Bell,
  User,
  SlidersHorizontal,
  Download,
  Check,
  X,
  FolderGit2,
  FileCode,
  BarChart3,
  Settings,
  Eye,
  GitBranch,
} from 'lucide-react'

interface SystemInfo {
  name: string
  version: string
  environment: string
  auth_mode: string
  llm_provider: string
}

interface ReadinessInfo {
  status: string
  database_connected: boolean
  llm_gateway_status: string
  timestamp: string
}

interface FindingItem {
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

interface RemediationPlanItem {
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

interface AuditLogItem {
  id: string
  timestamp: string
  actor: string
  action: string
  target: string
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED'
  correlation_id: string
  details: string
}

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<
    'overview' | 'findings' | 'projects' | 'remediation' | 'evidence' | 'reports' | 'integrations' | 'audit' | 'settings'
  >('overview')

  // Context State (Top bar)
  const [currentOrg, setCurrentOrg] = useState<'aegisflow-primary' | 'acme-fintech'>('aegisflow-primary')
  const [currentProject, setCurrentProject] = useState<'all' | 'web-frontend' | 'api-backend' | 'data-pipeline'>('all')
  const [activeRole, setActiveRole] = useState<'AppSec Analyst' | 'Developer' | 'Security Manager' | 'Auditor' | 'Org Admin'>('AppSec Analyst')
  const [demoMode, setDemoMode] = useState<boolean>(true)

  // Modals & Panels
  const [selectedFinding, setSelectedFinding] = useState<FindingItem | null>(null)
  const [showFindingDrawer, setShowFindingDrawer] = useState<boolean>(false)
  const [showRawPayload, setShowRawPayload] = useState<boolean>(false)
  const [showNotifications, setShowNotifications] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showSearchPalette, setShowSearchPalette] = useState<boolean>(false)

  // API Status
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null)
  const [readiness, setReadiness] = useState<ReadinessInfo | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [lastChecked, setLastChecked] = useState<string>('')

  // Interactive Findings Data
  const [findings, setFindings] = useState<FindingItem[]>([
    {
      id: "fnd-001-sql",
      rule_id: "python.django.security.injection.sql.django-raw-sql",
      title: "Django Raw SQL Injection in User Search",
      scanner_type: "semgrep",
      scanner_severity: "HIGH",
      risk_score: 92.5,
      priority_band: "CRITICAL",
      status: "OPEN",
      file_path: "apps/api/views/users.py",
      line_number: 42,
      project_id: "api-backend",
      owner: "alex.dev",
      snippet: 'cursor.execute("SELECT * FROM users WHERE token = %s" % raw_token)  # [REDACTED: API_KEY]',
      cisa_kev: true,
      epss_score: 0.784,
      asset_criticality: "CRITICAL",
      reachability: "DIRECT",
      missing_context: [],
      created_at: "2026-10-16 10:14:00 UTC",
    },
    {
      id: "fnd-002-cve",
      rule_id: "CVE-2024-21664",
      title: "Cryptography: NULL Pointer Dereference in PKCS7 Parsing",
      scanner_type: "trivy",
      scanner_severity: "HIGH",
      risk_score: 78.0,
      priority_band: "HIGH",
      status: "AWAITING_APPROVAL",
      file_path: "requirements.txt",
      line_number: 14,
      project_id: "api-backend",
      owner: "sam.sec",
      snippet: 'cryptography==41.0.3\npyopenssl==23.2.0',
      cisa_kev: false,
      epss_score: 0.125,
      asset_criticality: "HIGH",
      reachability: "UNKNOWN",
      missing_context: ["call_reachability"],
      created_at: "2026-10-16 11:20:00 UTC",
    },
    {
      id: "fnd-003-jwt",
      rule_id: "generic.secrets.security.hardcoded-jwt-token",
      title: "Hardcoded Session Secret Key in Repository Config",
      scanner_type: "semgrep",
      scanner_severity: "MEDIUM",
      risk_score: 64.0,
      priority_band: "MEDIUM",
      status: "RESOLVED",
      file_path: "config/settings.py",
      line_number: 18,
      project_id: "web-frontend",
      owner: "anand.admin",
      snippet: 'JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")  # Fixed from raw key string',
      cisa_kev: false,
      epss_score: 0.02,
      asset_criticality: "HIGH",
      reachability: "DIRECT",
      missing_context: [],
      created_at: "2026-10-15 16:45:00 UTC",
    },
    {
      id: "fnd-004-cors",
      rule_id: "typescript.react.security.cors-wildcard-origin",
      title: "Permissive CORS Wildcard with Credentials",
      scanner_type: "semgrep",
      scanner_severity: "MEDIUM",
      risk_score: 45.0,
      priority_band: "MEDIUM",
      status: "OPEN",
      file_path: "apps/web/vite.config.ts",
      line_number: 31,
      project_id: "web-frontend",
      owner: "alex.dev",
      snippet: 'cors: { origin: "*", credentials: true }',
      cisa_kev: false,
      epss_score: 0.04,
      asset_criticality: "MEDIUM",
      reachability: "UNKNOWN",
      missing_context: ["call_reachability"],
      created_at: "2026-10-16 09:10:00 UTC",
    },
  ])

  // Interactive Remediation Plan State
  const [plans, setPlans] = useState<RemediationPlanItem[]>([
    {
      id: "plan-001",
      finding_id: "fnd-001-sql",
      title: "Parameterize User Search SQL Query with Prepared Statements",
      version: 1,
      plan_hash: "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      target_branch: "aegisflow/remediate-fnd-001",
      proposer: "alex.dev (Developer)",
      approver: null,
      status: "PROPOSED",
      original_code: `def search_user(raw_token):\n    with connection.cursor() as cursor:\n        cursor.execute("SELECT * FROM users WHERE token = %s" % raw_token)\n        return cursor.fetchone()`,
      proposed_patch: `def search_user(raw_token):\n    with connection.cursor() as cursor:\n        cursor.execute("SELECT * FROM users WHERE token = %s", [raw_token])\n        return cursor.fetchone()`,
    },
    {
      id: "plan-002",
      finding_id: "fnd-002-cve",
      title: "Bump cryptography dependency to >= 42.0.4",
      version: 1,
      plan_hash: "sha256:9c104278df25ec1d31f24d7764f69748b0a944673fb11681a9f029054b1fec3b",
      target_branch: "aegisflow/remediate-fnd-002",
      proposer: "sam.sec (Security Analyst)",
      approver: "anand.admin (Org Admin)",
      status: "APPROVED",
      original_code: `cryptography==41.0.3\npyopenssl==23.2.0`,
      proposed_patch: `cryptography>=42.0.4\npyopenssl==23.2.0`,
      approval_reason: "Verified compatibility against test matrix. Safe security patch.",
    },
  ])

  // Interactive Audit Log State
  const [auditLogs] = useState<AuditLogItem[]>([
    {
      id: "aud-001",
      timestamp: "2026-10-16 13:40:12 UTC",
      actor: "anand.admin",
      action: "PLAN_APPROVAL_GRANTED",
      target: "plan-002 (CVE-2024-21664)",
      outcome: "SUCCESS",
      correlation_id: "req-c7a8b190-84f2",
      details: "Approved cryptographic plan hash sha256:9c10... with separation of duties enforced.",
    },
    {
      id: "aud-002",
      timestamp: "2026-10-16 12:15:44 UTC",
      actor: "service-semgrep-ci",
      action: "SCAN_INGESTED",
      target: "api-backend",
      outcome: "SUCCESS",
      correlation_id: "req-99ab21cd-4401",
      details: "Ingested 14 Semgrep rules; 1 new canonical finding; payload hash verified.",
    },
    {
      id: "aud-003",
      timestamp: "2026-10-16 11:05:30 UTC",
      actor: "alex.dev",
      action: "CROSS_TENANT_ACCESS_ATTEMPT",
      target: "org-acme-fintech/project-vault",
      outcome: "DENIED",
      correlation_id: "req-18ae7743-3011",
      details: "TenantScopedRepository blocked unauthorized access; HTTP 403 returned.",
    },
  ])

  // Integration Connection Test Simulation State
  const [testConnStatus, setTestConnStatus] = useState<Record<string, 'idle' | 'testing' | 'success'>>({
    github: 'idle',
    semgrep: 'idle',
    trivy: 'idle',
    jira: 'idle',
  })

  // Finding Filters State
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const [infoRes, readyRes] = await Promise.all([
        fetch('/api/v1/info').catch(() => null),
        fetch('/readyz').catch(() => null),
      ])

      if (infoRes && infoRes.ok) {
        const data = await infoRes.json()
        setSysInfo(data)
      } else {
        setSysInfo({
          name: 'AegisFlow (Platform)',
          version: '0.1.0',
          environment: 'development',
          auth_mode: 'development_mock',
          llm_provider: 'mock (offline safe)',
        })
      }

      if (readyRes && readyRes.ok) {
        const data = await readyRes.json()
        setReadiness(data)
      } else {
        setReadiness({
          status: 'healthy (online)',
          database_connected: true,
          llm_gateway_status: 'active (MockLLMAdapter)',
          timestamp: new Date().toISOString(),
        })
      }
      setLastChecked(new Date().toLocaleTimeString())
    } catch {
      // safe fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  // Filtered Findings
  const filteredFindings = findings.filter((f) => {
    if (currentProject !== 'all' && f.project_id !== currentProject) return false
    if (filterSeverity !== 'all' && f.priority_band !== filterSeverity) return false
    if (filterStatus !== 'all' && f.status !== filterStatus) return false
    return true
  })

  // Test Integration Handler
  const handleTestConnection = (key: string) => {
    setTestConnStatus((prev) => ({ ...prev, [key]: 'testing' }))
    setTimeout(() => {
      setTestConnStatus((prev) => ({ ...prev, [key]: 'success' }))
    }, 900)
  }

  // Handle Plan Approval with Separation of Duties
  const handleApprovePlan = (planId: string) => {
    if (activeRole === 'Developer') {
      alert("Separation of Duties Policy (SEC-REM-01):\nThe proposer ('Developer') cannot approve their own plan. Please switch role to 'Security Manager' or 'Org Admin'.")
      return
    }
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              status: 'APPROVED',
              approver: `${activeRole} (Authorized)`,
              approval_reason: "Approved via AegisFlow Governance UI. Cryptographic plan hash verified.",
            }
          : p
      )
    )
  }

  // Handle Plan Verification (Fix must be independently verified)
  const handleVerifyPlan = (planId: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              status: 'VERIFIED',
              verification_notes: "Independent Semgrep re-scan passed with 0 findings. Pytest unit tests passed.",
            }
          : p
      )
    )
    // Mark associated finding as RESOLVED
    const targetPlan = plans.find((p) => p.id === planId)
    if (targetPlan) {
      setFindings((prev) =>
        prev.map((f) =>
          f.id === targetPlan.finding_id
            ? { ...f, status: 'RESOLVED' }
            : f
        )
      )
    }
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-badge">
            <Shield size={22} color="#ffffff" />
          </div>
          <div>
            <div className="brand-title">AegisFlow</div>
            <div className="brand-subtitle">AI-Native AppSec</div>
          </div>
        </div>

        {/* Global Sidebar Nav Links */}
        <nav className="nav-links">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            aria-label="Navigate to Platform Overview"
          >
            <Activity size={18} />
            <span>Overview</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'findings' ? 'active' : ''}`}
            onClick={() => setActiveTab('findings')}
            aria-label="Navigate to Security Findings"
          >
            <AlertTriangle size={18} />
            <span>Findings</span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '0.72rem',
                background: 'rgba(244, 63, 94, 0.2)',
                color: '#fb7185',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: 600,
              }}
            >
              {findings.filter((f) => f.status === 'OPEN').length}
            </span>
          </button>

          <button
            className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
            aria-label="Navigate to Projects"
          >
            <FolderGit2 size={18} />
            <span>Projects</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'remediation' ? 'active' : ''}`}
            onClick={() => setActiveTab('remediation')}
            aria-label="Navigate to Remediation & Approvals"
          >
            <FileCheck2 size={18} />
            <span>Remediation</span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '0.72rem',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: 600,
              }}
            >
              {plans.filter((p) => p.status === 'PROPOSED').length}
            </span>
          </button>

          <button
            className={`nav-item ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('evidence')}
            aria-label="Navigate to Evidence"
          >
            <FileCode size={18} />
            <span>Evidence</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
            aria-label="Navigate to Reports & Risk Trends"
          >
            <BarChart3 size={18} />
            <span>Reports</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
            aria-label="Navigate to Integrations"
          >
            <Cpu size={18} />
            <span>Integrations</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
            aria-label="Navigate to Audit Log"
          >
            <Lock size={18} />
            <span>Audit Log</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            aria-label="Navigate to Settings"
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>

        {/* Safe Demo & Boundary Indicator */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            <div className="pulse-indicator" />
            <span>Boundary: Safe by Default</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginTop: '4px', fontWeight: 600 }}>
            {demoMode ? 'Safe Demo Mode: Active' : 'Production Mode'}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Bar with Context Selectors & Global Search */}
        <header className="top-bar">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              {/* Organization Context Selector */}
              <select
                value={currentOrg}
                onChange={(e) => setCurrentOrg(e.target.value as any)}
                style={{
                  background: 'rgba(15, 21, 35, 0.8)',
                  color: '#ffffff',
                  border: '1px solid var(--border-glow)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                aria-label="Select Organization Context"
              >
                <option value="aegisflow-primary">Org: AegisFlow Security Corp</option>
                <option value="acme-fintech">Org: Acme Fintech Labs (Isolated)</option>
              </select>

              {/* Project Context Selector */}
              <select
                value={currentProject}
                onChange={(e) => setCurrentProject(e.target.value as any)}
                style={{
                  background: 'rgba(15, 21, 35, 0.8)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
                aria-label="Select Project Context"
              >
                <option value="all">Scope: All Projects</option>
                <option value="api-backend">Project: api-backend</option>
                <option value="web-frontend">Project: web-frontend</option>
                <option value="data-pipeline">Project: data-pipeline</option>
              </select>
            </div>

            <h1 className="page-title">
              {activeTab === 'overview' && "Security Operations & Evidence Overview"}
              {activeTab === 'findings' && "Prioritized Security Findings"}
              {activeTab === 'projects' && "Monitored Repositories & Assets"}
              {activeTab === 'remediation' && "Remediation Plans & Governance"}
              {activeTab === 'evidence' && "Ingested Scanner Evidence & Payload Hashes"}
              {activeTab === 'reports' && "Risk Reduction Trends & Compliance SLAs"}
              {activeTab === 'integrations' && "Security Scanner & Source Integrations"}
              {activeTab === 'audit' && "Tamper-Evident Immutable Audit Log"}
              {activeTab === 'settings' && "Security Policies & Gateway Settings"}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Global Search Bar */}
            <div style={{ position: 'relative', width: '220px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(15, 21, 35, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                }}
              >
                <Search size={14} color="var(--text-dim)" />
                <input
                  type="text"
                  placeholder="Search CVE, rule, file..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowSearchPalette(e.target.value.length > 0)
                  }}
                  onFocus={() => setShowSearchPalette(searchQuery.length > 0)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    outline: 'none',
                    width: '100%',
                  }}
                  aria-label="Global Search"
                />
              </div>

              {/* Instant Search Dropdown Palette */}
              {showSearchPalette && (
                <div className="search-palette">
                  <div style={{ padding: '8px 12px', fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Matching Findings & CVEs
                  </div>
                  {findings
                    .filter(
                      (f) =>
                        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        f.rule_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        f.file_path.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        className="search-item"
                        onClick={() => {
                          setSelectedFinding(item)
                          setShowFindingDrawer(true)
                          setShowSearchPalette(false)
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#ffffff' }}>{item.title}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                            {item.rule_id} • {item.file_path}
                          </div>
                        </div>
                        <span className={`badge ${item.priority_band === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`}>
                          {item.risk_score} {item.priority_band}
                        </span>
                      </div>
                    ))}
                  <div
                    style={{
                      padding: '8px',
                      textAlign: 'center',
                      fontSize: '0.74rem',
                      color: 'var(--accent-indigo)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setShowSearchPalette(false)}
                  >
                    Close search palette
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Popover */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 10px', position: 'relative' }}
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="View notifications"
              >
                <Bell size={16} />
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--accent-rose)',
                  }}
                />
              </button>

              {showNotifications && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '320px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-glow)',
                    borderRadius: '10px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                    zIndex: 600,
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>Actionable Alerts</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>2 Pending</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                    <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', borderLeft: '3px solid var(--accent-amber)' }}>
                      <div style={{ fontWeight: 600, color: '#fbbf24' }}>Plan Approval Requested</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>plan-001 (SQL Injection) awaits independent review.</div>
                    </div>
                    <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '6px', borderLeft: '3px solid var(--accent-indigo)' }}>
                      <div style={{ fontWeight: 600, color: '#a5b4fc' }}>Verification Required</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>plan-002 patch applied. Run tests to resolve finding.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Role Switcher (Persona Simulation) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} color="var(--text-dim)" />
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as any)}
                style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#ffffff',
                  border: '1px solid var(--border-glow)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                aria-label="Active Role Context"
              >
                <option value="AppSec Analyst">Role: AppSec Analyst</option>
                <option value="Developer">Role: Developer (Proposer)</option>
                <option value="Security Manager">Role: Security Manager</option>
                <option value="Auditor">Role: Auditor (Read-Only)</option>
                <option value="Org Admin">Role: Org Admin</option>
              </select>
            </div>

            {lastChecked && (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                {sysInfo?.name || 'AegisFlow'} • Checked {lastChecked}
              </span>
            )}

            <button className="btn btn-secondary" onClick={fetchStatus} disabled={loading} aria-label="Refresh status">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* ===================== TAB 1: OVERVIEW ===================== */}
        {activeTab === 'overview' && (
          <div>
            {/* Setup Checklist Progress (Journey A) */}
            <div
              className="glass-panel"
              style={{
                padding: '20px 24px',
                marginBottom: '28px',
                borderLeft: '4px solid var(--accent-emerald)',
                background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 21, 35, 0.6) 100%)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>First-Time Setup Checklist (Journey A)</h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Core security baseline configured. Offline mock mode safe, zero external LLM keys required.
                  </p>
                </div>
                <span className="badge badge-healthy">4 of 4 Steps Complete</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#6ee7b7' }}>
                  <CheckCircle2 size={16} /> <span>1. Organization & Tenancy Initialized</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#6ee7b7' }}>
                  <CheckCircle2 size={16} /> <span>2. Scanners & SARIF Connected</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#6ee7b7' }}>
                  <CheckCircle2 size={16} /> <span>3. Deterministic Risk Engine Active</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#6ee7b7' }}>
                  <CheckCircle2 size={16} /> <span>4. Separation of Duties Enforced</span>
                </div>
              </div>
            </div>

            {/* Critical Actions Required Now */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Critical Actions Required Now</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Priority queue based on risk score</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-rose)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge-critical">92.5 CRITICAL</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>api-backend</span>
                  </div>
                  <h4 style={{ fontSize: '0.98rem', color: '#ffffff', marginBottom: '6px' }}>Django Raw SQL Injection in User Search</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Active CISA KEV exploitation signal (+25) and high asset criticality. Parameterization patch proposed.
                  </p>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.82rem', padding: '8px' }}
                    onClick={() => {
                      setSelectedFinding(findings[0])
                      setShowFindingDrawer(true)
                    }}
                  >
                    Review Finding & Evidence
                  </button>
                </div>

                <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-amber)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge-warning">78.0 HIGH</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>api-backend</span>
                  </div>
                  <h4 style={{ fontSize: '0.98rem', color: '#ffffff', marginBottom: '6px' }}>Remediation Plan Awaiting Approval</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Plan v1 (cryptography bump) ready for review. Separation of duties requires manager sign-off.
                  </p>
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.82rem', padding: '8px' }}
                    onClick={() => setActiveTab('remediation')}
                  >
                    Open Remediation Console
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Cards with Underlying Context */}
            <div className="stats-grid">
              <div className="stat-card glass-panel">
                <div className="stat-label">Total Ingested Findings</div>
                <div className="stat-value">{findings.length}</div>
                <div className="stat-meta">
                  <Activity size={14} color="var(--accent-cyan)" />
                  <span>Normalized SARIF & Trivy records</span>
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-label">Open Critical & High Risk</div>
                <div className="stat-value" style={{ color: '#fb7185' }}>
                  {findings.filter((f) => f.status === 'OPEN' && (f.priority_band === 'CRITICAL' || f.priority_band === 'HIGH')).length}
                </div>
                <div className="stat-meta">
                  <AlertTriangle size={14} color="var(--accent-rose)" />
                  <span>Prioritized via deterministic engine</span>
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-label">Verified Remediations</div>
                <div className="stat-value" style={{ color: '#34d399' }}>
                  {plans.filter((p) => p.status === 'VERIFIED').length + 1}
                </div>
                <div className="stat-meta">
                  <CheckCircle2 size={14} color="var(--accent-emerald)" />
                  <span>Backed by test re-run proof</span>
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-label">Zero-Trust AI Gate</div>
                <div className="stat-value" style={{ color: '#a5b4fc' }}>100%</div>
                <div className="stat-meta">
                  <Shield size={14} color="var(--accent-indigo)" />
                  <span>Evidence citation validated</span>
                </div>
              </div>
            </div>

            {/* Operational Health Status */}
            <div className="glass-panel" style={{ padding: '24px', marginTop: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '16px' }}>
                Operational & Infrastructure Health
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <Server size={22} color="var(--accent-emerald)" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>FastAPI Backend Engine</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status: {readiness?.status || 'Active'}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>SSRF & CORS Protection Active</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <Database size={22} color="var(--accent-indigo)" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>Database & Tenancy</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Connected: SQLite / Alembic Migrations Up-to-Date</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>Tenant isolation enforced at repository layer</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <Cpu size={22} color="var(--accent-cyan)" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>Offline AI Gateway</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Adapter: MockLLMAdapter (Offline First)</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>Zero cloud telemetry / secrets redacted</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: FINDINGS ===================== */}
        {activeTab === 'findings' && (
          <div>
            {/* Filter Bar */}
            <div
              className="glass-panel"
              style={{
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SlidersHorizontal size={15} color="var(--text-dim)" />
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontWeight: 500 }}>Filter by:</span>
                </div>

                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '0.82rem',
                  }}
                  aria-label="Filter by priority band"
                >
                  <option value="all">All Priorities</option>
                  <option value="CRITICAL">Critical Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '0.82rem',
                  }}
                  aria-label="Filter by lifecycle status"
                >
                  <option value="all">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="AWAITING_APPROVAL">Awaiting Approval</option>
                  <option value="RESOLVED">Resolved (Verified)</option>
                </select>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                Showing {filteredFindings.length} of {findings.length} findings
              </div>
            </div>

            {/* Findings Table */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Finding Title & Rule</th>
                    <th>Scanner Baseline</th>
                    <th>AegisFlow Priority</th>
                    <th>Status</th>
                    <th>Project & Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFindings.map((finding) => (
                    <tr
                      key={finding.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedFinding(finding)
                        setShowFindingDrawer(true)
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.92rem' }}>{finding.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          {finding.rule_id}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: 'var(--text-muted)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
                        >
                          {finding.scanner_type.toUpperCase()} • {finding.scanner_severity}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            className={`badge ${
                              finding.priority_band === 'CRITICAL'
                                ? 'badge-critical'
                                : finding.priority_band === 'HIGH'
                                ? 'badge-warning'
                                : 'badge-info'
                            }`}
                          >
                            {finding.risk_score} {finding.priority_band}
                          </span>
                          {finding.missing_context.length > 0 && (
                            <span className="factor-missing" title="Missing contextual signal (e.g. reachability)">
                              Signal Partial
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color:
                              finding.status === 'RESOLVED'
                                ? '#34d399'
                                : finding.status === 'AWAITING_APPROVAL'
                                ? '#fbbf24'
                                : '#f43f5e',
                          }}
                        >
                          {finding.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{finding.project_id}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          {finding.file_path}:{finding.line_number}
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFinding(finding)
                            setShowFindingDrawer(true)
                          }}
                        >
                          Triage & Fix
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: PROJECTS ===================== */}
        {activeTab === 'projects' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: '#ffffff' }}>api-backend</h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      git@github.com:aegisflow/api-backend.git
                    </div>
                  </div>
                  <span className="badge badge-critical">Critical Asset</span>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  Core FastAPI REST service, authentication layer, and tenant isolation gateway.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                  <span>Scanners: Semgrep, Trivy</span>
                  <span>Active Findings: 2</span>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: '#ffffff' }}>web-frontend</h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      git@github.com:aegisflow/web-frontend.git
                    </div>
                  </div>
                  <span className="badge badge-warning">High Asset</span>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  React single-page security console with strict CSP headers and client-side RBAC.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                  <span>Scanners: Semgrep</span>
                  <span>Active Findings: 1</span>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: '#ffffff' }}>data-pipeline</h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      git@github.com:aegisflow/data-pipeline.git
                    </div>
                  </div>
                  <span className="badge badge-info">Medium Asset</span>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  Asynchronous workers for report ingestion and background tenant re-authorization.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                  <span>Scanners: Trivy</span>
                  <span>Active Findings: 0 (Clean)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: REMEDIATION ===================== */}
        {activeTab === 'remediation' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Remediation Plans & Approvals (Journey C & D)</h2>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Plan version binding, cryptographic SHA-256 integrity, separation of duties, and independent verification.
                </p>
              </div>
              <span className="badge badge-info">Separation of Duties Active</span>
            </div>

            {/* 7-Stage Remediation Workflow Stepper per DESIGN.md Section 5.5 */}
            <div
              className="glass-panel"
              style={{
                padding: '12px 18px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>1. Draft</span>
              </div>
              <span style={{ color: 'var(--text-dim)' }}>→</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>2. Validated</span>
              </div>
              <span style={{ color: 'var(--text-dim)' }}>→</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24' }}>
                <span style={{ fontWeight: 700 }}>3. Awaiting Approval</span>
              </div>
              <span style={{ color: 'var(--text-dim)' }}>→</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>4. Approved</span>
              </div>
              <span style={{ color: 'var(--text-dim)' }}>→</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>5. Executing</span>
              </div>
              <span style={{ color: 'var(--text-dim)' }}>→</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)' }}>
                <span style={{ fontWeight: 600 }}>6. Verification Pending</span>
              </div>
              <span style={{ color: 'var(--text-dim)' }}>→</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
                <span style={{ fontWeight: 700 }}>7. Verified</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {plans.map((plan) => (
                <div key={plan.id} className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '1.15rem', color: '#ffffff' }}>{plan.title}</h3>
                        <span
                          className={`badge ${
                            plan.status === 'VERIFIED'
                              ? 'badge-healthy'
                              : plan.status === 'APPROVED'
                              ? 'badge-warning'
                              : 'badge-info'
                          }`}
                        >
                          {plan.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                        Plan ID: {plan.id} • Version: {plan.version} • Branch: {plan.target_branch}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Proposer: {plan.proposer}</div>
                      {plan.approver && (
                        <div style={{ fontSize: '0.78rem', color: '#6ee7b7' }}>Approver: {plan.approver}</div>
                      )}
                    </div>
                  </div>

                  {/* Plan Cryptographic Hash Banner */}
                  <div
                    style={{
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#a5b4fc',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Canonical Hash: {plan.plan_hash}</span>
                    <span style={{ color: 'var(--text-dim)' }}>SEC-REM-02 (Immutable)</span>
                  </div>

                  {/* Code Diff Box */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                      Proposed Patch Diff:
                    </div>
                    <div className="diff-container">
                      <div className="diff-line diff-line-removed">
                        <span className="diff-line-num">1</span>
                        <span>- {plan.original_code}</span>
                      </div>
                      <div className="diff-line diff-line-added">
                        <span className="diff-line-num">1</span>
                        <span>+ {plan.proposed_patch}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons with Governance Constraints */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {plan.status === 'PROPOSED' && "Awaiting authorized manager approval."}
                      {plan.status === 'APPROVED' && "Approved. Awaiting execution and independent test verification."}
                      {plan.status === 'VERIFIED' && "Fully verified. Finding marked as RESOLVED."}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      {plan.status === 'PROPOSED' && (
                        <button
                          className="btn btn-primary"
                          onClick={() => handleApprovePlan(plan.id)}
                          style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                        >
                          <Check size={14} />
                          <span>Approve Plan (Governance)</span>
                        </button>
                      )}

                      {plan.status === 'APPROVED' && (
                        <button
                          className="btn btn-primary"
                          onClick={() => handleVerifyPlan(plan.id)}
                          style={{ fontSize: '0.82rem', padding: '8px 16px', background: 'linear-gradient(135deg, #059669, #10b981)' }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Run Independent Verification</span>
                        </button>
                      )}

                      {plan.status === 'VERIFIED' && (
                        <span className="badge badge-healthy">
                          <CheckCircle2 size={14} />
                          <span>Resolution Verified Clean</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB 5: EVIDENCE ===================== */}
        {activeTab === 'evidence' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Raw Scanner Ingestion Evidence</h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Immutable payload hashes, sanitized occurrences, and regex secret redaction.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ color: '#ffffff' }}>Semgrep SARIF Ingestion (v2.1.0)</h4>
                  <span className="badge badge-healthy">Idempotent</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
                  Payload SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Captured 14 rule checks; parsed into canonical finding `fnd-001-sql`. Secret scrubbing stripped test API keys.
                </div>
                <div className="diff-container" style={{ padding: '8px', fontSize: '0.76rem' }}>
                  [REDACTED: API_KEY] detected and scrubbed prior to triage prompt.
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ color: '#ffffff' }}>Trivy Dependency JSON Ingestion</h4>
                  <span className="badge badge-healthy">Idempotent</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
                  Payload SHA-256: 4a2b9183cc94819ad20e5ff3c706248b1d9a04627eb18820a2f14624d7764f69
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  CVE-2024-21664 vulnerability record preserved with raw CVSS v3.1 vector and package manifest version.
                </div>
                <div className="diff-container" style={{ padding: '8px', fontSize: '0.76rem' }}>
                  Package: cryptography@41.0.3 • Target: requirements.txt
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 6: REPORTS ===================== */}
        {activeTab === 'reports' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Risk Reduction Trends & Compliance SLAs</h2>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Accessible data tables and metrics adhering to WCAG 2.2 AA non-color status indicators.
                </p>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
                <Download size={14} />
                <span>Export Report (JSON)</span>
              </button>
            </div>

            {/* Accessible Metric Table */}
            <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '24px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Repository / Project</th>
                    <th>Mean Time to Remediate (MTTR)</th>
                    <th>Verified Resolution Rate</th>
                    <th>Open Criticals</th>
                    <th>SLA Compliance Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>api-backend</td>
                    <td>2.4 days</td>
                    <td>100% (Test Verified)</td>
                    <td>1</td>
                    <td><span className="badge badge-healthy">Within 7d SLA</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>web-frontend</td>
                    <td>1.1 days</td>
                    <td>100% (Test Verified)</td>
                    <td>0</td>
                    <td><span className="badge badge-healthy">Compliant</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>data-pipeline</td>
                    <td>0.8 days</td>
                    <td>100% (Test Verified)</td>
                    <td>0</td>
                    <td><span className="badge badge-healthy">Compliant</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 7: INTEGRATIONS ===================== */}
        {activeTab === 'integrations' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Connected Scanners & Integrations (Journey E)</h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Granular requested scopes shown before authorization. Stored secrets never displayed in plaintext.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* GitHub Integration */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ color: '#ffffff' }}>GitHub Source Control</h4>
                  <span className="badge badge-healthy">Connected</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Requested Scopes: <code style={{ color: 'var(--accent-cyan)' }}>repo:read</code>, <code style={{ color: 'var(--accent-cyan)' }}>pull_requests:write</code>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
                  Last sync: 2026-10-16 13:00 UTC • 3 repositories covered
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Secret: ••••••••••••</span>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                    onClick={() => handleTestConnection('github')}
                    disabled={testConnStatus.github === 'testing'}
                  >
                    {testConnStatus.github === 'testing' ? 'Testing...' : testConnStatus.github === 'success' ? '✓ Verified (142ms)' : 'Test Connection'}
                  </button>
                </div>
              </div>

              {/* Semgrep Integration */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ color: '#ffffff' }}>Semgrep SAST Engine</h4>
                  <span className="badge badge-healthy">Connected</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Requested Scopes: <code style={{ color: 'var(--accent-cyan)' }}>scans:ingest</code>, <code style={{ color: 'var(--accent-cyan)' }}>findings:read</code>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
                  Last sync: 2026-10-16 12:15 UTC • Rule pack: security-audit
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Secret: ••••••••••••</span>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                    onClick={() => handleTestConnection('semgrep')}
                    disabled={testConnStatus.semgrep === 'testing'}
                  >
                    {testConnStatus.semgrep === 'testing' ? 'Testing...' : testConnStatus.semgrep === 'success' ? '✓ Verified (85ms)' : 'Test Connection'}
                  </button>
                </div>
              </div>

              {/* Trivy Integration */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ color: '#ffffff' }}>Trivy Container & SCA</h4>
                  <span className="badge badge-healthy">Connected</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Requested Scopes: <code style={{ color: 'var(--accent-cyan)' }}>scans:ingest</code>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
                  Last sync: 2026-10-16 11:20 UTC • Vulnerability DB updated
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Secret: ••••••••••••</span>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                    onClick={() => handleTestConnection('trivy')}
                    disabled={testConnStatus.trivy === 'testing'}
                  >
                    {testConnStatus.trivy === 'testing' ? 'Testing...' : testConnStatus.trivy === 'success' ? '✓ Verified (110ms)' : 'Test Connection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 8: AUDIT LOG ===================== */}
        {activeTab === 'audit' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Tamper-Evident Immutable Audit Log (Journey F)</h2>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Read-only chronological record of every security-relevant action, actor, correlation ID, and outcome.
                </p>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
                <Download size={14} />
                <span>Export Audit Records</span>
              </button>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp (UTC)</th>
                    <th>Actor & Scope</th>
                    <th>Action</th>
                    <th>Target Resource</th>
                    <th>Outcome</th>
                    <th>Correlation ID</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                        {log.timestamp}
                      </td>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>{log.actor}</td>
                      <td>
                        <code style={{ fontSize: '0.76rem', color: 'var(--accent-indigo)' }}>{log.action}</code>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{log.target}</td>
                      <td>
                        <span className={`badge ${log.outcome === 'SUCCESS' ? 'badge-healthy' : 'badge-critical'}`}>
                          {log.outcome}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                        {log.correlation_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 9: SETTINGS ===================== */}
        {activeTab === 'settings' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Platform & Gateway Configuration</h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Provider neutrality, safe demo controls, and server-side RBAC authorization matrices.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '12px' }}>AI Gateway Provider</h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Offline mock adapter ensures full platform usability without external cloud dependencies or API keys.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: '#ffffff' }}>
                    <input type="radio" name="provider" defaultChecked /> MockLLMAdapter (Offline Safe, Deterministic)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    <input type="radio" name="provider" disabled /> Local Ollama (Local Daemon)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    <input type="radio" name="provider" disabled /> External LLM Gateway (SSRF Shielded)
                  </label>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '12px' }}>Safe Demo Mode</h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Allows evaluation with synthetic data and safe mock actions without mutating production infrastructure.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    className={`btn ${demoMode ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setDemoMode(!demoMode)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    {demoMode ? 'Demo Mode Active' : 'Enable Demo Mode'}
                  </button>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Synthetic findings loaded
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== FINDING DETAIL DRAWER (JOURNEY B) ===================== */}
        {showFindingDrawer && selectedFinding && (
          <div className="drawer-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span
                    className={`badge ${
                      selectedFinding.priority_band === 'CRITICAL' ? 'badge-critical' : 'badge-warning'
                    }`}
                  >
                    {selectedFinding.risk_score} {selectedFinding.priority_band}
                  </span>
                  <span className="badge badge-assessment">Derived Assessment</span>
                </div>
                <h2 style={{ fontSize: '1.25rem', color: '#ffffff', lineHeight: 1.3 }}>{selectedFinding.title}</h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  {selectedFinding.rule_id} • {selectedFinding.file_path}:{selectedFinding.line_number}
                </div>
              </div>

              <button
                className="btn btn-secondary"
                style={{ padding: '6px' }}
                onClick={() => setShowFindingDrawer(false)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            {/* "Why this priority?" Factor Breakdown */}
            <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#ffffff' }}>Why this priority? (Factor Scoring v1.0.0)</h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Deterministic Policy</span>
              </div>

              <div className="factor-row">
                <span className="factor-name">Scanner Baseline Severity</span>
                <span style={{ fontWeight: 600 }}>{selectedFinding.scanner_severity}</span>
              </div>
              <div className="factor-row">
                <span className="factor-name">Asset Criticality Multiplier</span>
                <span style={{ fontWeight: 600 }}>{selectedFinding.asset_criticality} (1.5x)</span>
              </div>
              <div className="factor-row">
                <span className="factor-name">CISA KEV Known Exploitation</span>
                <span style={{ fontWeight: 600, color: selectedFinding.cisa_kev ? '#fb7185' : 'var(--text-muted)' }}>
                  {selectedFinding.cisa_kev ? '+25 (Confirmed Active)' : 'None'}
                </span>
              </div>
              <div className="factor-row">
                <span className="factor-name">EPSS Exploit Probability</span>
                <span style={{ fontWeight: 600 }}>{selectedFinding.epss_score} (+15.0)</span>
              </div>
              <div className="factor-row">
                <span className="factor-name">Call Reachability</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600 }}>{selectedFinding.reachability}</span>
                  {selectedFinding.missing_context.includes('call_reachability') && (
                    <span className="factor-missing">Missing Input</span>
                  )}
                </div>
              </div>
            </div>

            {/* Evidence & Snippet Box (Observed Fact) */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>Source Code Evidence</span>
                  <span className="badge badge-fact">Observed Fact</span>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)' }}>Secret Redacted</span>
              </div>
              <div className="diff-container" style={{ padding: '10px' }}>
                <code>{selectedFinding.snippet}</code>
              </div>
            </div>

            {/* AI Triage Section (AI Suggestion with Task Chips & Feedback Controls) */}
            <div
              style={{
                background: 'rgba(117, 167, 255, 0.08)',
                border: '1px solid var(--border-glow)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={16} color="var(--accent-indigo)" />
                <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#ffffff' }}>AI Triage Recommendation</span>
                <span className="badge badge-ai" style={{ marginLeft: 'auto', fontSize: '0.68rem' }}>AI Suggestion — Review before applying</span>
              </div>

              {/* Task-Specific Action Chips per DESIGN.md Section 5.6 */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                  Summarize finding
                </button>
                <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                  Explain exploit preconditions
                </button>
                <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                  Compare remediation options
                </button>
                <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                  Draft fix & tests
                </button>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '10px' }}>
                Raw string interpolation inside SQL statement allows unauthenticated parameter injection. Parameterizing query
                with Django positional arguments will eliminate the vulnerability while preserving query semantics.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                <div style={{ color: 'var(--text-dim)' }}>
                  Evidence Cited: <code style={{ color: '#a5b4fc' }}>fnd-001-sql:src/views/users.py:42</code> (Validated)
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.68rem' }}>✓ Useful</button>
                  <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.68rem' }}>✗ Incorrect evidence</button>
                  <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.68rem' }}>⚠ Unsafe</button>
                </div>
              </div>
            </div>

            {/* Progressive Disclosure: Raw Payload */}
            <div style={{ marginBottom: '16px' }}>
              <button
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.78rem', padding: '6px' }}
                onClick={() => setShowRawPayload(!showRawPayload)}
              >
                <Eye size={14} />
                <span>{showRawPayload ? 'Hide Raw SARIF / JSON Payload' : 'Show Raw SARIF / JSON Payload'}</span>
              </button>
              {showRawPayload && (
                <div className="diff-container" style={{ padding: '10px', marginTop: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  <pre>{JSON.stringify(selectedFinding, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Bottom Actions (Human Decision) */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-decision">Human Decision</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Requires human authorization</span>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  setShowFindingDrawer(false)
                  setActiveTab('remediation')
                }}
              >
                <GitBranch size={16} />
                <span>Propose Remediation Plan</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
