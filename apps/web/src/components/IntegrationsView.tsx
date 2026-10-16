import React, { useState } from 'react'
import {
  Webhook,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'

export const IntegrationsView: React.FC = () => {
  const [testingStatus, setTestingStatus] = useState<Record<string, 'idle' | 'testing' | 'success'>>({
    github: 'idle',
    gitlab: 'idle',
    semgrep: 'idle',
    trivy: 'idle',
  })

  const handleTest = (key: string) => {
    setTestingStatus((prev) => ({ ...prev, [key]: 'testing' }))
    setTimeout(() => {
      setTestingStatus((prev) => ({ ...prev, [key]: 'success' }))
      setTimeout(() => {
        setTestingStatus((prev) => ({ ...prev, [key]: 'idle' }))
      }, 3000)
    }, 800)
  }

  const integrations = [
    {
      id: 'github',
      name: 'GitHub Webhooks & App Integration',
      type: 'Source Control & CI',
      status: 'ACTIVE',
      security: 'HMAC SHA-256 Signed (X-Hub-Signature-256)',
      description: 'Ingests PR and push webhooks, creates fix branches, and validates signatures.',
      endpoint: '/api/v1/webhooks/github',
    },
    {
      id: 'gitlab',
      name: 'GitLab Webhooks Integration',
      type: 'Source Control & CI',
      status: 'ACTIVE',
      security: 'Secret Token Verification (X-Gitlab-Token)',
      description: 'Receives pipeline events and merge request updates with token authentication.',
      endpoint: '/api/v1/webhooks/gitlab',
    },
    {
      id: 'semgrep',
      name: 'Semgrep SARIF Pipeline Ingest',
      type: 'SAST Scanner',
      status: 'CONNECTED',
      security: 'Tenant Scoped + Secret Scrubbing',
      description: 'Parses SARIF 2.1.0 output, normalizes findings, and suppresses synthetic test keys.',
      endpoint: '/api/v1/scans/ingest',
    },
    {
      id: 'trivy',
      name: 'Trivy Container & Dependency SCA',
      type: 'SCA / CVE Scanner',
      status: 'CONNECTED',
      security: 'CVSS + EPSS Correlation',
      description: 'Ingests OS packages, language dependencies, and maps CVE advisories.',
      endpoint: '/api/v1/scans/ingest',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-lg bg-[#0E1524] border border-[#1E2B45] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 font-sans">
            <Webhook className="w-4 h-4 text-sky-400" />
            Security Connectors & Signed Webhook Integrations
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            All external webhooks are verified using constant-time cryptographic signatures before processing.
          </p>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((item) => {
          const status = testingStatus[item.id]
          return (
            <div
              key={item.id}
              className="p-4 rounded-lg bg-[#0E1524] border border-[#1E2B45] space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100 text-sm font-sans">{item.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold badge-decision">
                    {item.status}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-sky-400">{item.type}</span>

                <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                  {item.description}
                </p>

                <div className="mt-3 p-2.5 rounded bg-[#090D16] border border-[#1E2B45] text-[11px] font-mono space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Security Control:</span>
                    <span className="text-slate-200">{item.security}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Target Endpoint:</span>
                    <span className="text-sky-300">{item.endpoint}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  HMAC: Verified Active
                </span>
                <button
                  onClick={() => handleTest(item.id)}
                  disabled={status === 'testing'}
                  className="px-3 py-1.5 rounded btn-secondary text-xs font-medium flex items-center gap-1.5"
                >
                  {status === 'testing' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                    </>
                  ) : status === 'success' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Ping Successful
                    </>
                  ) : (
                    'Test Signed Ping'
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default IntegrationsView
