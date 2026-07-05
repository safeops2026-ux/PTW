import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ExportPanel } from './components/ExportPanel'
import { PermitBoard } from './components/PermitBoard'
import { PermitComposer } from './components/PermitComposer'
import { AdminTemplates } from './components/AdminTemplates'
import { useAuth } from './context/AuthContext'
import { getPermits, subscribeToPermits } from './services/ptw'
import type { PermitRecord } from './types/permit'

function App() {
  const { profile } = useAuth()
  const [permits, setPermits] = useState<PermitRecord[]>([])
  const [loadingPermits, setLoadingPermits] = useState(true)

  const refreshPermits = async () => {
    setLoadingPermits(true)
    const data = await getPermits()
    setPermits(data)
    setLoadingPermits(false)
  }

  useEffect(() => {
    let firstLoad = true
    const unsubscribe = subscribeToPermits((data) => {
      setPermits(data)
      if (firstLoad) {
        setLoadingPermits(false)
        firstLoad = false
      }
    })
    return () => unsubscribe()
  }, [])

  const totals = useMemo(() => {
    const total = permits.length
    const closedStatuses = ['Closed', 'Cancelled', 'Rejected']
    const closed = permits.filter((permit) => closedStatuses.includes(permit.status)).length
    const pending = permits.filter((permit) => permit.status === 'Pending Review' || permit.status === 'Pending Approval').length
    const open = total - closed
    return { total, open, pending, closed }
  }, [permits])

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

      <div className="dashboard-grid">
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
        <PermitBoard permits={permits} onUpdated={() => void refreshPermits()} />
        <ExportPanel permits={permits} />
      </div>

      {loadingPermits ? <p className="muted">Loading permits…</p> : null}
    </section>
  )
}

export default App
