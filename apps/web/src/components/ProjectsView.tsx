import React from 'react'
import { FolderGit2, ArrowRight } from 'lucide-react'

interface ProjectsViewProps {
  onSelectProjectFilter: (projectSlug: string) => void
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onSelectProjectFilter }) => {
  const projects = [
    {
      id: 'proj-001',
      name: 'api-backend',
      slug: 'api-backend',
      language: 'Python (FastAPI)',
      criticality: 'CRITICAL',
      openFindings: 2,
      criticalFindings: 1,
      targetBranch: 'main',
      lastScan: '12 mins ago',
      description: 'Core REST API service handling multi-tenant authorization, tokens, and data persistence.',
    },
    {
      id: 'proj-002',
      name: 'web-frontend',
      slug: 'web-frontend',
      language: 'TypeScript (React / Vite)',
      criticality: 'HIGH',
      openFindings: 1,
      criticalFindings: 0,
      targetBranch: 'main',
      lastScan: '2 hours ago',
      description: 'Single-page web application dashboard for AppSec analysts and engineering teams.',
    },
    {
      id: 'proj-003',
      name: 'data-pipeline',
      slug: 'data-pipeline',
      language: 'Python (Worker)',
      criticality: 'MEDIUM',
      openFindings: 0,
      criticalFindings: 0,
      targetBranch: 'master',
      lastScan: '1 day ago',
      description: 'Asynchronous event stream consumers, scanner ingestion queue, and threat feed synchronizers.',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-lg bg-[#0E1524] border border-[#1E2B45] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 font-sans">
            <FolderGit2 className="w-4 h-4 text-sky-400" />
            Monitored Projects & Asset Criticality Boundaries
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Asset criticality directly modulates the risk prioritization score of detected vulnerabilities.
          </p>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="p-4 rounded-lg bg-[#0E1524] border border-[#1E2B45] hover:border-[#273756] transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100 text-sm font-sans flex items-center gap-1.5">
                  <FolderGit2 className="w-4 h-4 text-slate-400" />
                  {proj.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    proj.criticality === 'CRITICAL'
                      ? 'band-critical'
                      : proj.criticality === 'HIGH'
                      ? 'band-high'
                      : 'band-medium'
                  }`}
                >
                  {proj.criticality}
                </span>
              </div>

              <div className="text-[11px] font-mono text-slate-400">{proj.language}</div>

              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                {proj.description}
              </p>

              <div className="pt-2 border-t border-[#1E2B45] flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Open Risk:</span>
                <span className="font-bold text-slate-200">
                  {proj.openFindings} findings ({proj.criticalFindings} Crit)
                </span>
              </div>
            </div>

            <button
              onClick={() => onSelectProjectFilter(proj.slug)}
              className="w-full py-1.5 rounded btn-secondary text-xs font-medium flex items-center justify-center gap-1 text-slate-300 hover:text-white"
            >
              Filter Findings by Project <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
export default ProjectsView
