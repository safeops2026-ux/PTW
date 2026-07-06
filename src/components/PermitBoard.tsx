import { useEffect, useMemo, useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { updatePermitStatus, getAuditTrail, bulkUpdatePermitStatus, bulkDeletePermits } from '../services/ptw'
import type { PermitRecord, AuditEntry, CompanyConfig } from '../types/permit'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import { PermitCard } from './PermitCard'

interface PermitBoardProps {
    permits: PermitRecord[]
    allPermits: PermitRecord[]
    config: CompanyConfig | null
    onUpdated: () => void
    search: string
    setSearch: (s: string) => void
    statusFilter: string
    setStatusFilter: (s: string) => void
    typeFilter: string
    setTypeFilter: (s: string) => void
    siteFilter: string
    setSiteFilter: (s: string) => void
    selectedPermitIds: string[]
    setSelectedPermitIds: (ids: string[]) => void
}

export function PermitBoard({ permits: filteredPermits, allPermits, config, onUpdated, search, setSearch, statusFilter, setStatusFilter, typeFilter, setTypeFilter, siteFilter, setSiteFilter, selectedPermitIds, setSelectedPermitIds }: PermitBoardProps) {
    const { user, profile } = useAuth()
    const { notify } = useNotification()
    const [message, setMessage] = useState('')
    const [workflow, setWorkflow] = useState<string[]>([])
    const [expandedPermitId, setExpandedPermitId] = useState<string | null>(null)
    const [auditByPermit, setAuditByPermit] = useState<Record<string, AuditEntry[]>>({})
    const [loadingAudit, setLoadingAudit] = useState<Record<string, boolean>>({})
    const [commentMap, setCommentMap] = useState<Record<string, string>>({})

    useEffect(() => {
        let unsub: (() => void) | undefined
        if (config?.workflow) {
            setWorkflow(config.workflow)
        } else {
            setWorkflow(['Draft', 'Pending Review', 'Pending Approval', 'Approved', 'Work in Progress', 'Closed', 'Rejected', 'Cancelled'])
        }

        return () => unsub?.()
    }, [config])

    const statusSummary = useMemo(() => {
        const summary = new Map<string, number>()
        allPermits.forEach((permit) => {
            summary.set(permit.status, (summary.get(permit.status) ?? 0) + 1)
        })
        return summary
    }, [allPermits])

    const typeVariants = useMemo(() => Array.from(new Set(allPermits.map((permit) => permit.permitType))).sort(), [allPermits])
    const siteVariants = useMemo(() => Array.from(new Set([...(config?.sites ?? []), ...allPermits.map((permit) => permit.siteId)])).sort(), [config, allPermits])
    const statusOptions = useMemo(() => Array.from(new Set(allPermits.map((permit) => permit.status))).sort(), [allPermits])


    const handleUpdateStatus = async (permitId: string, status: string) => {
        const permit = allPermits.find((item) => item.id === permitId)
        if (!permit || !user) {
            setMessage('Sign in to update a permit.')
            return
        }

        if (status === permit.status) {
            setMessage('Permit is already at that status.')
            return
        }

        const isCreator = profile && permit.createdBy === profile.uid
        // Allow any authenticated user with a role to update status
        if (!isCreator && !profile?.role) {
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

    const togglePermitExpansion = (permitId: string) => {
        const newExpandedId = expandedPermitId === permitId ? null : permitId
        setExpandedPermitId(newExpandedId)
        // if we are expanding and audit trail is not loaded, load it.
        if (newExpandedId && !auditByPermit[newExpandedId]) void loadAuditFor(newExpandedId)
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

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedPermitIds(filteredPermits.map(p => p.id!))
        } else {
            setSelectedPermitIds([])
        }
    }

    const handleSelectOne = (permitId: string, isSelected: boolean) => {
        if (isSelected) {
            setSelectedPermitIds([...selectedPermitIds, permitId])
        } else {
            setSelectedPermitIds(selectedPermitIds.filter(id => id !== permitId))
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over) {
            const permitId = String(active.id)
            // The `over.id` can be a column ID (status) or another permit ID.
            // The `over.data.current?.sortable.containerId` gives us the column ID reliably.
            const newStatus = over.data.current?.sortable?.containerId ?? over.id;

            const permit = allPermits.find(p => p.id === permitId);

            if (permit && permit.status !== newStatus && workflow.includes(String(newStatus))) {
                void handleUpdateStatus(permitId, newStatus)
            }
        }
    }

    const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
        if (selectedPermitIds.length === 0) {
            notify('No permits selected.', 'error')
            return
        }

        const actionVerb = action === 'delete' ? 'deleted' : (action === 'approve' ? 'approved' : 'rejected')
        const status = action === 'approve' ? 'Approved' : 'Rejected'

        try {
            // Optimistic UI update
            onUpdated() // This will trigger a re-fetch from App.tsx
            notify(`${selectedPermitIds.length} permits will be ${actionVerb}.`, 'info')
            setSelectedPermitIds([]) // Clear selection immediately

            if (action === 'delete') {
                await bulkDeletePermits(selectedPermitIds, user!.uid)
            } else {
                await bulkUpdatePermitStatus(selectedPermitIds, status, `Bulk ${actionVerb} by ${profile?.name}`, user!.uid)
            }

            notify(`Bulk action successful.`, 'success')
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Bulk action failed.'
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
                <div className="checkbox-item select-all-control">
                    <input
                        type="checkbox"
                        id="select-all"
                        onChange={handleSelectAll}
                        checked={filteredPermits.length > 0 && selectedPermitIds.length === filteredPermits.length}
                    />
                    <label htmlFor="select-all">Select All</label>
                </div>
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

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="kanban-board">
                    {workflow.map(status => (
                        <SortableContext key={status} id={status} items={filteredPermits.filter(p => p.status === status).map(p => p.id!)} strategy={verticalListSortingStrategy}>
                            <div id={status} className="kanban-column">
                                <div className="kanban-column-header">
                                    <h3>{status}</h3>
                                    <span className="kanban-column-count">{filteredPermits.filter(p => p.status === status).length}</span>
                                </div>
                                <div className="kanban-column-body">
                                    {filteredPermits.filter(p => p.status === status).map(permit => (
                                        <PermitCard
                                            key={permit.id}
                                            permit={permit}
                                            expanded={expandedPermitId === permit.id}
                                            canMove={Boolean(user) && workflow.length > 0 && (profile ? (Boolean(profile.role) || permit.createdBy === profile.uid) : false)}
                                            workflow={workflow}
                                            profile={profile}
                                            commentMap={commentMap}
                                            loadingAudit={loadingAudit}
                                            auditByPermit={auditByPermit}
                                            onToggleExpand={togglePermitExpansion}
                                            onUpdateStatus={handleUpdateStatus}
                                            onSelect={handleSelectOne}
                                            onAction={handleAction}
                                            onCommentChange={(id, comment) => setCommentMap(s => ({ ...s, [id]: comment }))}
                                            isSelected={selectedPermitIds.includes(permit.id!)}
                                        />
                                    ))}
                                    {filteredPermits.filter(p => p.status === status).length === 0 && (
                                        <div className="kanban-empty-state">
                                            <p>No permits in this stage.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SortableContext>
                    ))}
                </div>
            </DndContext>

            {selectedPermitIds.length > 0 && (
                <div className="bulk-actions-toolbar">
                    <span>{selectedPermitIds.length} permit(s) selected</span>
                    <div className="action-row">
                        <button type="button" className="secondary-button" onClick={() => handleBulkAction('approve')}>Bulk Approve</button>
                        <button type="button" className="tertiary-button" onClick={() => handleBulkAction('reject')}>Bulk Reject</button>
                        <button type="button" className="danger-button" onClick={() => handleBulkAction('delete')}>Delete</button>
                    </div>
                </div>
            )}
        </section>
    )
}
