import { useEffect, useState } from 'react'
import './App.css'
import { ExportPanel } from './components/ExportPanel'
import { PermitBoard } from './components/PermitBoard'
import { PermitComposer } from './components/PermitComposer'
import { useAuth } from './context/AuthContext'
import { getPermits } from './services/ptw'
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
    void refreshPermits()
  }, [])

  return (
    <section className="dashboard">
      <h2>SafeLink PTW Overview</h2>
      <p>Role-based permit workflow with Firebase Auth, Firestore, and audit trail support.</p>
      <p className="muted">Signed in as {profile?.email} · role: {profile?.role}</p>

      <div className="card-grid">
        <PermitComposer onCreated={() => void refreshPermits()} />
        <div className="card">
          <h3>Access</h3>
          <p className="muted">Your workflow permissions are determined by your role.</p>
          <p>
            {profile?.role === 'Admin' && 'Admin users can raise and manage permits across the workflow.'}
            {profile?.role === 'Field Supervisor' && 'Field Supervisors can raise permits and send them for review.'}
            {profile?.role === 'Area Authority' && 'Area Authorities can review and advance permits to approval.'}
            {profile?.role === 'HSE Officer' && 'HSE Officers can approve permits and close the workflow.'}
            {!profile && 'Visit the login or signup page to sign in and access the permit dashboard.'}
          </p>
          {!profile ? (
            <p>
              <a href="/login">Login</a> or <a href="/signup">Sign up</a>.
            </p>
          ) : null}
        </div>
      </div>

      <div className="card-grid">
        <PermitBoard permits={permits} onUpdated={() => void refreshPermits()} />
        <ExportPanel permits={permits} />
      </div>

      {loadingPermits ? <p className="muted">Loading permits…</p> : null}
    </section>
  )
}

export default App
