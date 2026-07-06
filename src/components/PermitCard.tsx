import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PermitRecord, AuditEntry } from '../types/permit'
import type { UserProfile } from '../context/AuthContext'

interface PermitCardProps {
    permit: PermitRecord
    expanded: boolean
    canMove: boolean
    workflow: string[]
    profile: UserProfile | null
    commentMap: Record<string, string>
    loadingAudit: Record<string, boolean>
    auditByPermit: Record<string, AuditEntry[]>
    onToggleExpand: (id: string) => void
    onUpdateStatus: (id: string, status: string) => void
    onSelect: (id: string, selected: boolean) => void
    onAction: (id: string, status: string) => void
    onCommentChange: (id: string, comment: string) => void
    isSelected: boolean
}

function formatDate(value: unknown) {
    if (!value) return 'Unknown'
    if (typeof value === 'string') return value
    if (typeof value === 'number') return new Date(value).toLocaleString()
    if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        return value.toDate().toLocaleString()
    }
    return String(value)
}

export function PermitCard({ permit, expanded, canMove, workflow, profile, commentMap, loadingAudit, auditByPermit, onToggleExpand, onUpdateStatus, onSelect, onAction, onCommentChange, isSelected }: PermitCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: permit.id! })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const statusClass = `status-${permit.status.toLowerCase().replace(/ /g, '-')}`

    return (
        <article ref={setNodeRef} style={style} {...attributes} {...listeners} className={`permit-item ${statusClass}`}>
            <div className="permit-item-selector">
                <input
                    type="checkbox"
                    aria-label={`Select permit ${permit.title}`}
                    checked={isSelected}
                    onChange={(e) => onSelect(permit.id!, e.target.checked)}
                />
            </div>
            <div className="permit-item-header">
                <div className="permit-item-title">
                    <h3>{permit.title}</h3>
                    <span className={`status-badge ${statusClass}`}>{permit.status}</span>
                </div>
                <div className="permit-item-meta">
                    <span>Type: <strong>{permit.permitType}</strong></span>
                    <span>Site: <strong>{permit.siteId}</strong></span>
                </div>
            </div>

            <div className="permit-item-body">
                <p className="permit-description">{permit.description}</p>
            </div>

            <div className="permit-item-footer">
                <button
                    type="button"
                    className="tertiary-button"
                    onClick={() => onToggleExpand(permit.id ?? '')}
                >
                    {expanded ? 'Hide Details' : 'Show Details'}
                </button>
                {workflow.length > 0 ? (
                    <select className="status-changer"
                        value={permit.status}
                        onChange={(event) => onUpdateStatus(permit.id ?? '', event.target.value)}
                        disabled={!canMove}
                    >
                        {workflow.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                ) : null}
            </div>

            {expanded ? (
                <div className="permit-details">
                    <div><strong>Created by:</strong> {permit.createdBy}</div>
                    <div><strong>Created:</strong> {formatDate(permit.createdAt)}</div>
                    <div><strong>Updated:</strong> {formatDate(permit.updatedAt)}</div>
                    {permit.customFields && Object.keys(permit.customFields).length > 0 ? (
                        <div className="permit-custom-fields">
                            <strong>Custom fields</strong>
                            <ul>
                                {Object.entries(permit.customFields).map(([key, value]) => (
                                    <li key={key}><strong>{key}:</strong> {value}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    <div className="approval-section">
                        <label className="field-label">Review comment</label>
                        <textarea
                            value={commentMap[permit.id ?? ''] ?? ''}
                            onChange={(e) => onCommentChange(permit.id ?? '', e.target.value)}
                            placeholder="Add a note for the approver"
                            rows={2}
                        />
                        <div className="approval-actions">
                            {profile && (Boolean(profile.role) || (permit.assignedTo ?? []).includes(profile.role)) ? (
                                <>
                                    <button type="button" className="secondary-button" onClick={() => onAction(permit.id ?? '', 'Pending Review')}>Request review</button>
                                    <button type="button" onClick={() => onAction(permit.id ?? '', 'Approved')}>Approve</button>
                                    <button type="button" className="tertiary-button" onClick={() => onAction(permit.id ?? '', 'Rejected')}>Reject</button>
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
}