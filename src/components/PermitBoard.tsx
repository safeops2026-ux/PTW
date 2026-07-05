import { useEffect, useMemo, useState } from 'react'
import { getPermitConfig, subscribeToConfig, updatePermitStatus, getAuditTrail } from '../services/ptw'
import type { PermitRecord, AuditEntry } from '../types/permit'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'

function formatDate(value: unknown) {
    if (!value) return 'Unknown'
    if (typeof value === 'string') return value
    if (typeof value === 'number') return new Date(value).toLocaleString()
    if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        return value.toDate().toLocaleString()
    }
    return String(value)
}

export function PermitBoard({ permits, onUpdated }: { permits: PermitRecord[]; onUpdated: () => void }) {
    const { user, profile } = useAuth()
    const { notify } = useNotification()
    const [message, setMessage] = useState('')
    const [workflow, setWorkflow] = useState<string[]>([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [typeFilter, setTypeFilter] = useState('All')
    const [siteFilter, setSiteFilter] = useState('All')
    const [expandedPermitId, setExpandedPermitId] = useState<string | null>(null)
    const [auditByPermit, setAuditByPermit] = useState<Record<string, AuditEntry[]>>({})
    const [loadingAudit, setLoadingAudit] = useState<Record<string, boolean>>({})
    const [commentMap, setCommentMap] = useState<Record<string, string>>({})

    useEffect(() => {
        let unsub: (() => void) | undefined
        void (async () => {
            const data = await getPermitConfig()
            if (data?.workflow) setWorkflow(data.workflow)
            else setWorkflow(['Draft', 'Pending Review', 'Pending Approval', 'Approved'])

            unsub = subscribeToConfig((cfg) => {
                if (cfg.workflow) setWorkflow(cfg.workflow)
            })
        })()

        return () => unsub?.()
    }, [])

    const statusSummary = useMemo(() => {
        const summary = new Map<string, number>()
        permits.forEach((permit) => {
            summary.set(permit.status, (summary.get(permit.status) ?? 0) + 1)
        })
        return summary
    }, [permits])

    const typeVariants = useMemo(() => Array.from(new Set(permits.map((permit) => permit.permitType))).sort(), [permits])
    const siteVariants = useMemo(() => Array.from(new Set(permits.map((permit) => permit.siteId))).sort(), [permits])
    const statusOptions = useMemo(() => Array.from(new Set(permits.map((permit) => permit.status))).sort(), [permits])

    const filteredPermits = useMemo(() => {
        return permits.filter((permit) => {
            const normalizedSearch = search.trim().toLowerCase()
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
    }, [permits, search, statusFilter, typeFilter, siteFilter])

    const approverRoles = ['HSE', 'Issuer', 'Site Manager', 'Safety Officer', 'Admin']

    const handleUpdateStatus = async (permitId: string, status: string) => {
        const permit = permits.find((item) => item.id === permitId)
        if (!permit || !user) {
            setMessage('Sign in to update a permit.')
            return
        }

        if (status === permit.status) {
            setMessage('Permit is already at that status.')
            return
        }

        const isCreator = profile && permit.createdBy === profile.uid
        const isApprover = profile && approverRoles.includes(profile.role)
        if (!isCreator && !isApprover) {
            setMessage('You do not have permission to change this permit status.')
            return
        }

        try {
            await updatePermitStatus(permitId, status, `Status updated to ${status} from dashboard`, user.uid)
            const successMessage = `Permit moved to ${status}.`
            setMessage(successMessage)
            notify(successMessage, 'success')
            onUpdated()
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Update failed.'
            setMessage(errorMessage)
            notify(errorMessage, 'error')
        }
    }

    const loadAuditFor = async (permitId: string) => {
        setLoadingAudit((s) => ({ ...s, [permitId]: true }))
        try {
            const data = await getAuditTrail(permitId)
            setAuditByPermit((s) => ({ ...s, [permitId]: data }))
        } catch (err) {
            // ignore
        } finally {
            setLoadingAudit((s) => ({ ...s, [permitId]: false }))
        }
    }

    const handleAction = async (permitId: string, status: string) => {
        if (!user) {
            setMessage('Sign in to take action on permits.')
            return
        }
        const comment = (commentMap[permitId] || '').trim() || `Action: ${status}`
        try {
            await updatePermitStatus(permitId, status, comment, user.uid)
            setMessage(`Permit ${status}`)
            notify(`Permit ${status}`, 'success')
            setCommentMap((s) => ({ ...s, [permitId]: '' }))
            onUpdated()
            // refresh audit
            void loadAuditFor(permitId)
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Action failed.'
            setMessage(errMsg)
            notify(errMsg, 'error')
        }
    }

    return (
        <section className="card permit-board-card">
            <div className="board-header">
                <div>
                    <h3>Permit board</h3>
                    <p className="muted">Filter, search, and advance permits through the workflow.</p>
                </div>
                <div className="status-summary">
                    {Array.from(statusSummary.entries()).map(([status, count]) => (
                        <span key={status} className="summary-pill">
                            {status}: {count}
                        </span>
                    ))}
                </div>
            </div>

            <div className="board-controls">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, description, type, or site"
                />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="All">All statuses</option>
                    {statusOptions.map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                    <option value="All">All permit types</option>
                    {typeVariants.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
                <select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}>
                    <option value="All">All sites</option>
                    {siteVariants.map((site) => (
                        <option key={site} value={site}>
                            {site}
                        </option>
                    ))}
                </select>
            </div>

            {message ? <p className="message">{message}</p> : null}

            {filteredPermits.length === 0 ? (
                <div className="empty-state">
                    <p>No matching permits. Adjust filters or clear search.</p>
                </div>
            ) : (
                <div className="permit-list">
                        {filteredPermits.map((permit) => {
                            const canMove = Boolean(user) && workflow.length > 0 && (profile ? (['HSE', 'Issuer', 'Site Manager', 'Safety Officer', 'Admin'].includes(profile.role) || permit.createdBy === profile.uid) : false)
                            const expanded = expandedPermitId === permit.id

                        return (
                            <article key={permit.id} className="permit-item">
                                <div className="permit-summary">
                                    <div className="permit-title-row">
                                        <strong>{permit.title}</strong>
                                        <button
                                            type="button"
                                            className="tertiary-button"
                                            onClick={() => setExpandedPermitId(expanded ? null : permit.id ?? null)}
                                        >
                                            {expanded ? 'Hide details' : 'Show details'}
                                        </button>
                                    </div>
                                    <p>{permit.description}</p>
                                    <div className="permit-tags">
                                        <span>{permit.permitType}</span>
                                        <span>{permit.siteId}</span>
                                        <span>{permit.assignedTo?.join(', ')}</span>
                                    </div>
                                </div>
                                <div className="permit-meta">
                                    <span className="status-badge">{permit.status}</span>
                                    {workflow.length > 0 ? (
                                        <select
                                            value={permit.status}
                                            onChange={(event) => void handleUpdateStatus(permit.id ?? '', event.target.value)}
                                            disabled={!canMove}
                                        >
                                            {workflow.map((status) => (
                                                <option key={status} value={status}>
                                                    {status}
                                                </option>
                                            ))}
                                        </select>
                                    ) : null}
                                </div>
                                {expanded ? (
                                    <div className="permit-details">
                                        <div>
                                            <strong>Created by:</strong> {permit.createdBy}
                                        </div>
                                        <div>
                                            <strong>Created:</strong> {formatDate(permit.createdAt)}
                                        </div>
                                        <div>
                                            <strong>Updated:</strong> {formatDate(permit.updatedAt)}
                                        </div>
                                        {permit.customFields && Object.keys(permit.customFields).length > 0 ? (
                                            <div className="permit-custom-fields">
                                                <strong>Custom fields</strong>
                                                <ul>
                                                    {Object.entries(permit.customFields).map(([key, value]) => (
                                                        <li key={key}>
                                                            <strong>{key}:</strong> {value}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : null}

                                        <div className="approval-section">
                                            <label className="field-label">Review comment</label>
                                            <textarea
                                                value={commentMap[permit.id ?? ''] ?? ''}
                                                onChange={(e) => setCommentMap((s) => ({ ...s, [permit.id ?? '']: e.target.value }))}
                                                placeholder="Add a note for the approver"
                                                rows={2}
                                            />

                                            <div className="approval-actions">
                                                {profile && ((['HSE', 'Issuer', 'Site Manager', 'Safety Officer', 'Admin'].includes(profile.role)) || (permit.assignedTo ?? []).includes(profile.role)) ? (
                                                    <>
                                                        <button type="button" className="secondary-button" onClick={() => void handleAction(permit.id ?? '', 'Pending Review')}>
                                                            Request review
                                                        </button>
                                                        <button type="button" onClick={() => void handleAction(permit.id ?? '', 'Approved')}>
                                                            Approve
                                                        </button>
                                                        <button type="button" className="tertiary-button" onClick={() => void handleAction(permit.id ?? '', 'Rejected')}>
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="muted">You do not have approval permissions for this permit.</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="audit-trail">
                                            <strong>Audit trail</strong>
                                            {loadingAudit[permit.id ?? ''] ? (
                                                <div className="muted">Loading history...</div>
                                            ) : auditByPermit[permit.id ?? ''] && auditByPermit[permit.id ?? ''].length > 0 ? (
                                                <ul>
                                                    {auditByPermit[permit.id ?? ''].map((entry) => (
                                                        <li key={entry.id}>
                                                            <div><strong>{entry.action}</strong> — {entry.message}</div>
                                                            <div className="muted">By {entry.actorId} at {formatDate(entry.createdAt)}</div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="muted">No history yet.</div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </article>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
