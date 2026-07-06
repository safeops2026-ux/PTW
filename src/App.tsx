import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ExportPanel } from './components/ExportPanel'
import { PermitBoard } from './components/PermitBoard'
import { PermitComposer } from './components/PermitComposer'
import { AdminTemplates } from './components/AdminTemplates'
import { useAuth } from './context/AuthContext'
import { getPermits, subscribeToPermits, getPermitConfig, subscribeToConfig } from './services/ptw'
import type { PermitRecord, CompanyConfig } from './types/permit'

function App() {
  const { profile } = useAuth()
  const [permits, setPermits] = useState<PermitRecord[]>([])
  const [loadingPermits, setLoadingPermits] = useState(true)
  const [config, setConfig] = useState<CompanyConfig | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [siteFilter, setSiteFilter] = useState('All')
  const [selectedPermitIds, setSelectedPermitIds] = useState<string[]>([])

  const refreshPermits = async () => {
    setLoadingPermits(true)
    const data = await getPermits()
    setPermits(data)
    setLoadingPermits(false)
  }

  useEffect(() => {
    let firstLoad = true
    const unsubPermits = subscribeToPermits((data) => {
      setPermits(data)
      if (firstLoad) {
        setLoadingPermits(false)
        firstLoad = false
      }
    })

    let unsubConfig: (() => void) | undefined
    void (async () => {
      const data = await getPermitConfig()
      setConfig(data)
      unsubConfig = subscribeToConfig(setConfig)
    })()

    return () => {
      unsubPermits()
      unsubConfig?.()
    }
  }, [])

  const totals = useMemo(() => {
    const total = permits.length
    const closedStatuses = ['Closed', 'Cancelled', 'Rejected']
    const closed = permits.filter((permit) => closedStatuses.includes(permit.status)).length
    const pending = permits.filter((permit) => permit.status === 'Pending Review' || permit.status === 'Pending Approval').length
    const open = total - closed
    return { total, open, pending, closed }
  }, [permits])

  const filteredPermits = useMemo(() => {
    return permits.filter((permit) => {
      const normalizedSearch = searchTerm.trim().toLowerCase()
      const matchesSearch =
        normalizedSearch === '' ||
        permit.title.toLowerCase().includes(normalizedSearch) ||
        permit.description.toLowerCase().includes(normalizedSearch) ||
        permit.permitType.toLowerCase().includes(normalizedSearch) ||
        permit.siteId.toLowerCase().includes(normalizedSearch)

      const matchesStatus = statusFilter === 'All' || permit.status === statusFilter
      const matchesType = typeFilter === 'All' || permit.permitType === typeFilter
      const matchesSite = siteFilter === 'All' || permit.siteId === siteFilter

      return matchesSearch && matchesStatus && matchesType && matchesSite
    })
  }, [permits, searchTerm, statusFilter, typeFilter, siteFilter])

  const permitsForExport = useMemo(() => {
    if (selectedPermitIds.length > 0) {
      // If specific permits are selected, export only those
      return permits.filter(p => selectedPermitIds.includes(p.id!))
    }
    // Otherwise, export the currently filtered list
    return filteredPermits
  }, [selectedPermitIds, filteredPermits, permits])

  return (
    <section className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>SafeLink PTW overview</h2>
          <p className="muted">
            Role-based permit workflow with Firebase Auth, Firestore, and exports.
          </p>
          <p className="muted">
            Signed in as <strong>{profile?.name ?? profile?.email}</strong> · role: <span className="role-pill">{profile?.role}</span>
          </p>
        </div>
        <div className="summary-card">
          <article className="metric-card">
            <span className="metric-value">{totals.total}</span>
            <span className="metric-label">Total permits</span>
          </article>
          <article className="metric-card">
            <span className="metric-value">{totals.open}</span>
            <span className="metric-label">Open permits</span>
          </article>
          <article className="metric-card">
            <span className="metric-value">{totals.pending}</span>
            <span className="metric-label">Awaiting approval</span>
          </article>
          <article className="metric-card">
            <span className="metric-value">{totals.closed}</span>
            <span className="metric-label">Closed / cancelled</span>
          </article>
        </div>
      </div>

      <div className="dashboard-grid dashboard-grid-main-sidebar">
        <PermitComposer onCreated={() => void refreshPermits()} />
        <div className="card info-card">
          <h3>GSTC / GSPL ready</h3>
          <ul>
            <li>Raise GSTC-style permits with site, type, description, and custom safety fields.</li>
            <li>Use workflow status updates for review, approval, field execution, and closure.</li>
            <li>Export permit records for audit, reporting, and contractor handover.</li>
          </ul>
          <p className="muted">
            Default roles and permit types are now GSTC-focused, including work at height, excavation, line breaking, mechanical isolation, and permit revalidation.
          </p>
        </div>
      </div>

      {profile && ['Admin', 'Manager'].includes(profile.role) ? (
        <div className="dashboard-grid">
          <AdminTemplates />
        </div>
      ) : null}

      <div className="dashboard-grid">
        <PermitBoard
          permits={filteredPermits}
          allPermits={permits}
          config={config}
          search={searchTerm}
          setSearch={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          selectedPermitIds={selectedPermitIds}
          setSelectedPermitIds={setSelectedPermitIds}
          siteFilter={siteFilter}
          setSiteFilter={setSiteFilter}
          onUpdated={() => void refreshPermits()} />
        <ExportPanel permits={permitsForExport} />
      </div>

      {loadingPermits ? <p className="muted">Loading permits…</p> : null}
    </section>
  )
}

export default App
