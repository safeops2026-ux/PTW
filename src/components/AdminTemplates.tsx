import { useEffect, useState } from 'react'
import { getPermitConfig, subscribeToConfig, updatePermitConfig } from '../services/ptw'
import { useAuth } from '../context/AuthContext'

export function AdminTemplates() {
    const { profile } = useAuth()
    const [config, setConfig] = useState<any>(null)
    const [newType, setNewType] = useState('')
    const [newSite, setNewSite] = useState('')
    const [newWorkflowStage, setNewWorkflowStage] = useState('')
    const [message, setMessage] = useState('')

    useEffect(() => {
        let unsub: (() => void) | undefined
        void (async () => {
            const cfg = await getPermitConfig()
            setConfig(cfg)
            unsub = subscribeToConfig((c) => setConfig(c))
        })()
        return () => unsub?.()
    }, [])

    if (!profile || !['Admin', 'Manager'].includes(profile.role)) {
        return null
    }

    const addType = async () => {
        if (!newType.trim()) return
        const next = Array.from(new Set([...(config?.permitTypes ?? []), newType.trim()]))
        await updatePermitConfig({ permitTypes: next })
        setNewType('')
        setMessage('Permit types updated')
    }

    const removeType = async (t: string) => {
        const next = (config?.permitTypes ?? []).filter((x: string) => x !== t)
        await updatePermitConfig({ permitTypes: next })
        setMessage('Permit types updated')
    }

    const addSite = async () => {
        if (!newSite.trim()) return
        const next = Array.from(new Set([...(config?.sites ?? []), newSite.trim()]))
        await updatePermitConfig({ sites: next })
        setNewSite('')
        setMessage('Sites updated')
    }

    const removeSite = async (s: string) => {
        const next = (config?.sites ?? []).filter((x: string) => x !== s)
        await updatePermitConfig({ sites: next })
        setMessage('Sites updated')
    }

    const addWorkflowStage = async () => {
        if (!newWorkflowStage.trim()) return
        const next = Array.from(new Set([...(config?.workflow ?? []), newWorkflowStage.trim()]))
        await updatePermitConfig({ workflow: next })
        setNewWorkflowStage('')
        setMessage('Workflow stages updated')
    }

    const removeWorkflowStage = async (stage: string) => {
        const next = (config?.workflow ?? []).filter((x: string) => x !== stage)
        await updatePermitConfig({ workflow: next })
        setMessage('Workflow stages updated')
    }

    return (
        <section className="card admin-card">
            <h3>Admin: Permit templates & config</h3>
            <p className="muted">Manage permit types and site lists used by the composer and board.</p>

            <div>
                <h4>Permit types</h4>
                <div className="tag-list">
                    {(config?.permitTypes ?? []).map((t: string) => (
                        <span key={t} className="tag">
                            <span>{t}</span>
                            <button type="button" className="tertiary-button" onClick={() => void removeType(t)}>Remove</button>
                        </span>
                    ))}
                </div>
                <div style={{ marginTop: 8 }}>
                    <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="New permit type" />
                    <button type="button" onClick={() => void addType()}>Add</button>
                </div>
            </div>

            <div style={{ marginTop: 16 }}>
                <h4>Sites</h4>
                <div className="tag-list">
                    {(config?.sites ?? []).map((s: string) => (
                        <span key={s} className="tag">
                            <span>{s}</span>
                            <button type="button" className="tertiary-button" onClick={() => void removeSite(s)}>Remove</button>
                        </span>
                    ))}
                </div>
                <div style={{ marginTop: 8 }}>
                    <input value={newSite} onChange={(e) => setNewSite(e.target.value)} placeholder="New site" />
                    <button type="button" onClick={() => void addSite()}>Add</button>
                </div>
            </div>

            <div style={{ marginTop: 16 }}>
                <h4>Workflow Stages</h4>
                <p className="muted">Define the sequence of statuses for a permit's lifecycle.</p>
                <div className="tag-list">
                    {(config?.workflow ?? []).map((stage: string) => (
                        <span key={stage} className="tag">
                            <span>{stage}</span>
                            <button type="button" className="tertiary-button" onClick={() => void removeWorkflowStage(stage)}>Remove</button>
                        </span>
                    ))}
                </div>
                <div style={{ marginTop: 8 }}>
                    <input value={newWorkflowStage} onChange={(e) => setNewWorkflowStage(e.target.value)} placeholder="New workflow stage" />
                    <button type="button" onClick={() => void addWorkflowStage()}>Add</button>
                </div>
            </div>

            {message ? <p className="message">{message}</p> : null}
        </section>
    )
}
